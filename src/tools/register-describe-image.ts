import * as z from 'zod';
import logger from '../utils/logger.js';
import { createToolResult } from '../utils/error-handler.js';
import { toolError } from '../utils/tool-wrapper.js';
import { resolveImageInputs } from '../utils/resolve-images.js';
import { imageInputSchema } from './schemas.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
    'describe_image',
    {
      title: 'Describe Image (Nano Banana Pro)',
      description:
        'Analyze and describe one or more images using Google Gemini image models (Nano Banana Pro). ' +
        'Returns a text description — no image is generated. Default model: gemini-3-flash-preview.',
      inputSchema: {
        images: z.array(imageInputSchema)
          .min(1)
          .describe('One or more images to describe/analyze'),
        prompt: z.string()
          .optional()
          .describe('Optional custom analysis prompt (default: general description)'),
        model: z.string()
          .optional()
          .describe('Gemini image model to use (default: gemini-3-flash-preview)'),
        global_media_resolution: z.enum([
          'MEDIA_RESOLUTION_LOW',
          'MEDIA_RESOLUTION_MEDIUM',
          'MEDIA_RESOLUTION_HIGH'
        ])
          .optional()
          .describe('Global image quality for cost optimization. MEDIUM recommended for PDFs (50% savings).'),
      },
      outputSchema: {
        content: z.string(),
        success: z.boolean(),
      },
    },
    async ({ images, prompt, model, global_media_resolution }) => {
      try {
        logger.info('Executing describe_image tool', {
          model,
          imageCount: images.length,
          globalMediaResolution: global_media_resolution
        });

        // Resolve filePath references server-side (bypasses MCP transport)
        const resolved = await resolveImageInputs(images as any);

        const description = await ctx.imageService.describeImage({
          images: resolved as any,
          prompt,
          model,
          globalMediaResolution: global_media_resolution as any
        });

        return {
          content: createToolResult(true, description),
          structuredContent: { content: description, success: true },
        };
      } catch (error) {
        return toolError('describe_image', error);
      }
    }
  );
}
