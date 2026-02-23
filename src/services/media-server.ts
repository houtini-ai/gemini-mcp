import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'http';
import { stat, createReadStream } from 'fs';
import { resolve, normalize, extname } from 'path';
import { randomBytes } from 'crypto';
import logger from '../utils/logger.js';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

/**
 * Lightweight localhost-only HTTP server for serving generated media files
 * to the MCP App viewer iframes (which cannot access file:// URIs).
 *
 * Security:
 *  - Binds to 127.0.0.1 only (no external access)
 *  - Random URL token required in path
 *  - Path traversal protection (all paths resolved against allowed directory)
 *  - Supports HTTP Range requests for video seeking
 */
export class MediaServer {
  private server: Server | null = null;
  private port = 0;
  private token: string;
  private allowedDir: string;

  constructor(allowedDir: string) {
    this.allowedDir = resolve(allowedDir);
    this.token = randomBytes(16).toString('hex');
  }

  async start(): Promise<void> {
    return new Promise((ok, fail) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (err) => {
        logger.error('Media server error', { error: err });
        fail(err);
      });

      // Bind to 127.0.0.1 with OS-assigned port
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        }
        logger.info('Media server started', {
          port: this.port,
          baseUrl: this.getBaseUrl(),
        });
        ok();
      });
    });
  }

  getPort(): number {
    return this.port;
  }

  getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}/${this.token}`;
  }

  /**
   * Convert an absolute file path to a media server URL.
   * Returns null if the path is outside the allowed directory.
   */
  getFileUrl(absPath: string): string | null {
    const resolved = resolve(absPath);
    const normalAllowed = normalize(this.allowedDir);
    const normalResolved = normalize(resolved);

    // Ensure the file is within the allowed directory
    if (!normalResolved.startsWith(normalAllowed)) {
      logger.warn('Media server: path outside allowed directory', {
        path: absPath,
        allowedDir: this.allowedDir,
      });
      return null;
    }

    // Build relative path portion (use forward slashes for URL)
    const relative = normalResolved
      .slice(normalAllowed.length)
      .replace(/\\/g, '/');

    return `${this.getBaseUrl()}${relative}`;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      logger.info('Media server stopped');
    }
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // CORS headers (safe since localhost-only)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const pathname = decodeURIComponent(url.pathname);

    // Validate token
    const expectedPrefix = `/${this.token}`;
    if (!pathname.startsWith(expectedPrefix)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // Extract the file path after the token
    const relativePath = pathname.slice(expectedPrefix.length) || '/';
    if (relativePath === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Gemini MCP Media Server');
      return;
    }

    // Resolve to absolute path within allowed directory
    const filePath = resolve(this.allowedDir, '.' + relativePath);
    const normalAllowed = normalize(this.allowedDir);
    const normalFile = normalize(filePath);

    // Path traversal protection
    if (!normalFile.startsWith(normalAllowed)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // Get file stats and serve
    stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileSize = stats.size;

      res.setHeader('Accept-Ranges', 'bytes');

      // Handle Range requests (essential for video seeking)
      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
        if (!match) {
          res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`,
            'Content-Type': 'text/plain',
          });
          res.end('Range Not Satisfiable');
          return;
        }

        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`,
            'Content-Type': 'text/plain',
          });
          res.end('Range Not Satisfiable');
          return;
        }

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': end - start + 1,
          'Content-Type': contentType,
        });

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        });

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        createReadStream(filePath).pipe(res);
      }
    });
  }
}
