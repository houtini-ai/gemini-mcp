#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE
} from '@modelcontextprotocol/ext-apps/server';
import * as z from 'zod';

import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname, resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';

import { config, validateConfig } from './config/index.js';
import { GeminiService } from './services/gemini/index.js';
import { GeminiImageService } from './services/gemini/image-service.js';
import { GeminiDeepResearchTool } from './tools/gemini-deep-research.js';
import { GenerateLandingPageTool } from './tools/generate-landing-page.js';
import { loadImageFromPath } from './tools/load-image-from-path.js';
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
          <div class="metadata-value">${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
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

  constructor() {
    try {
      validateConfig();
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      process.exit(1);
    }

    this.geminiService = new GeminiService(config.gemini);
    this.imageService = new GeminiImageService(config.gemini);
    this.landingPageTool = new GenerateLandingPageTool(this.geminiService);
    
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

    // Image input schema shared across image tools.
    // thoughtSignature is optional but required for conversational editing
    // with gemini-3-pro-image-preview — pass signatures returned by a previous
    // generate_image or edit_image call to maintain visual context between turns.
    const imageInputSchema = z.object({
      data: z.string().describe('Base64 encoded image data'),
      mimeType: z.string().describe('MIME type of the image (e.g., image/png, image/jpeg)'),
      thoughtSignature: z.string().optional().describe(
        'Thought signature from a previous generate_image or edit_image response. ' +
        'Required for conversational editing with gemini-3-pro-image-preview.'
      ),
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
      async ({ prompt, model, aspectRatio, imageSize, images, outputPath }) => {
        try {
          logger.info('Executing generate_image tool', { model, promptLength: prompt.length });

          const result = await this.imageService.generateImage({
            prompt, model, aspectRatio, imageSize,
            images: images as { data: string; mimeType: string; thoughtSignature?: string }[],
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

          // Return for MCP Apps with structuredContent for inline preview
          return {
            structuredContent: {
              base64Data: previewImageData || '',
              mimeType: 'image/jpeg',
              savedPath,
              previewPath,
              description: result.description,
              prompt
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
      async ({ prompt, images, model, outputPath }) => {
        try {
          logger.info('Executing edit_image tool', { model, imageCount: images.length });

          const result = await this.imageService.generateImage({
            prompt, model,
            images: images as { data: string; mimeType: string; thoughtSignature?: string }[],
          });

          const firstImage = result.parts.find(p => p.type === 'image' && p.base64Data);

          // ALWAYS save to disk - use explicit outputPath, env var, or default directory
          const outputDir = config.server.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
          const resolvedSavePath = outputPath
            ? resolve(outputPath)
            : resolve(outputDir, `gemini-edit-${Date.now()}.png`);

          let savedPath: string | undefined;
          let previewPath: string | undefined;
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

          // Return for MCP Apps with structuredContent for inline preview
          return {
            structuredContent: {
              base64Data: previewImageData || '',
              mimeType: 'image/jpeg',
              savedPath,
              previewPath,
              description: result.description,
              prompt: `[EDIT] ${prompt}`
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
        },
        outputSchema: {
          content: z.string(),
          success: z.boolean(),
        },
      },
      async ({ images, prompt, model }) => {
        try {
          logger.info('Executing describe_image tool', { model, imageCount: images.length });

          const description = await this.imageService.describeImage({
            images: images as { data: string; mimeType: string }[],
            prompt, model,
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
            .describe('Maximum tokens in response (default 16384, up to 64K output limit)')
        },
        outputSchema: {
          content: z.string(),
          success: z.boolean()
        }
      },
      async ({ images, prompt, model, max_tokens }) => {
        try {
          logger.info('Executing analyze_image tool', { model, imageCount: images.length });

          const result = await this.geminiService.analyzeImages({
            images: images as { data: string; mimeType: string }[],
            prompt,
            model: model || 'gemini-3-pro-preview',
            maxTokens: max_tokens
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

    // Register generate_landing_page tool
    this.server.registerTool(
      'generate_landing_page',
      {
        title: 'Generate Landing Page',
        description:
          'Generate a complete, self-contained HTML landing page using Gemini. ' +
          'Returns raw HTML as a string — use Desktop Commander write_file to save it. ' +
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
        outputSchema: {
          content: z.string(),
          success: z.boolean(),
        },
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

          if (outputPath) {
            const absolutePath = resolve(outputPath);
            await mkdir(dirname(absolutePath), { recursive: true });
            await writeFile(absolutePath, html, 'utf-8');
            const msg = `Landing page saved to: ${absolutePath}\n\n${html}`;
            return {
              content: createToolResult(true, msg),
              structuredContent: { content: msg, success: true },
            };
          }

          return {
            content: createToolResult(true, html),
            structuredContent: { content: html, success: true },
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

    logger.info('Tools registered', {
      toolCount: 9,
      tools: [
        'gemini_chat', 'gemini_list_models', 'gemini_deep_research',
        'generate_image', 'edit_image', 'describe_image', 'analyze_image',
        'load_image_from_path', 'generate_landing_page',
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
          'load_image_from_path', 'generate_landing_page',
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
