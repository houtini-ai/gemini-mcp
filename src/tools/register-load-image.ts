import * as z from 'zod';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import logger from '../utils/logger.js';
import { createToolResult } from '../utils/error-handler.js';
import { toolError } from '../utils/tool-wrapper.js';
import type { ToolContext } from './types.js';

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
    'load_image_from_path',
    {
      title: 'Load Image from File Path',
      description:
        'Read a local image file and return it as base64-encoded data ready to pass to ' +
        'generate_image, edit_image, describe_image, or analyze_image tools. ' +
        'Supports JPEG, PNG, GIF, WebP, BMP.',
      inputSchema: {
        filePath: z.string().describe('Absolute or relative path to the image file'),
      },
      outputSchema: {
        content: z.string(),
        success: z.boolean(),
      },
    },
    async ({ filePath }) => {
      try {
        logger.info('Executing load_image_from_path tool', { filePath });

        const absolutePath = resolve(filePath);
        const ext = absolutePath.toLowerCase().match(/\.[a-z]+$/)?.[0];

        if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
          throw new Error(
            `Unsupported image format: ${ext || 'unknown'}. ` +
            `Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`
          );
        }

        const stats = await stat(absolutePath);
        const sizeBytes = stats.size;

        // Get media server URL for preview display (bypasses MCP transport)
        const imageUrl = ctx.mediaServer.getFileUrl(absolutePath);

        const summary = JSON.stringify({
          filePath: absolutePath,
          mimeType: MIME_MAP[ext] || 'application/octet-stream',
          sizeBytes,
          sizeKB: Math.round(sizeBytes / 1024),
          imageUrl,
          note: 'Pass filePath to edit_image, describe_image, or analyze_image. ' +
                'Images are loaded server-side, bypassing MCP transport limits.',
        });

        logger.info('Image loaded via media server', {
          filePath: absolutePath,
          sizeKB: Math.round(sizeBytes / 1024),
          hasUrl: !!imageUrl,
        });

        return {
          content: createToolResult(true, summary),
          structuredContent: { content: summary, success: true },
        };
      } catch (error) {
        return toolError('load_image_from_path', error);
      }
    }
  );
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};
