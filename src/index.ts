#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE
} from '@modelcontextprotocol/ext-apps/server';
import * as z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname, resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';

import { config, validateConfig } from './config/index.js';
import { GeminiService } from './services/gemini/index.js';
import { GeminiImageService } from './services/gemini/image-service.js';
import { GeminiDeepResearchTool } from './tools/gemini-deep-research.js';
import { GenerateLandingPageTool } from './tools/generate-landing-page.js';
import { GenerateSVGTool } from './tools/generate-svg.js';
import { GenerateVideoTool } from './tools/generate-video.js';
import { loadImageFromPath } from './tools/load-image-from-path.js';
import { handlePromptAssistant } from './tools/gemini-prompt-assistant.js';
import logger from './utils/logger.js';
import { McpError, createToolResult } from './utils/error-handler.js';
import { compressForInline, compressForViewer } from './utils/image-compress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default output directory for generated images (relative to package root)
const DEFAULT_IMAGE_OUTPUT_DIR = resolve(__dirname, '..', 'output');

async function saveImageToFile(base64Data: string, outputPath: string): Promise<string> {
  const absolutePath = resolve(outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(base64Data, 'base64'));
  return absolutePath;
}

async function createImagePreviewHtml(
  imagePath: string, 
  prompt: string, 
  description?: string
): Promise<string> {
  const htmlPath = imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.html');
  const imageFilename = imagePath.split(/[/\\]/).pop() || 'image';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Image: ${imageFilename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 1200px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 40px;
    }
    .image-container {
      text-align: center;
      margin-bottom: 30px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }
    .image-container img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .metadata {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .metadata h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
    }
    .metadata-item {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e0e0e0;
    }
    .metadata-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .metadata-label {
      font-weight: 600;
      color: #667eea;
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metadata-value {
      color: #555;
      line-height: 1.6;
    }
    .prompt-box {
      background: #fff;
      border: 2px solid #667eea;
      border-radius: 6px;
      padding: 15px;
      margin-top: 10px;
      position: relative;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
    }
    .copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #667eea;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.3s;
    }
    .copy-btn:hover {
      background: #5568d3;
    }
    .copy-btn:active {
      background: #4a5bc4;
    }
    .copy-btn.copied {
      background: #10b981;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Gemini Generated Image</h1>
      <p>Created with Google Gemini AI (Nano Banana Pro)</p>
    </div>
    
    <div class="content">
      <div class="image-container">
        <img src="${imageFilename}" alt="Generated image">
      </div>
      
      <div class="metadata">
        <h2>Generation Details</h2>
        
        <div class="metadata-item">
          <span class="metadata-label">Prompt</span>
          <div class="prompt-box" id="promptBox">
            <button class="copy-btn" onclick="copyPrompt()">Copy</button>
            ${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
        </div>
        
        ${description ? `
        <div class="metadata-item">
          <span class="metadata-label">AI Description</span>
          <div class="metadata-value">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        ` : ''}
        
        <div class="metadata-item">
          <span class="metadata-label">Generated</span>
          <div class="metadata-value">${new Date().toLocaleString()}</div>
        </div>
        
        <div class="metadata-item">
          <span class="metadata-label">File</span>
          <div class="metadata-value">${imageFilename}</div>
        </div>
      </div>
      
      <div class="actions">
        <a href="${imageFilename}" download class="btn">Download Image</a>
      </div>
    </div>
    
    <div class="footer">
      Generated by Gemini MCP Server &middot; @houtini/gemini-mcp
    </div>
  </div>
  
  <script>
    function copyPrompt() {
      const promptText = document.getElementById('promptBox').innerText.replace('Copy', '').trim();
      navigator.clipboard.writeText(promptText).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>`;

  await writeFile(htmlPath, html, 'utf-8');
  return htmlPath;
}

class GeminiMcpServer {
  private server: McpServer;
  private geminiService: GeminiService;
  private imageService: GeminiImageService;
  private landingPageTool: GenerateLandingPageTool;
  private svgTool: GenerateSVGTool;

  constructor() {
    try {
      validateConfig();
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      process.exit(1);
    }

    this.geminiService = new GeminiService(config.gemini, config.server.imageOutputDir);
    this.imageService = new GeminiImageService(config.gemini);
    this.landingPageTool = new GenerateLandingPageTool(this.geminiService);
    this.svgTool = new GenerateSVGTool(this.geminiService);
    
    this.server = new McpServer({
      name: config.server.name,
      version: config.server.version,
    });
    
    logger.info('Gemini MCP Server initialized', {
      serverName: config.server.name,
      version: config.server.version
    });
  }

  private async registerTools(): Promise<void> {
    // Load and register the image viewer UI resource
    try {
      const imageViewerHtml = await readFile(
        join(__dirname, 'image-viewer', 'src', 'ui', 'image-viewer.html'),
        'utf-8'
      );

      registerAppResource(
        this.server,
        'gemini-image-viewer',
        'ui://gemini/image-viewer.html',
        {},
        async () => ({
          contents: [{
            uri: 'ui://gemini/image-viewer.html',
            mimeType: RESOURCE_MIME_TYPE,
            text: imageViewerHtml
          }]
        })
      );

      logger.info('Image viewer UI resource registered', {
        uri: 'ui://gemini/image-viewer.html'
      });
    } catch (error) {
      logger.warn('Failed to load image viewer UI - inline preview will not be available', { error });
    }

    // Load and register the video viewer UI resource
    try {
      const videoViewerHtml = await readFile(
        join(__dirname, 'video-viewer', 'src', 'ui', 'video-viewer.html'),
        'utf-8'
      );

      registerAppResource(
        this.server,
        'gemini-video-viewer',
        'ui://gemini/video-viewer.html',
        {},
        async () => ({
          contents: [{
            uri: 'ui://gemini/video-viewer.html',
            mimeType: RESOURCE_MIME_TYPE,
            text: videoViewerHtml
          }]
        })
      );

      logger.info('Video viewer UI resource registered', {
        uri: 'ui://gemini/video-viewer.html'
      });
    } catch (error) {
      logger.warn('Failed to load video viewer UI - inline preview will not be available', { error });
    }

    // Load and register the SVG viewer UI resource
    try {
      const svgViewerHtml = await readFile(
        join(__dirname, 'svg-viewer', 'src', 'ui', 'svg-viewer.html'),
        'utf-8'
      );

      registerAppResource(
        this.server,
        'gemini-svg-viewer',
        'ui://gemini/svg-viewer.html',
        {},
        async () => ({
          contents: [{
            uri: 'ui://gemini/svg-viewer.html',
            mimeType: RESOURCE_MIME_TYPE,
            text: svgViewerHtml
          }]
        })
      );

      logger.info('SVG viewer UI resource registered', {
        uri: 'ui://gemini/svg-viewer.html'
      });
    } catch (error) {
      logger.warn('Failed to load SVG viewer UI - inline preview will not be available', { error });
    }

    // Load and register the landing page viewer UI resource
    try {
      const landingPageViewerHtml = await readFile(
        join(__dirname, 'landing-page-viewer', 'src', 'ui', 'landing-page-viewer.html'),
        'utf-8'
      );

      registerAppResource(
        this.server,
        'gemini-landing-page-viewer',
        'ui://gemini/landing-page-viewer.html',
        {},
        async () => ({
          contents: [{
            uri: 'ui://gemini/landing-page-viewer.html',
            mimeType: RESOURCE_MIME_TYPE,
            text: landingPageViewerHtml
          }]
        })
      );

      logger.info('Landing page viewer UI resource registered', {
        uri: 'ui://gemini/landing-page-viewer.html'
      });
    } catch (error) {
      logger.warn('Failed to load landing page viewer UI - inline preview will not be available', { error });
    }

    // Register gemini_chat tool
    this.server.registerTool(
      'gemini_chat',
      {
        title: 'Gemini Chat',
        description: 'Chat with Google Gemini models',
        inputSchema: {
          message: z.string().describe('The message to send'),
          model: z.string()
            .optional()
            .describe('Model to use (defaults to latest available)'),
          temperature: z.number()
            .min(0.0)
            .max(1.0)
            .optional()
            .default(0.7)
            .describe('Controls randomness (0.0 to 1.0)'),
          max_tokens: z.number()
            .int()
            .min(1)
            .max(65536)
            .optional()
            .default(65536)
            .describe('Maximum tokens in response'),
          system_prompt: z.string()
            .optional()
            .describe('Optional system instruction'),
          grounding: z.boolean()
            .optional()
            .default(true)
            .describe('Enable Google Search grounding for real-time information'),
          thinking_level: z.enum(['low', 'medium', 'high', 'minimal'])
            .optional()
            .describe(
              'Thinking depth for Gemini 3 models only. ' +
              '"low" minimises latency for simple tasks. ' +
              '"high" (default for Gemini 3) maximises reasoning depth. ' +
              '"medium"/"minimal" available on Gemini 3 Flash only. ' +
              'Ignored for non-Gemini-3 models.'
            )
        },
        outputSchema: {
          content: z.string(),
          success: z.boolean()
        }
      },
      async ({ message, model, temperature, max_tokens, system_prompt, grounding, thinking_level }) => {
        try {
          logger.info('Executing gemini_chat tool', { 
            model,
            messageLength: message?.length 
          });

          if (!message) {
            throw new McpError('Message is required', 'INVALID_PARAMS');
          }

          const response = await this.geminiService.chat({
            message,
            model,
            temperature,
            maxTokens: max_tokens,
            systemPrompt: system_prompt,
            grounding,
            thinkingLevel: thinking_level as any,
          });

          return {
            content: createToolResult(true, response.content),
            structuredContent: { content: response.content, success: true }
          };

        } catch (error) {
          logger.error('gemini_chat tool execution failed', { error });
          
          const errorMessage = error instanceof McpError 
            ? error.message 
            : `Unexpected error: ${(error as Error).message}`;
          
          return {
            content: createToolResult(false, errorMessage, error as Error),
            structuredContent: { content: errorMessage, success: false }
          };
        }
      }
    );

    // Register gemini_list_models tool
    this.server.registerTool(
      'gemini_list_models',
      {
        title: 'List Gemini Models',
        description: 'List available Gemini models and their descriptions',
        inputSchema: {},
        outputSchema: {
          content: z.string(),
          success: z.boolean()
        }
      },
      async () => {
        try {
          logger.info('Executing gemini_list_models tool');

          const response = await this.geminiService.listModels();
          
          let modelsInfo = 'Available Gemini Models:\n\n';
          
          for (const model of response.models) {
            modelsInfo += `• **${model.name}**: ${model.description}\n`;
          }
          
          modelsInfo += `\nLast updated: ${response.timestamp}`;

          return {
            content: createToolResult(true, modelsInfo),
            structuredContent: { content: modelsInfo, success: true }
          };

        } catch (error) {
          logger.error('gemini_list_models tool execution failed', { error });
          const errorMessage = `Error listing models: ${(error as Error).message}`;
          
          return {
            content: createToolResult(false, errorMessage, error as Error),
            structuredContent: { content: errorMessage, success: false }
          };
        }
      }
    );

    // Register gemini_deep_research tool
    this.server.registerTool(
      'gemini_deep_research',
      {
        title: 'Gemini Deep Research',
        description: 'Conduct deep research on complex topics using iterative multi-step analysis with Gemini. This performs multiple searches and synthesizes comprehensive research reports (takes several minutes). [MCP_RECOMMENDED_TIMEOUT_MS: 900000]',
        inputSchema: {
          research_question: z.string().describe('The complex research question or topic to investigate deeply'),
          model: z.string()
            .optional()
            .describe('Model to use for deep research (defaults to latest available)'),
          max_iterations: z.number()
            .int()
            .min(3)
            .max(10)
            .optional()
            .default(5)
            .describe('Number of research iterations (3-10, default 5). Environment guidance: Claude Desktop: use 3-4 (4-min timeout). Agent SDK/IDEs (VSCode, Cursor, Windsurf)/AI platforms (Cline, Roo-Cline): can use 7-10 (longer timeout tolerance)'),
          focus_areas: z.array(z.string())
            .optional()
            .describe('Optional: specific areas to focus the research on')
        },
        outputSchema: {
          content: z.string(),
          success: z.boolean()
        }
      },
      async ({ research_question, model, max_iterations, focus_areas }) => {
        try {
          logger.info('Starting deep research', { 
            question: research_question,
            maxIterations: max_iterations || 5
          });

          // Create instance and execute (business logic preserved)
          const deepResearchTool = new GeminiDeepResearchTool(this.geminiService);
          const result = await deepResearchTool.execute({
            research_question,
            model,
            max_iterations,
            focus_areas
          });

          // Result is already TextContent[] from execute method
          return {
            content: result,
            structuredContent: { 
              content: result[0]?.text || 'Research completed', 
              success: true 
            }
          };

        } catch (error) {
          logger.error('Deep research failed', { error });
          
          const errorMessage = error instanceof McpError
            ? error.message
            : `Deep research failed: ${(error as Error).message}`;
          
          return {
            content: createToolResult(false, errorMessage, error as Error),
            structuredContent: { content: errorMessage, success: false }
          };
        }
      }
    );

    // Image input schema shared across image analysis tools
    const imageInputSchema = z.object({
      data: z.string().describe('Base64 encoded image data'),
      mimeType: z.string().describe('MIME type of the image (e.g., image/png, image/jpeg)'),
      mediaResolution: z.enum([
        'MEDIA_RESOLUTION_LOW',
        'MEDIA_RESOLUTION_MEDIUM',
        'MEDIA_RESOLUTION_HIGH',
        'MEDIA_RESOLUTION_ULTRA_HIGH'
      ]).optional().describe(
        'Per-image resolution override. LOW=280 tokens (75% savings), MEDIUM=560 tokens (50% savings), ' +
        'HIGH=1120 tokens (default), ULTRA_HIGH=2000+ tokens (max detail, per-image only)'
      )
    });

    // Register generate_image tool using MCP Apps for inline preview
    registerAppTool(
      this.server,
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
          ui: {
            resourceUri: 'ui://gemini/image-viewer.html'
          }
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

          const result = await this.imageService.generateImage({
            prompt, 
            model, 
            aspectRatio, 
            imageSize,
            images: images as any,
            useSearch: use_search,
            globalMediaResolution: global_media_resolution as any
          });

          const firstImage = result.parts.find(p => p.type === 'image' && p.base64Data);

          // ALWAYS save to disk - use explicit outputPath, env var, or default directory
          // This prevents MCP protocol 1MB limit breach from base64 in JSON-RPC response
          const outputDir = config.server.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
          const resolvedSavePath = outputPath 
            ? resolve(outputPath)
            : resolve(outputDir, `gemini-${Date.now()}.png`);

          let savedPath: string | undefined;
          let previewPath: string | undefined;
          let signaturePath: string | undefined;
          let previewImageData: string | undefined;
          
          // Always save when we have image data
          if (firstImage?.base64Data) {
            // Save full-resolution image to disk
            savedPath = await saveImageToFile(firstImage.base64Data, resolvedSavePath);
            
            // Wait for filesystem to flush (prevents race condition)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create HTML preview
            previewPath = await createImagePreviewHtml(
              savedPath,
              prompt,
              result.description
            );
            
            // Compress for MCP app preview (small thumbnail for instant display)
            // Use compressForViewer() to stay well under 1MB MCP limit
            const compressed = await compressForViewer(
              firstImage.base64Data,
              firstImage.mimeType || 'image/png'
            );
            previewImageData = compressed.base64;
            
            logger.info('Image saved successfully', { 
              savedPath, 
              previewPath,
              originalKB: Math.round(compressed.originalBytes / 1024),
              previewKB: Math.round(compressed.previewBytes / 1024),
              compressionRatio: (compressed.originalBytes / compressed.previewBytes).toFixed(1) + 'x'
            });
          }

          const textLines: string[] = [];
          if (savedPath) textLines.push(`Image saved to: ${savedPath}`);
          if (previewPath) textLines.push(`HTML preview: ${previewPath}`);
          if (result.description) textLines.push(`\n${result.description}`);
          
          // Add grounding sources if available
          if (result.groundingSources && result.groundingSources.length > 0) {
            textLines.push('\n**Sources used for grounding:**');
            result.groundingSources.forEach((source, idx) => {
              textLines.push(`${idx + 1}. [${source.title}](${source.url})`);
            });
          }

          // Return for MCP Apps with structuredContent for inline preview
          return {
            structuredContent: {
              base64Data: previewImageData || '',
              mimeType: 'image/jpeg',
              savedPath,
              previewPath,
              description: result.description,
              prompt,
              groundingSources: result.groundingSources
            },
            content: [
              { 
                type: 'text' as const, 
                text: textLines.join('\n') || 'Image generated successfully' 
              }
            ]
          };
        } catch (error) {
          logger.error('generate_image tool failed', { error });
          const msg = error instanceof McpError
            ? error.message
            : `Failed to generate image: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error)
          };
        }
      }
    );

    // Register edit_image tool using MCP Apps for inline preview
    registerAppTool(
      this.server,
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
          ui: {
            resourceUri: 'ui://gemini/image-viewer.html'
          }
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

          const result = await this.imageService.generateImage({
            prompt, 
            model,
            images: images as any,
            useSearch: use_search,
            globalMediaResolution: global_media_resolution as any
          });

          const firstImage = result.parts.find(p => p.type === 'image' && p.base64Data);

          // ALWAYS save to disk - use explicit outputPath, env var, or default directory
          const outputDir = config.server.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
          const resolvedSavePath = outputPath
            ? resolve(outputPath)
            : resolve(outputDir, `gemini-edit-${Date.now()}.png`);

          let savedPath: string | undefined;
          let previewPath: string | undefined;
          let signaturePath: string | undefined;
          let previewImageData: string | undefined;
          
          // Always save when we have image data
          if (firstImage?.base64Data) {
            // Save full-resolution image to disk
            savedPath = await saveImageToFile(firstImage.base64Data, resolvedSavePath);
            
            // Wait for filesystem to flush (prevents race condition)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create HTML preview
            previewPath = await createImagePreviewHtml(
              savedPath,
              `[EDIT] ${prompt}`,
              result.description
            );
            
            // Compress for MCP app preview (small thumbnail for instant display)
            // Use compressForViewer() to stay well under 1MB MCP limit
            const compressed = await compressForViewer(
              firstImage.base64Data,
              firstImage.mimeType || 'image/png'
            );
            previewImageData = compressed.base64;
            
            logger.info('Edited image saved successfully', { 
              savedPath,
              previewPath,
              originalKB: Math.round(compressed.originalBytes / 1024),
              previewKB: Math.round(compressed.previewBytes / 1024),
              compressionRatio: (compressed.originalBytes / compressed.previewBytes).toFixed(1) + 'x'
            });
          }

          const textLines: string[] = [];
          if (savedPath) textLines.push(`Image saved to: ${savedPath}`);
          if (previewPath) textLines.push(`HTML preview: ${previewPath}`);
          if (result.description) textLines.push(`\n${result.description}`);
          
          // Add grounding sources if available
          if (result.groundingSources && result.groundingSources.length > 0) {
            textLines.push('\n**Sources used for grounding:**');
            result.groundingSources.forEach((source, idx) => {
              textLines.push(`${idx + 1}. [${source.title}](${source.url})`);
            });
          }

          // Return for MCP Apps with structuredContent for inline preview
          return {
            structuredContent: {
              base64Data: previewImageData || '',
              mimeType: 'image/jpeg',
              savedPath,
              previewPath,
              thoughtSignaturePath: signaturePath,
              description: result.description,
              prompt: `[EDIT] ${prompt}`,
              groundingSources: result.groundingSources
            },
            content: [
              { 
                type: 'text' as const, 
                text: textLines.join('\n') || 'Image edited successfully' 
              }
            ]
          };
        } catch (error) {
          logger.error('edit_image tool failed', { error });
          const msg = error instanceof McpError
            ? error.message
            : `Failed to edit image: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error)
          };
        }
      }
    );

    // Register describe_image tool
    this.server.registerTool(
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

          const description = await this.imageService.describeImage({
            images: images as any,
            prompt, 
            model,
            globalMediaResolution: global_media_resolution as any
          });

          return {
            content: createToolResult(true, description),
            structuredContent: { content: description, success: true },
          };
        } catch (error) {
          logger.error('describe_image tool failed', { error });
          const msg = error instanceof McpError ? error.message : `Failed to describe image: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error),
            structuredContent: { content: msg, success: false },
          };
        }
      }
    );

    // Register analyze_image tool
    this.server.registerTool(
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

          const result = await this.geminiService.analyzeImages({
            images: images as any,
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
          logger.error('analyze_image tool failed', { error });
          const msg = error instanceof McpError ? error.message : `Failed to analyze image: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error),
            structuredContent: { content: msg, success: false }
          };
        }
      }
    );

    // Register load_image_from_path tool
    this.server.registerTool(
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

          const loaded = await loadImageFromPath(filePath);

          const summary = JSON.stringify({
            data: loaded.data,
            mimeType: loaded.mimeType,
            filePath: loaded.filePath,
            sizeBytes: loaded.sizeBytes,
            thoughtSignature: loaded.thoughtSignature,
          });

          return {
            content: createToolResult(true, summary),
            structuredContent: { content: summary, success: true },
          };
        } catch (error) {
          logger.error('load_image_from_path tool failed', { error });
          const msg = error instanceof McpError
            ? error.message
            : `Failed to load image: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error),
            structuredContent: { content: msg, success: false },
          };
        }
      }
    );

    // Register generate_landing_page tool using MCP Apps for inline preview
    registerAppTool(
      this.server,
      'generate_landing_page',
      {
        title: 'Generate Landing Page',
        description:
          'Generate a complete, self-contained HTML landing page using Gemini. ' +
          'Returns inline preview with responsive viewport controls. ' +
          'No external dependencies; inline CSS and vanilla JS only.',
        inputSchema: {
          brief: z.string().describe('Description of the product/service and page goals'),
          companyName: z.string().optional().describe('Company or product name'),
          primaryColour: z.string().optional().describe('Primary brand colour (e.g. #3B82F6 or "deep blue")'),
          style: z.enum(['minimal', 'bold', 'corporate', 'startup'])
            .optional()
            .default('startup')
            .describe('Visual design style'),
          sections: z.array(z.string())
            .optional()
            .describe('Sections to include (e.g. ["hero", "features", "pricing", "cta"])'),
          model: z.string().optional().describe('Gemini model to use (defaults to configured default)'),
          outputPath: z.string()
            .optional()
            .describe('Optional file path to save the HTML (e.g. C:/dev/output/landing.html)'),
        },
        _meta: {
          ui: {
            href: 'ui://gemini/landing-page-viewer.html'
          }
        }
      },
      async ({ brief, companyName, primaryColour, style, sections, model, outputPath }) => {
        try {
          logger.info('Executing generate_landing_page tool', { style, model });

          const html = await this.landingPageTool.execute({
            brief,
            companyName,
            primaryColour,
            style,
            sections,
            model,
          });

          // ALWAYS save to disk - use explicit outputPath, env var, or default directory
          const outputDir = config.server.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
          const absolutePath = outputPath 
            ? resolve(outputPath)
            : resolve(outputDir, `gemini-landing-${Date.now()}.html`);
          
          await mkdir(dirname(absolutePath), { recursive: true });
          await writeFile(absolutePath, html, 'utf-8');
          
          logger.info('Landing page saved successfully', { savedPath: absolutePath });

          // Return with file path
          return {
            structuredContent: {
              html,
              savedPath: absolutePath,
              brief,
              companyName
            },
            content: [
              { 
                type: 'text' as const, 
                text: `Landing page saved to: ${absolutePath}\n\nOpen this file in your browser to view the landing page.`
              }
            ]
          };
        } catch (error) {
          logger.error('generate_landing_page tool failed', { error });
          const msg = error instanceof McpError
            ? error.message
            : `Failed to generate landing page: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error),
            structuredContent: { content: msg, success: false },
          };
        }
      }
    );

    // Register generate_svg tool
    registerAppTool(
      this.server,
      'generate_svg',
      {
        title: 'Generate SVG Graphic',
        description:
          'Generate scalable vector graphics (SVG) using Gemini. ' +
          'Creates clean, production-ready SVG code for diagrams, illustrations, icons, and data visualizations. ' +
          'Returns inline preview with SVG viewer.',
        inputSchema: {
          prompt: z.string().describe('Description of the SVG graphic to generate'),
          width: z.number()
            .optional()
            .default(800)
            .describe('SVG width in pixels (default: 800)'),
          height: z.number()
            .optional()
            .default(600)
            .describe('SVG height in pixels (default: 600)'),
          style: z.enum(['technical', 'artistic', 'minimal', 'data-viz'])
            .optional()
            .default('technical')
            .describe('Visual style: technical (diagrams), artistic (illustrations), minimal (simple), data-viz (charts)'),
          model: z.string()
            .optional()
            .describe('Gemini model to use (defaults to configured default)'),
          outputPath: z.string()
            .optional()
            .describe('Optional file path to save the SVG (e.g. C:/output/diagram.svg)'),
        },
        _meta: {
          ui: {
            href: 'ui://gemini/image-viewer.html'
          }
        }
      },
      async ({ prompt, width, height, style, model, outputPath }) => {
        try {
          logger.info('Executing generate_svg tool', { style, dimensions: `${width}x${height}`, model });

          const svgContent = await this.svgTool.execute({
            prompt,
            width,
            height,
            style,
            model,
          });

          // ALWAYS save to disk - use explicit outputPath, env var, or default directory
          const outputDir = config.server.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
          const absolutePath = outputPath 
            ? resolve(outputPath)
            : resolve(outputDir, `gemini-${Date.now()}.svg`);
          
          await mkdir(dirname(absolutePath), { recursive: true });
          await writeFile(absolutePath, svgContent, 'utf-8');
          
          logger.info('SVG saved successfully', { savedPath: absolutePath });

          // Convert SVG to base64 for inline preview using image viewer
          const base64Data = Buffer.from(svgContent, 'utf-8').toString('base64');

          // Return with image viewer preview (SVG as base64 image)
          return {
            structuredContent: {
              base64Data,
              mimeType: 'image/svg+xml',
              savedPath: absolutePath,
              description: `${style} style SVG graphic (${width}x${height})`,
              prompt
            },
            content: [
              { 
                type: 'text' as const, 
                text: `SVG saved to: ${absolutePath}`
              }
            ]
          };
        } catch (error) {
          logger.error('generate_svg tool failed', { error });
          const msg = error instanceof McpError
            ? error.message
            : `Failed to generate SVG: ${(error as Error).message}`;
          return {
            content: createToolResult(false, msg, error as Error),
            structuredContent: { content: msg, success: false },
          };
        }
      }
    );

    // Register help/documentation tool
    this.server.registerTool(
      'gemini_help',
      {
        title: 'Gemini MCP Help',
        description: 'Get comprehensive help about Gemini MCP features, settings, and best practices',
        inputSchema: {
          topic: z.enum([
            'overview',
            'image_generation',
            'image_editing', 
            'image_analysis',
            'chat',
            'deep_research',
            'grounding',
            'media_resolution',
            'models',
            'all'
          ])
            .optional()
            .default('overview')
            .describe('Help topic to display')
        }
      },
      async ({ topic }) => {
        const helpContent: Record<string, string> = {
          overview: `# Gemini MCP Server - Overview

**Version:** 2.1.0
**Tools Available:** 10

## Core Features
• **Chat & Research:** gemini_chat, gemini_deep_research
• **Image Generation:** generate_image, edit_image  
• **Image Analysis:** describe_image, analyze_image
• **Utilities:** gemini_list_models, load_image_from_path, generate_landing_page
• **Help:** gemini_help (this tool)

## Quick Start
\`gemini_help topic="image_generation"\` - Image generation guide
\`gemini_help topic="grounding"\` - Search grounding features
\`gemini_help topic="media_resolution"\` - Token optimization
\`gemini_help topic="all"\` - Complete documentation

## Key Capabilities
✓ Google Search grounding for real-time data
✓ Multi-modal image generation with conversational editing
✓ Advanced image analysis with token optimization
✓ Deep research with iterative multi-step analysis
✓ Full-resolution image output (saved to disk)
✓ High-quality inline previews (1024px, quality 100)`,

          image_generation: `# Image Generation Guide

## Tool: generate_image

### Basic Usage
\`\`\`
generate_image(
  prompt="A photorealistic sunset over mountains",
  aspectRatio="16:9"
)
\`\`\`

### Parameters

**prompt** (required)
Description of the image to generate. Be specific and detailed.

**model** (optional, default: "gemini-3-pro-image-preview")
Options:
• gemini-3-pro-image-preview - Best quality, conversational editing support
• gemini-2.5-flash-image - Stable, fast generation
• nano-banana-pro-preview - Alias for gemini-3-pro-image-preview

**aspectRatio** (optional, default: "1:1")
Options: "1:1", "3:4", "4:3", "9:16", "16:9"
Use 16:9 for landscapes, 9:16 for portraits, 1:1 for squares

**imageSize** (optional)
Options: "1K", "2K", "4K"
Only works with image-specific models. Higher = more detail but slower.
Note: Preview is capped at 1024px, but full-res saved to disk

**use_search** (optional, default: false)
Enable Google Search grounding for real-time data.
Use for: weather forecasts, current events, stock prices, sports scores
Returns grounding sources as markdown links

**global_media_resolution** (optional, default: "HIGH")
For reference images only. See \`gemini_help topic="media_resolution"\`

**outputPath** (optional)
Custom save location. Otherwise saves to configured output directory.

### Output Resolution
• Generation: Full resolution (up to 4K depending on settings)
• Disk: Full resolution saved (always)
• Preview: 1024px max dimension, quality 100 (for inline display)

### Advanced: Conversational Editing
Generate an image, then edit it by passing the thoughtSignature:
\`\`\`
1. generate_image(prompt="A logo") → returns thoughtSignature
2. edit_image(
     prompt="Make it blue",
     images=[{data, mimeType, thoughtSignature}]
   )
\`\`\``,

          image_editing: `# Image Editing Guide

## Tool: edit_image

### Basic Usage
\`\`\`
edit_image(
  prompt="Change the color scheme to blue and green",
  images=[{data: base64Data, mimeType: "image/png"}]
)
\`\`\`

### Parameters

**prompt** (required)
Natural language instructions for how to edit the image(s).
Examples:
• "Make the background darker"
• "Add a red border"
• "Change to black and white"
• "Increase contrast and saturation"

**images** (required, array)
One or more images to edit. Each image object:
• data: Base64 encoded image data
• mimeType: Image MIME type (e.g., "image/png", "image/jpeg")
• thoughtSignature: (optional) For conversational editing
• mediaResolution: (optional) Per-image quality override

**model** (optional, default: "gemini-3-pro-image-preview")
Same options as generate_image

**use_search** (optional, default: false)
Enable Google Search for data-driven edits
Example: "Add current weather data for London"

**global_media_resolution** (optional, default: "HIGH")
Token cost optimization. See \`gemini_help topic="media_resolution"\`

**outputPath** (optional)
Custom save location for edited image

### Conversational Editing
For multi-step refinements with gemini-3-pro-image-preview:
1. First edit returns thoughtSignature
2. Pass thoughtSignature in subsequent edits
3. Model maintains visual context across iterations

### Tips
• Be specific: "Make brighter" vs "Increase brightness by 20%"
• Reference elements: "The sky in the background" vs "The background"
• Multiple images: Model can composite or compare them`,

          image_analysis: `# Image Analysis Guide

## Tools: describe_image, analyze_image

### describe_image - Text Descriptions

**Purpose:** Generate natural language descriptions of images

\`\`\`
describe_image(
  images=[{data: base64Data, mimeType: "image/jpeg"}],
  prompt="Describe this image in detail"
)
\`\`\`

Returns plain text description.

### analyze_image - Structured Analysis

**Purpose:** Extract specific information from images as structured data

\`\`\`
analyze_image(
  images=[{data: base64Data, mimeType: "image/png"}],
  prompt="Extract all text from this document and count words"
)
\`\`\`

Returns structured analysis based on prompt.

### Media Resolution (Cost Optimization)

**global_media_resolution** parameter:
• MEDIA_RESOLUTION_LOW (280 tokens, 75% savings)
  Use for: Simple tasks, bulk operations, thumbnails
• MEDIA_RESOLUTION_MEDIUM (560 tokens, 50% savings)
  Use for: PDFs, documents (OCR quality same as HIGH!)
• MEDIA_RESOLUTION_HIGH (1120 tokens, default)
  Use for: Detailed analysis, complex images

**Per-image override:**
\`\`\`
images=[
  {data: icon, mimeType: "image/png", 
   mediaResolution: "MEDIA_RESOLUTION_LOW"},
  {data: detailed, mimeType: "image/png", 
   mediaResolution: "MEDIA_RESOLUTION_ULTRA_HIGH"}
]
\`\`\`

ULTRA_HIGH (2000+ tokens) only available as per-image override.

### PDF Analysis Best Practice
For PDFs, use MEDIUM resolution:
• Same OCR quality as HIGH
• 50% token savings
• Perfect for multi-page documents`,

          chat: `# Chat & Conversation Guide

## Tool: gemini_chat

### Basic Usage
\`\`\`
gemini_chat(
  message="Explain quantum entanglement",
  model="gemini-3-pro-preview"
)
\`\`\`

### Parameters

**message** (required)
Your message/question to Gemini

**model** (optional)
Options: See \`gemini_help topic="models"\`

**grounding** (optional, default: false)
Enable Google Search grounding for current information
Returns grounding metadata with sources

**max_tokens** (optional, default: 65536)
Maximum tokens in response (1-65536)

**temperature** (optional, default: 0.7)
Randomness (0.0-1.0). Lower = more focused, Higher = more creative

**thinking_level** (optional)
For Gemini 3 models only:
• "LOW" - Minimal reasoning, fast responses
• "MEDIUM" - Balanced (Flash only)
• "HIGH" - Deep reasoning, slower (default for Gemini 3)
• "MINIMAL" - Absolute minimum thinking (Flash only)

**system_prompt** (optional)
System-level instructions for the model

### Grounding Example
\`\`\`
gemini_chat(
  message="What are the latest developments in the MCP specification?",
  grounding=true
)
\`\`\`
Returns current information with source citations.`,

          deep_research: `# Deep Research Guide

## Tool: gemini_deep_research

### Purpose
Conduct comprehensive multi-step research on complex topics using iterative analysis.

### Usage
\`\`\`
gemini_deep_research(
  research_question="What are the implications of quantum computing for cryptography?",
  max_iterations=5,
  focus_areas=["RSA encryption", "Post-quantum algorithms"]
)
\`\`\`

### Parameters

**research_question** (required)
Complex research question or topic to investigate deeply

**max_iterations** (optional, default: 5)
Number of research iterations (3-10)
More iterations = deeper research but longer wait time
• 3-4: Quick overview (4-8 minutes)
• 5-7: Comprehensive analysis (8-15 minutes)
• 8-10: Exhaustive research (15-25 minutes)

**focus_areas** (optional, array)
Specific areas to focus the research on
Example: ["clinical trials", "side effects", "dosage"]

**model** (optional)
Research model to use (defaults to latest available)

### How It Works
1. Initial search and information gathering
2. Iterative deepening with follow-up queries
3. Cross-referencing and validation
4. Synthesis into comprehensive report

### Returns
Comprehensive research report with:
• Executive summary
• Key findings organized by theme
• Source citations
• Confidence assessments
• Recommended follow-up questions

### Best For
• Complex topics requiring multiple sources
• Academic or technical research
• Comparative analysis across domains
• Questions with no single definitive answer`,

          grounding: `# Google Search Grounding Guide

## What is Grounding?
Grounding connects Gemini to Google Search for real-time, factual information.

## Available in Tools
• gemini_chat (grounding parameter)
• generate_image (use_search parameter)
• edit_image (use_search parameter)

## Chat Grounding
\`\`\`
gemini_chat(
  message="What happened in tech news today?",
  grounding=true
)
\`\`\`

**Returns:**
• Current information (not training data)
• Grounding metadata with sources
• Web search queries used

**Best for:**
• Current events and news
• Recent developments in any field
• Fact-checking and verification
• Topics that change frequently

## Image Grounding
\`\`\`
generate_image(
  prompt="Weather forecast for London tomorrow with actual temperatures",
  use_search=true
)
\`\`\`

**Returns:**
• Image with real-time data
• Grounding sources as markdown links
• Search queries used

**Best for:**
• Weather forecasts
• Stock prices and financial data
• Sports scores and statistics
• Current events infographics
• Any data-driven visualizations

## Important Notes
• Grounding adds latency (search takes time)
• Sources returned as clickable markdown links
• Not needed for general knowledge or creative tasks
• Most valuable for factual, current information`,

          media_resolution: `# Media Resolution & Token Optimization

## What is Media Resolution?
Controls image quality when analyzing images, trading quality for token cost.

## Resolution Levels

**MEDIA_RESOLUTION_LOW (280 tokens)**
• 75% token savings vs HIGH
• Use for: Simple visual tasks, thumbnails, bulk processing
• Quality: Sufficient for basic recognition and simple questions

**MEDIA_RESOLUTION_MEDIUM (560 tokens)**
• 50% token savings vs HIGH
• Use for: PDFs, documents, screenshots
• Quality: **Same OCR quality as HIGH!** (OCR saturates at medium)
• **RECOMMENDED for all document analysis**

**MEDIA_RESOLUTION_HIGH (1120 tokens)**
• Default quality level
• Use for: Complex images, detailed analysis
• Quality: Full fidelity for most tasks

**MEDIA_RESOLUTION_ULTRA_HIGH (2000+ tokens)**
• Maximum detail, per-image only (not global)
• Use for: Pixel-perfect analysis, fine details, medical imaging
• Quality: Highest possible fidelity

## Usage

### Global Setting (All Images)
\`\`\`
analyze_image(
  images=[{data1}, {data2}, {data3}],
  prompt="Analyze these images",
  global_media_resolution="MEDIA_RESOLUTION_MEDIUM"
)
\`\`\`

### Per-Image Override (Mixed Quality)
\`\`\`
analyze_image(
  images=[
    {data: simple, mimeType: "image/png", 
     mediaResolution: "MEDIA_RESOLUTION_LOW"},
    {data: detailed, mimeType: "image/png", 
     mediaResolution: "MEDIA_RESOLUTION_ULTRA_HIGH"}
  ],
  global_media_resolution="MEDIA_RESOLUTION_MEDIUM"
)
\`\`\`

Per-image setting overrides global setting.

## Best Practices

**For PDFs/Documents:**
Always use MEDIUM - same OCR quality, 50% cost savings

**For Bulk Processing:**
Use LOW for simple tasks (thumbnails, basic recognition)

**For Mixed Batches:**
Set global to MEDIUM, override specific images to ULTRA_HIGH

**For Cost Optimization:**
Start with MEDIUM, only increase if quality insufficient`,

          models: `# Gemini Models Reference

## Chat Models

**Gemini 3 Series (Latest)**
• gemini-3-pro-preview - Best reasoning, supports thinking levels
• gemini-3-flash-preview - Fast, supports thinking levels
• gemini-3.1-pro-preview - Enhanced reasoning
• gemini-3.1-pro-preview-customtools - Optimized for tool use

**Gemini 2.5 Series (Stable)**
• gemini-2.5-pro - Stable flagship model
• gemini-2.5-flash - Stable fast model
• gemini-2.5-flash-lite - Lightweight, efficient

**Gemini 2.0 Series**
• gemini-2.0-flash - Versatile multimodal
• gemini-2.0-flash-001 - Stable version
• gemini-2.0-flash-lite - Lightweight variant

**Aliases**
• gemini-flash-latest - Latest Flash release
• gemini-pro-latest - Latest Pro release

## Image Generation Models

**gemini-3-pro-image-preview** (Nano Banana Pro)
• Best quality image generation
• Supports conversational editing via thoughtSignatures
• Default for generate_image and edit_image

**gemini-2.5-flash-image**
• Stable image generation
• Fast, reliable
• No conversational editing

**nano-banana-pro-preview**
• Alias for gemini-3-pro-image-preview

## Image Analysis Models

All chat models support image analysis via:
• describe_image
• analyze_image

Recommended:
• gemini-3-flash-preview (default) - Fast, accurate
• gemini-3-pro-preview - Best quality analysis

## Specialized Models

**gemini-2.5-computer-use-preview-10-2025**
• Computer interaction tasks

**deep-research-pro-preview-12-2025**
• Deep research iterations

**Gemma Models**
• gemma-3-1b-it through gemma-3-27b-it
• Open weights models for research

## Model Selection Tips

**For Chat:**
• Quick questions: gemini-3-flash-preview
• Complex reasoning: gemini-3-pro-preview
• Stable production: gemini-2.5-pro

**For Images:**
• Generation: gemini-3-pro-image-preview (only one with editing)
• Analysis: gemini-3-flash-preview (fast, accurate)

**For Research:**
• deep-research-pro-preview-12-2025

Use \`gemini_list_models\` to see all available models with descriptions.`,

          all: ''
        };

        // If "all" is selected, combine all topics
        if (topic === 'all') {
          const allTopics = Object.keys(helpContent)
            .filter(t => t !== 'all')
            .map(t => helpContent[t])
            .join('\n\n---\n\n');
          
          return {
            content: [{ type: 'text', text: allTopics }]
          };
        }

        const content = helpContent[topic];
        if (!content) {
          return {
            content: [{
              type: 'text',
              text: `Unknown help topic: ${topic}\n\nAvailable topics:\n${Object.keys(helpContent).filter(t => t !== 'all').join('\n')}`
            }]
          };
        }

        return {
          content: [{ type: 'text', text: content }]
        };
      }
    );

    // Register prompt library/assistant tool
    this.server.registerTool(
      'gemini_prompt_assistant',
      {
        title: 'Image Generation Prompt Assistant',
        description: 'Get expert prompt templates and guidance for specific image generation outcomes. Provides schemas, variables, and best practices for Nano Banana Pro and Imagen 3.',
        inputSchema: {
          request_type: z.enum([
            'template',
            'lighting_guide',
            'color_guide',
            'lens_guide',
            'style_guide',
            'optimize_prompt',
            'troubleshoot'
          ]).describe('Type of assistance needed'),
          use_case: z.enum([
            'portrait',
            'product',
            'landscape',
            'cinematic',
            'editorial',
            'abstract',
            'architecture',
            'food',
            'fashion'
          ]).optional().describe('Specific use case for template'),
          current_prompt: z.string().optional().describe('Current prompt to optimize or troubleshoot'),
          desired_outcome: z.string().optional().describe('Description of what you want to achieve')
        }
      },
      async ({ request_type, use_case, current_prompt, desired_outcome }) => {
        const guides: Record<string, string> = {
          template: `# Image Generation Template Builder

${use_case ? `## Specialized Template: ${use_case.toUpperCase()}` : '## Universal Template Structure'}

**Framework:** [Medium] + [Subject/Action] + [Environment] + [Lighting] + [Camera/Technical] + [Style/Aesthetic]

${use_case === 'portrait' ? `
### Portrait Photography Template

**Structure:**
"[Shot type] portrait of [subject description], [location/environment], lighting is [lighting type], shot on [camera/film], [aperture], [color grade]"

**Example:**
"A close-up portrait of an elderly fisherman with a weathered face and thick grey beard, wearing a yellow raincoat. Standing on a rainy dock in Norway. Lighting is soft overcast diffused light. Shot on Kodak Portra 400, 85mm lens, f/1.8 aperture for blurry ocean background. Desaturated with cool blue tones."

**Key Variables:**
• **Shot Types:** Close-up, medium, wide, extreme close-up, environmental
• **Lighting:** Golden hour, rim lighting, chiaroscuro, soft diffused, dramatic
• **Lenses:** 50mm (natural), 85mm (flattering), 100mm (compressed)
• **Aperture:** f/1.2-2.8 (bokeh), f/5.6-8 (balanced), f/11+ (sharp background)
• **Film Stock:** Kodak Portra 400 (warm skin), Fuji Pro 400H (cool), Ilford HP5 (B&W)

**Common Mistakes to Avoid:**
✗ "Beautiful person" → ✓ "Person with defined cheekbones and expressive eyes"
✗ "Good lighting" → ✓ "Soft window light from camera left creating gentle shadows"
✗ "Professional photo" → ✓ "Shot on medium format digital, 80mm lens, f/2.8"
` : ''}

${use_case === 'product' ? `
### Product Photography Template

**Structure:**
"[Product] placed on [surface], surrounded by [props], lighting is [studio setup], [camera angle], [resolution focus]"

**Example:**
"A luxury perfume bottle made of amber glass placed on rough dark slate rock. Surrounded by splashes of water and white jasmine flowers. Lighting is dramatic rim lighting to highlight glass contours, with soft fill light from front. Macro photography, f/2.8, extremely sharp focus on brand label, 8k resolution textures."

**Key Variables:**
• **Surfaces:** Slate, marble, wood grain, brushed metal, white seamless
• **Props:** Seasonal elements, brand-relevant items, texture contrast
• **Lighting:** Rim (outline), backlighting (glow), soft diffused (flattering)
• **Angles:** 45° (dynamic), straight-on (editorial), overhead flat lay
• **Focus:** Macro (extreme detail), selective focus (depth), full sharp

**Composition Rules:**
• Rule of thirds for dynamic placement
• Negative space for luxury/minimalism
• Depth layers (foreground, product, background)
• Color harmony (complementary or analogous)
` : ''}

${use_case === 'cinematic' ? `
### Cinematic Concept Art Template

**Structure:**
"[View type] of [environment] featuring [key element], style is [art style], lighting is [atmospheric], [color palette], [render engine]"

**Example:**
"Wide establishing shot of futuristic cyberpunk favela built vertically into massive canyon. Neon signs in Japanese illuminate fog. Lone cyborg figure on ledge in foreground looking down. Cinematic concept art, matte painting style. Volumetric blue and pink neon mixed with deep shadows. Unreal Engine 5 render, hyper-detailed, dystopian atmosphere."

**Key Variables:**
• **Views:** Establishing wide, dramatic low angle, hero shot, aerial
• **Atmosphere:** Volumetric fog, god rays, dust particles, haze
• **Time:** Golden hour, blue hour, midday harsh, night illuminated
• **Color Theory:** Teal/orange (blockbuster), monochrome, desaturated, neon
• **Render:** Unreal Engine 5, Octane, Blender Cycles, photorealistic

**Mood Keywords:**
• Epic: "Towering," "vast," "monumental," "awe-inspiring"
• Dystopian: "Gritty," "abandoned," "decay," "harsh lighting"
• Fantasy: "Ethereal," "magical," "mysterious," "enchanted"
` : ''}

${!use_case ? `
### Universal Template (All Use Cases)

**Basic Structure:**
"[Medium] showing [subject] [action] in [environment], [lighting description], [technical camera specs], [style/aesthetic]"

**Example Breakdown:**

1. **Medium:** Photography, oil painting, 3D render, watercolor, vector art
2. **Subject:** Be specific - age, clothing texture, expression
3. **Action:** Active verbs - "sipping," "gazing," "running through"
4. **Environment:** Specific location with texture details
5. **Lighting:** See lighting_guide for full options
6. **Technical:** Camera, lens, aperture, film stock
7. **Style:** Film noir, cyberpunk, minimalist, vintage

**Quick Reference:**
• More words = More control (but diminishing returns after ~75 words)
• Natural sentences > keyword lists
• Specific nouns > vague adjectives
• Technical terms signal photorealism intent
` : ''}

**Next Steps:**
• Use \`gemini_prompt_assistant request_type="lighting_guide"\` for lighting options
• Use \`gemini_prompt_assistant request_type="optimize_prompt"\` with your draft
• Use \`gemini_prompt_assistant request_type="troubleshoot"\` if results aren't matching`,

          lighting_guide: `# Comprehensive Lighting Guide

## Decision Tree: Choose Lighting by Mood

**DRAMATIC/INTENSE** → Chiaroscuro, rim lighting, harsh directional
**ROMANTIC/WARM** → Golden hour, soft diffused, candlelight
**MYSTERIOUS/MOODY** → Low-key, volumetric fog, blue hour
**PROFESSIONAL/CLEAN** → Softbox studio, even lighting, no shadows
**EPIC/CINEMATIC** → God rays, volumetric, backlighting

## Complete Lighting Techniques

### Golden Hour
**Effect:** Warm, soft, low-angle sun, long shadows, romantic glow
**Best For:** Portraits, travel, outdoor scenes
**Keywords:** "Golden hour sunlight," "warm glow," "soft directional light"
**Technical:** Color temp 3000-4000K, shoot 1hr before sunset/after sunrise

### Blue Hour  
**Effect:** Cool twilight, melancholic, serene, deep blue sky
**Best For:** Cityscapes, moody atmospheric shots
**Keywords:** "Blue hour twilight," "cool ambient light," "dusk atmosphere"

### Chiaroscuro (High Contrast)
**Effect:** Dramatic light/dark contrast, Renaissance painting style
**Best For:** Film noir, dramatic portraits, mystery
**Keywords:** "Chiaroscuro lighting," "high contrast shadows," "dramatic light"

### Rim Lighting (Backlit)
**Effect:** Light outline around subject, separates from background
**Best For:** Hero shots, silhouettes, atmospheric separation
**Keywords:** "Rim lit," "backlit," "edge lighting," "halo effect"

### Volumetric / God Rays
**Effect:** Visible light beams through fog/dust/smoke
**Best For:** Epic fantasy, forests, atmospheric drama
**Keywords:** "Volumetric lighting," "god rays," "light shafts," "beams cutting through mist"

### Softbox / Diffused Studio
**Effect:** Even, shadowless, flattering, professional
**Best For:** Headshots, beauty, product photography
**Keywords:** "Soft diffused studio lighting," "even illumination," "no harsh shadows"

### Hard / Harsh Light
**Effect:** Sharp shadows, high contrast, edgy
**Best For:** Fashion, street photography, graphic looks
**Keywords:** "Harsh direct sunlight," "hard shadows," "high noon light"

### Practical Lighting (In-Scene Sources)
**Effect:** Light from objects in frame (lamps, neon, screens)
**Best For:** Cinematic narrative, moody interiors
**Keywords:** "Lit by neon signs," "practical lamp lighting," "ambient screen glow"

### Candlelight / Warm Interior
**Effect:** Intimate, flickering, warm yellow glow
**Best For:** Romantic scenes, cozy atmosphere
**Keywords:** "Candlelit," "warm flickering light," "soft amber glow"

## Combination Techniques

**Three-Point Lighting (Studio Standard):**
"Studio three-point lighting with key light from camera left, fill light from right at half intensity, and rim light from behind"

**Natural + Fill:**
"Natural window light from left with subtle fill reflector to soften shadows"

**Mixed Temperatures:**
"Warm tungsten interior lights contrasting with cool blue exterior daylight through windows"

## Common Mistakes

❌ "Good lighting" → Too vague
✓ "Soft overhead diffused light creating gentle shadows under cheekbones"

❌ "Dramatic" → Subjective
✓ "Chiaroscuro lighting with single hard source from camera right"

❌ Conflicting lights → "Silhouette with front lighting"
✓ Pick one primary source direction`,

          color_guide: `# Color Grading & Palette Guide

## Color Theory for AI Generation

### Popular Film Color Grades

**Teal and Orange (Hollywood Blockbuster)**
• Effect: Warm skin tones pop against cool backgrounds
• Use: Action, commercial, modern cinematic
• Keywords: "Teal and orange color grade," "orange skin tones with cyan background"

**Monochromatic**
• Effect: Variations of single hue, artistic unity
• Use: Conceptual art, editorial, moody pieces
• Keywords: "Monochromatic crimson palette," "variations of deep blue"

**Pastel / High-Key**
• Effect: Light, airy, low contrast, desaturated
• Use: Wes Anderson style, dreamy, vintage
• Keywords: "Pastel color palette," "high-key lighting," "soft muted tones"

**Desaturated / Muted**
• Effect: Gritty, realistic, subdued
• Use: War photography, documentary, somber moods
• Keywords: "Desaturated colors," "muted palette," "low saturation"

**Neon / Synthwave**
• Effect: High saturation purples, pinks, cyans
• Use: Cyberpunk, 80s retro, vaporwave
• Keywords: "Neon synthwave colors," "vibrant purple and cyan," "electric pink glow"

**Kodachrome Vintage**
• Effect: Rich reds and yellows, high contrast
• Use: 1950s-70s nostalgic look
• Keywords: "Kodachrome film colors," "vintage high contrast," "rich warm tones"

**Bleach Bypass**
• Effect: Reduced saturation, high contrast, gritty
• Use: Action, thriller, intense drama
• Keywords: "Bleach bypass look," "high contrast desaturated"

**Sepia / Vintage B&W Tones**
• Effect: Warm brown tones, historical feel
• Use: Nostalgia, historical, timeless
• Keywords: "Sepia tone," "warm vintage brown wash"

## Color Harmony Approaches

**Complementary** (Opposite on color wheel)
• Blue/Orange, Red/Green, Purple/Yellow
• Creates visual tension and balance

**Analogous** (Adjacent on wheel)
• Blue/Green/Teal, Red/Orange/Yellow
• Harmonious and soothing

**Triadic** (Three equally spaced)
• Red/Yellow/Blue, Purple/Orange/Green
• Vibrant but balanced

## Temperature Control

**Warm Palette:** Oranges, yellows, reds → Cozy, energetic, passionate
**Cool Palette:** Blues, greens, purples → Calm, professional, melancholic
**Neutral:** Greys, browns, beiges → Timeless, sophisticated, minimal

## Practical Examples

**Commercial Product:**
"Clean white background with subtle warm highlights, high-key exposure, minimal color grading"

**Film Noir:**
"Deep blacks and bright whites, high contrast black and white, dramatic shadows"

**Cyberpunk Scene:**
"Neon pink and electric cyan color grading with deep shadows, high saturation, teal and magenta split toning"

**Natural Documentary:**
"Neutral color temperature, accurate skin tones, slight contrast boost, no stylized grading"`,

          lens_guide: `# Camera Lens & Technical Specifications Guide

## Focal Length Decision Tree

**Want EXPANSIVE view with CONTEXT** → 16-35mm (wide angle)
**Want NATURAL human perspective** → 40-50mm (standard)
**Want FLATTERING portraits** → 85-135mm (portrait)
**Want COMPRESSED backgrounds** → 200mm+ (telephoto)

## Complete Focal Length Guide

### Ultra-Wide (16-24mm)
**Effect:** Expansive view, slight barrel distortion, exaggerated depth
**Best For:** Landscapes, architecture, dynamic action
**Keywords:** "Shot on 16mm ultra-wide lens," "expansive field of view"
**Characteristics:** Makes foreground huge, background tiny

### Wide Angle (28-35mm)
**Effect:** Broad view, natural slight distortion, documentary feel
**Best For:** Environmental portraits, street, reportage
**Keywords:** "35mm documentary lens," "wide environmental context"
**Characteristics:** Less distortion than ultra-wide but still spacious

### Standard (40-50mm)
**Effect:** Natural human eye perspective, no distortion
**Best For:** General photography, authentic representation
**Keywords:** "Shot on 50mm standard lens," "natural perspective"
**Characteristics:** "What you see is what you get"

### Portrait (85-100mm)
**Effect:** Flattering facial compression, beautiful bokeh
**Best For:** Headshots, beauty, character portraits
**Keywords:** "85mm portrait lens," "flattering facial compression"
**Characteristics:** Industry standard for portraits

### Telephoto (135-200mm)
**Effect:** Strong background compression, shallow DOF
**Best For:** Isolated subjects, wildlife, sports
**Keywords:** "200mm telephoto," "compressed background"
**Characteristics:** Makes background appear closer and larger

### Super Telephoto (300mm+)
**Effect:** Extreme compression, very shallow DOF, isolating
**Best For:** Wildlife, sports, distant subjects
**Keywords:** "600mm super telephoto," "extreme background blur"

## Aperture Guide (f-stop)

### Wide Open (f/1.2 - f/2.8)
**Effect:** Extremely shallow depth of field, creamy bokeh, low light capability
**Use:** Portraits, subject isolation, bokeh backgrounds
**Keywords:** "f/1.2 aperture," "shallow depth of field," "bokeh background"

### Medium (f/4 - f/5.6)
**Effect:** Moderate DOF, good sharpness, balanced
**Use:** General photography, lifestyle, travel
**Keywords:** "f/4 aperture," "balanced depth of field"

### Narrow (f/8 - f/16)
**Effect:** Deep depth of field, everything sharp, landscape mode
**Use:** Landscapes, architecture, group photos
**Keywords:** "f/11 aperture," "deep focus," "sharp throughout"

## Angle & Perspective

**Eye Level:** Neutral, relatable, documentary
**Low Angle:** Subject appears powerful, dominant, heroic
**High Angle:** Subject appears vulnerable, small, submissive
**Bird's Eye:** Overhead, pattern-revealing, graphic
**Dutch Angle:** Tilted horizon, creates tension, disorientation

## Film Emulation Types

**Kodak Portra 400:** Gold standard for portraits, excellent skin, fine grain, warm
**Fujifilm Velvia 50:** High saturation, high contrast, landscapes
**Ilford HP5 Plus:** Classic B&W, gritty grain, journalism look
**CineStill 800T:** Tungsten balanced, distinct "halation" glow around lights
**Polaroid SX-70:** Soft focus, vintage borders, washed colors

## Example Combinations

**Cinematic Portrait:**
"Shot on 85mm lens, f/1.4 aperture creating shallow depth of field with creamy bokeh, Kodak Portra 400 film emulation"

**Epic Landscape:**
"Captured on 24mm wide-angle lens, f/11 aperture for front-to-back sharpness, Fujifilm Velvia 50 film stock"

**Street Photography:**
"Shot on 35mm lens at f/5.6, Ilford HP5 Plus black and white film, natural perspective"`,

          style_guide: `# Style & Aesthetic Reference Guide

## Major Aesthetic Categories

### Film Noir (1940s-50s)
**Visual DNA:** High contrast B&W, dramatic shadows, chiaroscuro, cigarette smoke
**Lighting:** Hard single source, venetian blind shadows, rain-wet streets
**Keywords:** "Film noir aesthetic," "1940s detective style," "high contrast black and white"
**Mood:** Mystery, danger, sophistication

### Cyberpunk / Neon Noir
**Visual DNA:** Neon pink/cyan, wet reflective streets, high-tech low-life, rain
**Lighting:** Practical neon signs, volumetric fog, colored gels
**Keywords:** "Cyberpunk aesthetic," "neon-soaked streets," "dystopian future"
**Mood:** Tech dystopia, noir updated for 2050

### Vintage Americana (1950s-70s)
**Visual DNA:** Kodachrome colors, diners, vintage cars, optimistic
**Lighting:** Bright, saturated, sunny, nostalgic
**Keywords:** "1960s Kodachrome aesthetic," "vintage Americana," "mid-century modern"
**Mood:** Nostalgia, innocence, golden age

### Minimalist / Scandinavian
**Visual DNA:** Clean lines, negative space, neutral palette, functional beauty
**Lighting:** Even, soft, natural window light
**Keywords:** "Minimalist composition," "Scandinavian design," "clean simple aesthetic"
**Mood:** Calm, sophisticated, timeless

### Wes Anderson Symmetry
**Visual DNA:** Perfect symmetry, pastel palette, quirky details, flat frontal compositions
**Lighting:** Even, soft, pastel-colored
**Keywords:** "Wes Anderson style," "perfectly symmetrical composition," "pastel color palette"
**Mood:** Whimsical, nostalgic, meticulous

### Moody Editorial
**Visual DNA:** Desaturated, dramatic lighting, fashion-forward, artistic
**Lighting:** Dramatic single source, shadows emphasized
**Keywords:** "Editorial fashion lighting," "moody desaturated tones," "artistic composition"
**Mood:** Sophisticated, high-fashion, artistic

### Natural Documentary
**Visual DNA:** Candid, authentic, unposed, real moments
**Lighting:** Available light, no styling, pure observation
**Keywords:** "Documentary photography," "candid moment," "natural light"
**Mood:** Authentic, truthful, unmanipulated

### Surreal / Dreamlike
**Visual DNA:** Impossible scenarios, ethereal, soft focus, floating elements
**Lighting:** Soft diffused, magical hour, otherworldly
**Keywords:** "Surreal dreamlike atmosphere," "ethereal quality," "magical realism"
**Mood:** Fantasy, subconscious, impossible

### Gritty Realism
**Visual DNA:** Desaturated, high grain, harsh reality, unflinching
**Lighting:** Harsh natural light, no flattery, documentary style
**Keywords:** "Gritty realistic aesthetic," "high film grain," "raw unfiltered"
**Mood:** Truth, hardship, reality

## Combining Styles

You can mix aesthetics for unique results:

**"Cyberpunk + Wes Anderson":**
"Symmetrical composition of a neon-lit futuristic street in pastel pink and mint green, perfectly centered character, whimsical retrofuturism"

**"Film Noir + Colorized":**
"1940s detective aesthetic with dramatic chiaroscuro lighting but rendered in desaturated color with teal and orange tones"

**"Minimalist + Volumetric":**
"Clean Scandinavian interior with single subject, but dramatic god rays cutting through window creating volumetric atmosphere"`,

          optimize_prompt: `# Prompt Optimization Analysis

${current_prompt ? `
## Your Current Prompt
\`\`\`
${current_prompt}
\`\`\`

## Analysis & Optimization

**Strengths Detected:**
${current_prompt.match(/\b(f\/\d\.?\d?|mm\s|lens|aperture|lighting|shot on)\b/gi) ? 
'✓ Contains technical camera specifications - good for photorealism' : 
'⚠ Missing technical specifications'}
${current_prompt.length > 50 ? 
'✓ Detailed prompt with good length' : 
'⚠ Prompt might be too brief for complex results'}
${current_prompt.match(/\b(cinematic|dramatic|moody|atmospheric)\b/gi) ? 
'✓ Includes mood/aesthetic keywords' : 
'⚠ Could benefit from mood descriptors'}

**Optimization Suggestions:**

1. **Structure:** Convert to framework format:
   - Medium/Format (what kind of image)
   - Subject + Action (who/what doing what)
   - Environment (where)
   - Lighting (how lit)
   - Technical (camera/lens)
   - Style (aesthetic mood)

2. **Specificity Upgrades:**
${current_prompt.match(/\b(beautiful|nice|good|amazing)\b/gi) ? 
'   • Replace vague adjectives ("beautiful") with specific descriptors' : ''}
${!current_prompt.match(/\b(f\/\d|mm|aperture)\b/gi) ? 
'   • Add camera specs: lens focal length, aperture value' : ''}
${!current_prompt.match(/\b(lighting|lit|illuminated|shadow)\b/gi) ? 
'   • Specify lighting type and direction' : ''}

3. **Enhanced Version:**
\`\`\`
[I can provide an optimized version - would you like me to rewrite it?]
\`\`\`

4. **Alternative Approaches:**
   • If aiming for photorealism → Add film stock, camera model
   • If aiming for illustration → Specify art medium, artist style
   • If aiming for cinematic → Add color grade, aspect ratio

**Next Steps:**
• Use \`gemini_prompt_assistant request_type="template"\` for structure
• Use \`desired_outcome="[specific goal]"\` for targeted improvements
` : `
## How to Use Prompt Optimization

**Include your current prompt:**
\`\`\`
gemini_prompt_assistant(
  request_type="optimize_prompt",
  current_prompt="Your current image prompt here",
  desired_outcome="What you're trying to achieve"
)
\`\`\`

**I will analyze and provide:**
• Structural improvements
• Specificity suggestions
• Technical additions
• Enhanced rewritten version
• Alternative approaches
`}`,

          troubleshoot: `# Troubleshooting Image Generation Issues

${current_prompt && desired_outcome ? `
## Analyzing Your Issue

**Your Prompt:** ${current_prompt}
**Desired Outcome:** ${desired_outcome}

## Common Problems & Solutions

**PROBLEM: Hands look distorted or have wrong number of fingers**
• Solution: Keep hands in simple, visible poses
• Avoid: Intertwined fingers, hidden hands, complex gestures
• Try: "Hands resting naturally at sides" or "Single hand visible holding object"

**PROBLEM: Face doesn't look realistic**
• Solution: Add specific facial feature details
• Avoid: Generic "beautiful face"
• Try: "Defined cheekbones, expressive brown eyes, subtle smile lines"

**PROBLEM: Lighting looks flat or wrong**
• Solution: Specify light source direction and quality
• Avoid: "Good lighting" or "well-lit"
• Try: "Soft window light from camera left creating gentle shadows on right side of face"

**PROBLEM: Colors look oversaturated or wrong**
• Solution: Specify color grade or film stock
• Avoid: "Vibrant colors" without context
• Try: "Muted desaturated palette" or "Kodak Portra 400 natural skin tones"

**PROBLEM: Composition is boring or generic**
• Solution: Specify angle, framing, rule of thirds
• Avoid: "Take a photo of"
• Try: "Low angle shot looking up at subject, rule of thirds composition"

**PROBLEM: Background is distracting or wrong**
• Solution: Control depth of field and background description
• Avoid: Not mentioning background
• Try: "Shot at f/1.8 creating blurry bokeh background" or "Against seamless white background"

**PROBLEM: Style is inconsistent or unexpected**
• Solution: Pick ONE clear style reference
• Avoid: Mixing too many styles
• Try: Choose either "film noir" OR "pastel Wes Anderson" not both

**PROBLEM: Text in image has typos or errors**
• Solution: Keep text short, use simple fonts, specify clearly
• Avoid: Long paragraphs of text
• Try: "Sign with text: 'OPEN' in bold red letters"

**PROBLEM: Getting illustration when you want photo**
• Solution: Add photorealistic keywords and camera specs
• Avoid: Art style keywords
• Try: "Hyper-realistic photography, shot on 85mm lens, Canon 5D"

**PROBLEM: Getting photo when you want illustration**
• Solution: Remove camera specs, add art medium
• Avoid: Technical photo terms
• Try: "Oil painting on canvas" or "Digital illustration, Procreate style"

## Your Specific Recommendations:

[Based on your inputs, I would provide targeted advice here]
` : `
## How to Use Troubleshooting

**Describe what's going wrong:**
\`\`\`
gemini_prompt_assistant(
  request_type="troubleshoot",
  current_prompt="Your prompt that's not working",
  desired_outcome="What you want instead"
)
\`\`\`

**I will diagnose and suggest:**
• Root cause of the problem
• Specific prompt modifications
• Alternative approaches
• Test variations to try
`}`
        };

        const content = guides[request_type];
        if (!content) {
          return {
            content: [{
              type: 'text',
              text: `Unknown request type: ${request_type}\n\nAvailable:\ntemplate, lighting_guide, color_guide, lens_guide, style_guide, optimize_prompt, troubleshoot`
            }]
          };
        }

        return {
          content: [{ type: 'text', text: content }]
        };
      }
    );

    // Register generate_video tool with UI viewer
    registerAppTool(
      this.server,
      'generate_video',
      {
        title: 'Generate Video',
        description: 'Generate videos using Google Veo 3.1 AI model. Creates realistic 4-8 second videos from text prompts with optional first-frame image and reference images for character/style consistency. Supports native audio generation. Processing time: 2-5 minutes for 1080p videos. Returns video file path with optional thumbnail and HTML preview player. ⚠️ IMPORTANT: Video generation is ASYNC and takes 2-5 minutes. The tool will poll for completion automatically.',
        inputSchema: {
          prompt: z.string().describe('Detailed description of the video to generate. Be specific about actions, camera movements, lighting, and style. Example: "A close-up shot of a futuristic coffee machine brewing a glowing blue espresso, with steam rising dramatically. Cinematic lighting, 4K quality."'),
          model: z.string().optional().default('veo-3.1-generate-preview').describe('Video generation model (default: veo-3.1-generate-preview)'),
          aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9').describe('Video aspect ratio: 16:9 (landscape) or 9:16 (portrait/vertical)'),
          resolution: z.enum(['720p', '1080p', '4k']).optional().default('1080p').describe('Video resolution. Higher resolutions take longer to generate and result in larger files.'),
          durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).optional().default(8).describe('Video duration in seconds (4, 6, or 8 seconds)'),
          generateAudio: z.boolean().optional().default(true).describe('Generate native synchronized audio effects and dialogue based on the prompt'),
          sampleCount: z.number().min(1).max(4).optional().default(1).describe('Number of video samples to generate (1-4). Each sample is a separate generation.'),
          seed: z.number().optional().describe('Optional seed for deterministic output. Use the same seed with the same prompt for consistent results.'),
          outputPath: z.string().optional().describe('Optional custom output path for the video file (e.g., C:/videos/output.mp4). If not provided, saves to default output directory with timestamped filename.'),
          generateThumbnail: z.boolean().optional().default(true).describe('Extract thumbnail from video (requires ffmpeg installed). Thumbnail is saved alongside video.'),
          generateHTMLPlayer: z.boolean().optional().default(true).describe('Generate interactive HTML video player with preview and download options')
        },
        _meta: {
          ui: {
            href: 'ui://gemini/video-viewer.html'
          }
        }
      },
      async ({ prompt, model, aspectRatio, resolution, durationSeconds, generateAudio, sampleCount, seed, outputPath, generateThumbnail, generateHTMLPlayer }) => {
        logger.info('Executing generate_video tool', {
          prompt: prompt.slice(0, 100),
          duration: durationSeconds || 8,
          resolution: resolution || '1080p'
        });

        const videoTool = new GenerateVideoTool(this.geminiService);
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
          generateHTMLPlayer
        });

        return {
          content,
          structuredContent: metadata
        };
      }
    );

    logger.info('Tools registered', {
      toolCount: 12,
      tools: [
        'gemini_chat', 'gemini_list_models', 'gemini_deep_research',
        'generate_image', 'edit_image', 'describe_image', 'analyze_image',
        'generate_video',
        'load_image_from_path', 'generate_landing_page', 'gemini_help',
        'gemini_prompt_assistant',
      ],
    });
  }

  async start(): Promise<void> {
    try {
      const isValid = await this.geminiService.validateConfig();
      if (!isValid) {
        throw new Error('Gemini API key validation failed');
      }

      logger.info('Starting Gemini MCP Server...');

      // Register tools and UI resources
      await this.registerTools();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('Gemini MCP Server started successfully', {
        transport: 'stdio',
        toolsAvailable: [
          'gemini_chat', 'gemini_list_models', 'gemini_deep_research',
          'generate_image', 'edit_image', 'describe_image', 'analyze_image',
          'generate_video',
          'load_image_from_path', 'generate_landing_page', 'gemini_help',
          'gemini_prompt_assistant',
        ],
      });

    } catch (error) {
      logger.error('Failed to start Gemini MCP Server', { error });
      process.exit(1);
    }
  }
}

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

async function main() {
  const server = new GeminiMcpServer();
  await server.start();
}

main().catch(error => {
  logger.error('Server startup failed', { error });
  process.exit(1);
});

export { GeminiMcpServer };
