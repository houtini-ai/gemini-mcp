import * as z from 'zod';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import logger from '../utils/logger.js';
import { McpError, createToolResult } from '../utils/error-handler.js';
import { savedFileMessage } from '../utils/tool-wrapper.js';
import { GenerateSVGTool } from './generate-svg.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  const svgTool = new GenerateSVGTool(ctx.geminiService);

  registerAppTool(
    ctx.server,
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
        ui: { resourceUri: 'ui://gemini/svg-viewer.html' }
      }
    },
    async ({ prompt, width, height, style, model, outputPath }) => {
      try {
        logger.info('Executing generate_svg tool', { style, dimensions: `${width}x${height}`, model });

        const svgContent = await svgTool.execute({
          prompt,
          width,
          height,
          style,
          model,
        });

        const absolutePath = outputPath
          ? resolve(outputPath)
          : resolve(ctx.outputDir, `gemini-${Date.now()}.svg`);

        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, svgContent, 'utf-8');

        logger.info('SVG saved successfully', { savedPath: absolutePath });

        return {
          structuredContent: {
            svgContent,
            mimeType: 'image/svg+xml',
            savedPath: absolutePath,
            description: `${style} style SVG graphic (${width}x${height})`,
            prompt
          },
          content: [
            {
              type: 'text' as const,
              text: savedFileMessage('SVG saved', absolutePath)
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
}
