import { TextContent, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from '../services/gemini/index.js';
import { McpError } from '../utils/error-handler.js';
import { extractThumbnail, generateVideoPlayerHTML, saveVideoPlayerHTML } from '../utils/video-utils.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

interface VideoResult {
  videoPath: string;
  mimeType: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  prompt: string;
  thumbnailPath?: string;
  htmlPlayerPath?: string;
  [key: string]: unknown;  // Allow additional properties for MCP SDK compatibility
}

interface GenerateVideoResult {
  content: (TextContent | ImageContent)[];
  metadata: VideoResult;
}

export class GenerateVideoTool {
  constructor(private geminiService: GeminiService) {}

  async execute(args: any): Promise<GenerateVideoResult> {
    try {
      logger.info('Starting video generation', {
        prompt: args.prompt.slice(0, 100),
        duration: args.durationSeconds || 8,
        resolution: args.resolution || '1080p'
      });

      const result = await this.geminiService.generateVideo({
        prompt: args.prompt,
        model: args.model,
        aspectRatio: args.aspectRatio,
        resolution: args.resolution,
        durationSeconds: args.durationSeconds,
        generateAudio: args.generateAudio,
        sampleCount: args.sampleCount,
        seed: args.seed,
        outputPath: args.outputPath,
        firstFrameImage: args.firstFrameImage,
        referenceImages: args.referenceImages
      });

      const responseContent: (TextContent | ImageContent)[] = [];

      // Generate summary report
      let report = '# Video Generation Complete\n\n';
      report += `**Prompt:** ${args.prompt}\n\n`;
      report += `**Video Details:**\n`;
      report += `- Duration: ${result.duration} seconds\n`;
      report += `- Resolution: ${result.resolution}\n`;
      report += `- Aspect Ratio: ${result.aspectRatio}\n`;
      report += `- Format: ${result.mimeType}\n`;
      report += `- Audio: ${args.generateAudio !== false ? 'Enabled' : 'Disabled'}\n`;
      if (args.firstFrameImage) {
        report += `- First Frame: Provided (image-to-video mode)\n`;
      }
      if (args.referenceImages?.length) {
        report += `- Reference Images: ${args.referenceImages.length} (${args.referenceImages.map((r: any) => r.referenceType).join(', ')})\n`;
      }
      report += `\n`;
      
      // Video file info
      const stats = await fs.stat(result.videoPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      report += `**Output:**\n`;
      report += `- Video: \`${result.videoPath}\` (${sizeInMB} MB)\n`;

      // Generate thumbnail if requested
      let thumbnailPath: string | undefined;
      if (args.generateThumbnail !== false) {
        try {
          thumbnailPath = await extractThumbnail({
            videoPath: result.videoPath,
            timeSeconds: 1
          });

          if (thumbnailPath) {
            report += `- Thumbnail: \`${thumbnailPath}\`\n`;
            result.thumbnailPath = thumbnailPath;

            // Include thumbnail as image content for Claude Desktop preview
            try {
              const thumbnailData = await fs.readFile(thumbnailPath);
              const base64Thumbnail = thumbnailData.toString('base64');
              
              responseContent.push({
                type: 'image',
                data: base64Thumbnail,
                mimeType: 'image/jpeg'
              });

              logger.info('Thumbnail included in response', { path: thumbnailPath });
            } catch (error) {
              logger.warn('Failed to include thumbnail in response', { error });
            }
          } else {
            report += `- Thumbnail: ⚠️ Not generated (ffmpeg not available)\n`;
            logger.warn('Thumbnail extraction skipped - ffmpeg not found');
          }
        } catch (error) {
          logger.warn('Thumbnail extraction failed', { error: (error as Error).message });
          report += `- Thumbnail: ⚠️ Generation failed\n`;
        }
      }

      // Generate HTML player if requested
      let htmlPlayerPath: string | undefined;
      let htmlPlayerContent: string | undefined;
      if (args.generateHTMLPlayer !== false) {
        try {
          const htmlContent = generateVideoPlayerHTML(
            result.videoPath,
            thumbnailPath,
            {
              prompt: args.prompt,
              duration: result.duration,
              resolution: result.resolution,
              aspectRatio: result.aspectRatio
            }
          );

          htmlPlayerPath = result.videoPath.replace(/\.(mp4|webm)$/, '.html');
          await saveVideoPlayerHTML(htmlContent, htmlPlayerPath);
          htmlPlayerContent = htmlContent; // Store for inline preview

          report += `- HTML Player: \`${htmlPlayerPath}\`\n`;
          report += `\n💡 **Tip:** Video player available in inline preview below.\n`;
          
          logger.info('HTML player generated', { path: htmlPlayerPath });
        } catch (error) {
          logger.warn('HTML player generation failed', { error: (error as Error).message });
          report += `- HTML Player: ⚠️ Generation failed\n`;
        }
      }

      report += `\n---\n\n`;
      report += `⏱️ **Processing Time:** Video generation took approximately 2-5 minutes\n`;
      report += `🎬 **Model:** Veo 3.1 (Google's latest video generation model)\n`;

      // Add text content first
      responseContent.unshift({
        type: 'text',
        text: report
      });

      logger.info('Video generation completed successfully', {
        videoPath: result.videoPath,
        size: sizeInMB + ' MB',
        hasThumbnail: !!thumbnailPath
      });

      const metadata: VideoResult = {
        videoPath: result.videoPath,
        mimeType: result.mimeType || 'video/mp4',
        duration: args.durationSeconds || 8,
        resolution: args.resolution || '1080p',
        aspectRatio: args.aspectRatio || '16:9',
        prompt: args.prompt,
        thumbnailPath,
        htmlPlayerPath,
        videoHtml: htmlPlayerContent // Include HTML for inline preview
      };

      return {
        content: responseContent,
        metadata
      };

    } catch (error) {
      logger.error('Video generation failed', { 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });

      if (error instanceof McpError) {
        throw error;
      }

      const errorMessage = (error as Error).message || 'Unknown error';
      
      throw new McpError(
        `Video generation failed: ${errorMessage}\n\n` +
        `This could be due to:\n` +
        `1. API quota or rate limits exceeded\n` +
        `2. Invalid prompt or parameters\n` +
        `3. Network connectivity issues\n` +
        `4. Model unavailable or overloaded\n\n` +
        `Please try:\n` +
        `- Simplifying your prompt\n` +
        `- Reducing resolution or duration\n` +
        `- Waiting a few moments before retrying\n` +
        `- Checking your API quota at https://aistudio.google.com/`,
        'VIDEO_GENERATION_FAILED'
      );
    }
  }
}
