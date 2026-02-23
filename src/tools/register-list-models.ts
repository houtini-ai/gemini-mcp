import * as z from 'zod';
import logger from '../utils/logger.js';
import { createToolResult } from '../utils/error-handler.js';
import { toolError } from '../utils/tool-wrapper.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
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

        const response = await ctx.geminiService.listModels();

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
        return toolError('gemini_list_models', error);
      }
    }
  );
}
