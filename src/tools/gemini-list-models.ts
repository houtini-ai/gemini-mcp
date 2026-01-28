import { TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from '../services/gemini/index.js';
import { createToolResult } from '../utils/error-handler.js';
import logger from '../utils/logger.js';

export class GeminiListModelsTool {
  constructor(private geminiService: GeminiService) {}

  getDefinition(): Tool {
    return {
      name: 'gemini_list_models',
      description: 'List available Gemini models and their descriptions',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    };
  }

  async execute(): Promise<TextContent[]> {
    try {
      logger.info('Executing gemini_list_models tool');

      const response = await this.geminiService.listModels();
      
      let modelsInfo = 'Available Gemini Models:\n\n';
      
      for (const model of response.models) {
        modelsInfo += `• **${model.name}**: ${model.description}\n`;
      }
      
      modelsInfo += `\nLast updated: ${response.timestamp}`;

      return createToolResult(true, modelsInfo);

    } catch (error) {
      logger.error('gemini_list_models tool execution failed', { error });
      return createToolResult(false, `Error listing models: ${(error as Error).message}`, error as Error);
    }
  }
}
