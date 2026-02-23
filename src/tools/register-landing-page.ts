import * as z from 'zod';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import logger from '../utils/logger.js';
import { McpError, createToolResult } from '../utils/error-handler.js';
import { savedFileMessage } from '../utils/tool-wrapper.js';
import { GenerateLandingPageTool } from './generate-landing-page.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  const landingPageTool = new GenerateLandingPageTool(ctx.geminiService);

  registerAppTool(
    ctx.server,
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
        ui: { resourceUri: 'ui://gemini/landing-page-viewer.html' }
      }
    },
    async ({ brief, companyName, primaryColour, style, sections, model, outputPath }) => {
      try {
        logger.info('Executing generate_landing_page tool', { style, model });

        const html = await landingPageTool.execute({
          brief,
          companyName,
          primaryColour,
          style,
          sections,
          model,
        });

        const absolutePath = outputPath
          ? resolve(outputPath)
          : resolve(ctx.outputDir, `gemini-landing-${Date.now()}.html`);

        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, html, 'utf-8');

        logger.info('Landing page saved successfully', { savedPath: absolutePath });

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
              text: `${savedFileMessage('Landing page saved', absolutePath)}\n\nOpen this file in your browser to view the landing page.`
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
}
