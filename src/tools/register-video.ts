import * as z from 'zod';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import logger from '../utils/logger.js';
import { toolError } from '../utils/tool-wrapper.js';
import { GenerateVideoTool } from './generate-video.js';
import { imageInputSchema } from './schemas.js';
import { resolveImageInputs, resolveImageInput } from '../utils/resolve-images.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  registerAppTool(
    ctx.server,
    'generate_video',
    {
      title: 'Generate Video',
      description:
        'Generate videos using Google Veo 3.1 AI model. Creates realistic 4-8 second videos from text prompts ' +
        'with optional first-frame image and reference images for character/style consistency. ' +
        'Supports native audio generation. Processing time: 2-5 minutes for 1080p videos. ' +
        'Returns video file path with optional thumbnail and HTML preview player. ' +
        '\u26a0\ufe0f IMPORTANT: Video generation is ASYNC and takes 2-5 minutes. The tool will poll for completion automatically.',
      inputSchema: {
        prompt: z.string().describe(
          'Detailed description of the video to generate. Be specific about actions, camera movements, lighting, and style. ' +
          'Example: "A close-up shot of a futuristic coffee machine brewing a glowing blue espresso, with steam rising dramatically. Cinematic lighting, 4K quality."'
        ),
        model: z.string().optional().default('veo-3.1-generate-preview')
          .describe('Video generation model (default: veo-3.1-generate-preview)'),
        aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9')
          .describe('Video aspect ratio: 16:9 (landscape) or 9:16 (portrait/vertical)'),
        resolution: z.enum(['720p', '1080p', '4k']).optional().default('1080p')
          .describe('Video resolution. Higher resolutions take longer to generate and result in larger files.'),
        durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).optional().default(8)
          .describe('Video duration in seconds (4, 6, or 8 seconds)'),
        generateAudio: z.boolean().optional().default(true)
          .describe('Generate native synchronized audio effects and dialogue based on the prompt'),
        sampleCount: z.number().min(1).max(4).optional().default(1)
          .describe('Number of video samples to generate (1-4). Each sample is a separate generation.'),
        seed: z.number().optional()
          .describe('Optional seed for deterministic output. Use the same seed with the same prompt for consistent results.'),
        outputPath: z.string().optional()
          .describe('Optional custom output path for the video file (e.g., C:/videos/output.mp4). If not provided, saves to default output directory with timestamped filename.'),
        generateThumbnail: z.boolean().optional().default(true)
          .describe('Extract thumbnail from video (requires ffmpeg installed). Thumbnail is saved alongside video.'),
        generateHTMLPlayer: z.boolean().optional().default(true)
          .describe('Generate interactive HTML video player with preview and download options'),
        firstFrameImage: imageInputSchema
          .optional()
          .describe(
            'Starting frame image for image-to-video generation. Provide via filePath (local file) or data+mimeType (base64). ' +
            'The video will animate from this image. Supports JPEG, PNG, WebP.'
          ),
        referenceImages: z.array(z.object({
          referenceType: z.enum(['asset', 'style']).describe(
            'Type of reference: "asset" for character/object consistency, "style" for visual style transfer'
          ),
          image: imageInputSchema.describe('The reference image (filePath or base64 data)')
        }))
          .max(3)
          .optional()
          .describe(
            'Up to 3 reference images for character/style consistency. Each needs a referenceType ("asset" or "style") and an image.'
          )
      },
      _meta: {
        ui: { resourceUri: 'ui://gemini/video-viewer.html' }
      }
    },
    async ({ prompt, model, aspectRatio, resolution, durationSeconds, generateAudio, sampleCount, seed, outputPath, generateThumbnail, generateHTMLPlayer, firstFrameImage, referenceImages }) => {
      try {
        logger.info('Executing generate_video tool', {
          prompt: prompt.slice(0, 100),
          duration: durationSeconds || 8,
          resolution: resolution || '1080p',
          hasFirstFrame: !!firstFrameImage,
          referenceImageCount: referenceImages?.length || 0
        });

        // Resolve first-frame image from filePath if provided
        let resolvedFirstFrame: { data: string; mimeType: string } | undefined;
        if (firstFrameImage) {
          const resolved = await resolveImageInput(firstFrameImage as any);
          resolvedFirstFrame = { data: resolved.data, mimeType: resolved.mimeType };
        }

        // Resolve reference images from filePaths if provided
        let resolvedReferenceImages: Array<{ referenceType: 'asset' | 'style'; image: { data: string; mimeType: string } }> | undefined;
        if (referenceImages?.length) {
          resolvedReferenceImages = await Promise.all(
            (referenceImages as any[]).map(async (ref: any) => {
              const resolved = await resolveImageInput(ref.image);
              return {
                referenceType: ref.referenceType as 'asset' | 'style',
                image: { data: resolved.data, mimeType: resolved.mimeType }
              };
            })
          );
        }

        const videoTool = new GenerateVideoTool(ctx.geminiService);
        const { content, metadata } = await videoTool.execute({
          prompt,
          model,
          aspectRatio,
          resolution,
          durationSeconds,
          generateAudio,
          sampleCount,
          seed,
          outputPath,
          generateThumbnail,
          generateHTMLPlayer,
          firstFrameImage: resolvedFirstFrame,
          referenceImages: resolvedReferenceImages
        });

        // Enrich with media server URLs for inline playback in the viewer
        const enriched = { ...metadata } as Record<string, unknown>;
        if (metadata.videoPath) {
          const videoUrl = ctx.mediaServer.getFileUrl(metadata.videoPath as string);
          if (videoUrl) enriched.videoUrl = videoUrl;
        }
        if (metadata.thumbnailPath) {
          const thumbUrl = ctx.mediaServer.getFileUrl(metadata.thumbnailPath as string);
          if (thumbUrl) enriched.thumbnailUrl = thumbUrl;
        }

        return {
          content,
          structuredContent: enriched
        };
      } catch (error) {
        return toolError('generate_video', error);
      }
    }
  );
}
