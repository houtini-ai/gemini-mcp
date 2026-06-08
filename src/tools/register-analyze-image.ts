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
        'Default model: gemini-3-pro-preview. [MCP_RECOMMENDED_TIMEOUT_MS: 300000]',
      inputSchema: {
        images: z.array(imageInputSchema)
          .min(1)
          .describe('One or more images to analyze'),
        prompt: z.string()
          .describe('What to analyze or extract from the image(s)'),
        model: z.string()
          .optional()
          .describe(
            'Omit to use gemini-3-pro-preview. ' +
            'Other valid options: gemini-3.1-pro-preview, gemini-3-flash-preview. ' +
            'Do NOT pass gemini-1.5-* or gemini-pro-vision — those are out of support.'
          ),
        max_tokens: z.number()
          .int()
          .min(1)
          .max(65536)
          .optional()
          .default(16384)
          .describe(
            'Output token budget INCLUDING Gemini 3 thinking tokens. ' +
            'Leave unset — the default 16384 is fine for almost every analysis. ' +
            'Setting this below ~8000 risks an empty response when thinking is active.'
          ),
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
