import * as winston from 'winston';
import { config } from '../config/index.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Determine if we should use file logging
// Only enable file logging if explicitly requested via environment variable
const shouldUseFileLogging = process.env.GEMINI_MCP_LOG_FILE === 'true';

const transports: winston.transport[] = [];

// File logging (optional, disabled by default for MCP stdio servers)
if (shouldUseFileLogging) {
  // Use user home directory for cross-platform compatibility
  // ~/.gemini-mcp/logs/ on Unix-like systems
  // C:\Users\username\.gemini-mcp\logs\ on Windows
  const logDir = path.join(os.homedir(), '.gemini-mcp', 'logs');
  
  try {
    // Ensure log directory exists
    fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
    
    transports.push(
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  } catch {
    // Fallback to console only if directory creation fails
    process.stderr.write(`Warning: Could not create log directory at ${logDir}. File logging disabled.\n`);
  }
}

// Console logging (stderr to avoid polluting stdout for MCP)
// Only add if in development mode or DEBUG_MCP is enabled
if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MCP === 'true') {
  transports.push(
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'], // All levels to stderr
    })
  );
}

// Fallback: If no transports configured, add a minimal Console transport to stderr
// This ensures errors are visible even when file logging fails
if (transports.length === 0) {
  transports.push(
    new winston.transports.Console({
      level: 'error',
      stderrLevels: ['error', 'warn', 'info', 'debug'],
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level}]: ${message}${metaStr}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports
});

/**
 * Log a fatal error, let the transports drain, then exit.
 *
 * winston's File transports write asynchronously. Calling process.exit()
 * directly after logger.error() tears the process down while those streams are
 * still closing, which on Windows trips a libuv assertion
 * (`!(handle->flags & UV_HANDLE_CLOSING)`) and exits 0xC0000409. The effect is
 * that a recoverable, well-diagnosed problem - a bad GEMINI_API_KEY - reaches
 * the user as a native crash dump instead of the message we just logged.
 *
 * The timeout is a backstop: a wedged transport must not hang startup.
 */
export function exitAfterFlush(code: number): void {
  process.exitCode = code;

  // Flush the file transports. Their writes are async; process.exit() straight
  // after logger.error() would tear the process down mid-write.
  logger.end();

  // Release anything still holding the event loop open. At startup-failure time
  // that is the in-flight HTTPS request to the Gemini API (Socket / TLSSocket,
  // kept alive by undici's connection pool) plus the pending log writes.
  //
  // We deliberately do NOT call process.exit() here. Forcing exit while those
  // handles are mid-close trips a libuv assertion on Windows
  // (`!(handle->flags & UV_HANDLE_CLOSING)`, exit 0xC0000409), which turned a
  // clean, well-diagnosed "bad GEMINI_API_KEY" into a native crash dump - the
  // one failure every new user is most likely to hit. Destroying the sockets
  // lets the loop drain and Node exit on its own with the code set above.
  for (const handle of ((process as never as { _getActiveHandles?: () => unknown[] })._getActiveHandles?.() ?? [])) {
    const h = handle as { destroy?: () => void; unref?: () => void };
    // Leave stdio alone - destroying it would cut off the error we just wrote.
    if (h === process.stdout || h === process.stderr || h === process.stdin) continue;
    try {
      h.destroy?.();
      h.unref?.();
    } catch {
      // A handle that refuses to close must not mask the original failure.
    }
  }
}

export default logger;
