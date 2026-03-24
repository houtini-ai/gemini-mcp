import * as z from 'zod';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { resolve } from 'path';
import logger from '../utils/logger.js';
import { McpError, createToolResult } from '../utils/error-handler.js';
import { processGeneratedImage, type ProcessedImage } from '../utils/image-utils.js';
import { resolveImageInputs } from '../utils/resolve-images.js';
import { savedFileMessage } from '../utils/tool-wrapper.js';
import { imageInputSchema } from './schemas.js';
import type { ToolContext } from './types.js';

/**
 * Build the MCP content array for an image tool result.
 *
 * Pattern: resize-for-transport
 *  - Full-res original is saved to disk (and served via media server for the viewer).
 *  - A resized JPEG preview (≤800px) is returned as an inline `image` content block
 *    so the model can "see" the image and the client can display it.
 *  - The text block contains the file path + metadata so the user can find the original.
 *
 * This keeps the total tool result well under the 1MB MCP transport cap.
 */
function buildContent(
  processed: ProcessedImage | undefined,
  description: string | undefined,
  prompt: string,
  groundingSources?: Array<{ title: string; url: string }>,
  thoughtSignature?: string
) {
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
  > = [];

  // 1. Inline resized preview — lets the model and client see the image
  if (processed) {
    content.push({
      type: 'image',
      data: processed.previewBase64,
      mimeType: processed.previewMimeType,
    });
  }

  // 2. Text metadata
  const lines: string[] = [];
  if (processed?.savedPath) lines.push(savedFileMessage('Image saved (full-res)', processed.savedPath));
  if (processed?.previewPath) lines.push(savedFileMessage('HTML preview', processed.previewPath));
  if (processed) {
    lines.push(`Preview: ${processed.previewWidth}x${processed.previewHeight}px JPEG (${Math.round(processed.previewBase64.length * 0.75 / 1024)}KB)`);
  }
  if (description) lines.push(`\n${description}`);

  if (groundingSources && groundingSources.length > 0) {
    lines.push('\n**Sources used for grounding:**');
    groundingSources.forEach((source, idx) => {
      lines.push(`${idx + 1}. [${source.title}](${source.url})`);
    });
  }

  if (thoughtSignature) {
    lines.push(`\n**thoughtSignature** (for conversational editing — pass to edit_image): \`${thoughtSignature}\``);
  }

  content.push({
    type: 'text',
    text: lines.join('\n') || 'Image generated successfully',
  });

  return content;
}

/**
 * Build lightweight structuredContent for the App viewer.
 * Contains ZERO base64 data — viewer loads the image via media server URL.
 */
function buildStructuredContent(
  ctx: ToolContext,
  processed: ProcessedImage | undefined,
  description: string | undefined,
  prompt: string,
  groundingSources?: Array<{ title: string; url: string }>
) {
  const imageUrl = processed?.savedPath
    ? ctx.mediaServer.getFileUrl(processed.savedPath)
    : undefined;

  if (processed?.savedPath && !imageUrl) {
    logger.warn('Media server URL unavailable — image saved outside allowed directory', {
      savedPath: processed.savedPath,
      allowedDir: ctx.outputDir,
    });
  }

  return {
    imageUrl: imageUrl ?? undefined,
    mimeType: 'image/jpeg',
    savedPath: processed?.savedPath,
    previewPath: processed?.previewPath,
    description,
    prompt,
    groundingSources,
  };
}

