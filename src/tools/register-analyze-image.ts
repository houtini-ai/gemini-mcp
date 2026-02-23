import * as z from 'zod';
import logger from '../utils/logger.js';
import { createToolResult } from '../utils/error-handler.js';
import { toolError } from '../utils/tool-wrapper.js';
import { resolveImageInputs } from '../utils/resolve-images.js';
import { imageInputSchema } from './schemas.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
    'analyze_image',
    {
      title: 'Analyze Image',
      description:
        'Analyze and extract information from one or more images using Gemini multimodal understanding. ' +
        'Returns a text analysis — no image is generated. ' +
        'Default model: gemini-3-pro-preview.',
      inputSchema: {
        images: z.array(imageInputSchema)
          .min(1)
          .describe('One or more images to analyze'),
        prompt: z.string()
          .describe('What to analyze or extract from the image(s)'),
        model: z.string()
          .optional()
          .describe('Model to use (default: gemini-3-pro-preview)'),
        max_tokens: z.number()
          .int()
          .min(1)
          .max(65536)
          .optional()
          .default(16384)
          .describe('Maximum tokens in response (default 16384, up to 64K output limit)'),
        global_media_resolution: z.enum([
          'MEDIA_RESOLUTION_LOW',
          'MEDIA_RESOLUTION_MEDIUM',
          'MEDIA_RESOLUTION_HIGH'
        ])
          .optional()
          .describe('Global image quality for cost optimization. MEDIUM recommended for PDFs (50% savings).')
      },
      outputSchema: {
        content: z.string(),
        success: z.boolean()
      }
    },
    async ({ images, prompt, model, max_tokens, global_media_resolution }) => {
      try {
        logger.info('Executing analyze_image tool', {
          model,
          imageCount: images.length,
          globalMediaResolution: global_media_resolution
        });

        // Resolve filePath references server-side (bypasses MCP transport)
        const resolved = await resolveImageInputs(images as any);

        const result = await ctx.geminiService.analyzeImages({
          images: resolved as any,
          prompt,
          model: model || 'gemini-3-pro-preview',
          maxTokens: max_tokens,
          globalMediaResolution: global_media_resolution
        });

        return {
          content: createToolResult(true, result),
          structuredContent: { content: result, success: true }
        };
      } catch (error) {
        return toolError('analyze_image', error);
      }
    }
  );
}
