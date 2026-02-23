import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppResource,
  RESOURCE_MIME_TYPE
} from '@modelcontextprotocol/ext-apps/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import logger from '../utils/logger.js';

interface ViewerSpec {
  name: string;
  resourceId: string;
  uri: string;
  /** Path segments relative to the dist directory (e.g. ['image-viewer','src','ui','image-viewer.html']) */
  segments: string[];
  /** Whether this viewer needs media server access (CSP whitelisting) */
  needsMediaServer?: boolean;
}

const VIEWERS: ViewerSpec[] = [
  {
    name: 'Image Viewer',
    resourceId: 'gemini-image-viewer',
    uri: 'ui://gemini/image-viewer.html',
    segments: ['image-viewer', 'src', 'ui', 'image-viewer.html'],
  },
  {
    name: 'Video Viewer',
    resourceId: 'gemini-video-viewer',
    uri: 'ui://gemini/video-viewer.html',
    segments: ['video-viewer', 'src', 'ui', 'video-viewer.html'],
    needsMediaServer: true,
  },
  {
    name: 'SVG Viewer',
    resourceId: 'gemini-svg-viewer',
    uri: 'ui://gemini/svg-viewer.html',
    segments: ['svg-viewer', 'src', 'ui', 'svg-viewer.html'],
  },
  {
    name: 'Landing Page Viewer',
    resourceId: 'gemini-landing-page-viewer',
    uri: 'ui://gemini/landing-page-viewer.html',
    segments: ['landing-page-viewer', 'src', 'ui', 'landing-page-viewer.html'],
  },
];

/**
 * Register all MCP App viewer resources from a data-driven spec.
 * When a mediaServerPort is provided, viewers that need it get CSP whitelisting
 * to load media from the localhost server.
 */
export async function registerViewers(
  server: McpServer,
  distDir: string,
  mediaServerPort?: number,
): Promise<void> {
  const mediaOrigin = mediaServerPort
    ? `http://127.0.0.1:${mediaServerPort}`
    : undefined;

  const results = await Promise.allSettled(
    VIEWERS.map(async (v) => {
      const htmlPath = join(distDir, ...v.segments);
      const html = await readFile(htmlPath, 'utf-8');

      // Build CSP metadata for viewers that need media server access
      const needsCsp = v.needsMediaServer && mediaOrigin;
      const contentMeta = needsCsp
        ? {
            _meta: {
              ui: {
                csp: {
                  resourceDomains: [mediaOrigin],
                  connectDomains: [mediaOrigin],
                },
              },
            },
          }
        : {};

      registerAppResource(server, v.resourceId, v.uri, {}, async () => ({
        contents: [{
          uri: v.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          ...contentMeta,
        }],
      }));

      return v.name;
    })
  );

  const succeeded = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value);

  const failed = results
    .map((r, i) => ({ result: r, spec: VIEWERS[i] }))
    .filter((x) => x.result.status === 'rejected') as Array<{
    result: PromiseRejectedResult;
    spec: ViewerSpec;
  }>;

  logger.info('Viewer registration complete', {
    succeeded: succeeded.length,
    failed: failed.length,
    available: succeeded,
    mediaServerCsp: mediaOrigin || 'none',
  });

  if (failed.length > 0) {
    for (const { spec, result } of failed) {
      logger.warn(`Failed to load ${spec.name} viewer - inline preview will not be available`, {
        viewer: spec.name,
        error: result.reason,
      });
    }
  }
}