export function register(ctx: ToolContext): void {
  registerAppTool(
    ctx.server,
    'generate_image',
    {
      title: 'Generate Image with Gemini',
      description:
        'Generate an image using Google Gemini image models (Nano Banana Pro). ' +
        'Returns image with inline preview in Claude Desktop and saves full-resolution to disk. ' +
        'Default model: gemini-3-pro-image-preview.',
      inputSchema: {
        prompt: z.string().describe('Description of the image to generate'),
        model: z.string()
          .optional()
          .describe('Gemini image model to use (default: gemini-3-pro-image-preview). ' +
            'Options: gemini-3-pro-image-preview, gemini-2.5-flash-image, nano-banana-pro-preview'),
        aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9'])
          .optional()
          .default('1:1')
          .describe('Aspect ratio of the generated image'),
        imageSize: z.enum(['1K', '2K', '4K'])
          .optional()
          .describe('Resolution of the generated image (only for image-specific models)'),
        images: z.array(imageInputSchema)
          .optional()
          .describe('Optional reference images to guide generation'),
        use_search: z.boolean()
          .optional()
          .default(false)
          .describe(
            'Enable Google Search grounding for data-driven image generation. ' +
            'Use for: weather forecasts, current events, stock prices, sports scores, statistics. ' +
            'The model will search the web for real-time data to inform image generation.'
          ),
        global_media_resolution: z.enum([
          'MEDIA_RESOLUTION_LOW',
          'MEDIA_RESOLUTION_MEDIUM',
          'MEDIA_RESOLUTION_HIGH'
        ])
          .optional()
          .describe(
            'Global image quality setting for cost optimization (default: HIGH). ' +
            'LOW (280 tokens, 75% savings) - Simple tasks, bulk operations. ' +
            'MEDIUM (560 tokens, 50% savings) - PDFs/documents (OCR saturates at medium). ' +
            'HIGH (1120 tokens) - Best quality, detailed analysis. ' +
            'Can be overridden per-image using mediaResolution in images array.'
          ),
        outputPath: z.string()
          .optional()
          .describe('Optional file path to save the generated image (e.g., ./output/image.png)'),
      },
      _meta: {
        ui: { resourceUri: 'ui://gemini/image-viewer.html' }
      }
    },
    async ({ prompt, model, aspectRatio, imageSize, images, use_search, global_media_resolution, outputPath }) => {
      try {
        logger.info('Executing generate_image tool', {
          model,
          promptLength: prompt.length,
          useSearch: use_search,
          globalMediaResolution: global_media_resolution
        });

        const resolvedImages = images ? await resolveImageInputs(images as any) : undefined;

        const result = await ctx.imageService.generateImage({
          prompt,
          model,
          aspectRatio,
          imageSize,
          images: resolvedImages as any,
          useSearch: use_search,
          globalMediaResolution: global_media_resolution as any
        });

        const firstImage = result.parts.find(p => p.type === 'image' && p.base64Data);

        const resolvedSavePath = outputPath
          ? resolve(outputPath)
          : resolve(ctx.outputDir, `gemini-${Date.now()}.png`);

        let processed: ProcessedImage | undefined;

        if (firstImage?.base64Data) {
          processed = await processGeneratedImage(
            firstImage.base64Data,
            firstImage.mimeType || 'image/png',
            resolvedSavePath,
            prompt,
            result.description
          );
        }

        // thoughtSignature is intentionally excluded from the tool result.
        // It can be 500KB+ and would blow the 1MB MCP transport cap.
        // For conversational editing, the user should use edit_image and pass
        // the thoughtSignature from the saved file metadata if needed.
        const droppedSig = result.parts.find(p => !!p.thoughtSignature)?.thoughtSignature;
        if (droppedSig) {
          logger.info('Dropping thoughtSignature from tool result', {
            signatureKB: Math.round(droppedSig.length / 1024)
          });
        }

        return {
          structuredContent: buildStructuredContent(ctx, processed, result.description, prompt, result.groundingSources),
          content: buildContent(processed, result.description, prompt, result.groundingSources, undefined),
        };
      } catch (error) {
        logger.error('generate_image tool failed', { error });
        const msg = error instanceof McpError
          ? error.message
          : `Failed to generate image: ${(error as Error).message}`;
        return { content: createToolResult(false, msg, error as Error) };
      }
    }
  );

  registerAppTool(
    ctx.server,
    'edit_image',
    {
      title: 'Edit Image with Gemini',
      description:
        'Edit one or more images using Google Gemini image models (Nano Banana Pro). ' +
        'Provide images and natural-language instructions for how to modify them. ' +
        'Returns edited image with inline preview and saves full-resolution to disk.',
      inputSchema: {
        prompt: z.string().describe('Instructions for how to edit the image(s)'),
        images: z.array(imageInputSchema)
          .min(1)
          .describe('One or more images to edit'),
        model: z.string()
          .optional()
          .describe('Gemini image model to use (default: gemini-3-pro-image-preview)'),
        use_search: z.boolean()
          .optional()
          .default(false)
          .describe('Enable Google Search grounding for data-driven editing'),
        global_media_resolution: z.enum([
          'MEDIA_RESOLUTION_LOW',
          'MEDIA_RESOLUTION_MEDIUM',
          'MEDIA_RESOLUTION_HIGH'
        ])
          .optional()
          .describe('Global image quality setting (default: HIGH). See generate_image for details.'),
        outputPath: z.string()
          .optional()
          .describe('Optional file path to save the edited image (e.g., ./output/edited.png)'),
      },
      _meta: {
        ui: { resourceUri: 'ui://gemini/image-viewer.html' }
      }
    },
    async ({ prompt, images, model, use_search, global_media_resolution, outputPath }) => {
      try {
        logger.info('Executing edit_image tool', {
          model,
          imageCount: images.length,
          useSearch: use_search,
          globalMediaResolution: global_media_resolution
        });

        const resolvedImages = await resolveImageInputs(images as any);

        const result = await ctx.imageService.generateImage({
          prompt,
          model,
          images: resolvedImages as any,
          useSearch: use_search,
          globalMediaResolution: global_media_resolution as any
        });

        const firstImage = result.parts.find(p => p.type === 'image' && p.base64Data);

        const resolvedSavePath = outputPath
          ? resolve(outputPath)
          : resolve(ctx.outputDir, `gemini-edit-${Date.now()}.png`);

        let processed: ProcessedImage | undefined;

        if (firstImage?.base64Data) {
          processed = await processGeneratedImage(
            firstImage.base64Data,
            firstImage.mimeType || 'image/png',
            resolvedSavePath,
            `[EDIT] ${prompt}`,
            result.description
          );
        }

        const editPrompt = `[EDIT] ${prompt}`;

        return {
          structuredContent: buildStructuredContent(ctx, processed, result.description, editPrompt, result.groundingSources),
          content: buildContent(processed, result.description, editPrompt, result.groundingSources, undefined),
        };
      } catch (error) {
        logger.error('edit_image tool failed', { error });
        const msg = error instanceof McpError
          ? error.message
          : `Failed to edit image: ${(error as Error).message}`;
        return { content: createToolResult(false, msg, error as Error) };
      }
    }
  );
}
