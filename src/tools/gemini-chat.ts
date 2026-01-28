import { TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from '../services/gemini/index.js';
import { createToolResult, McpError } from '../utils/error-handler.js';
import logger from '../utils/logger.js';

export class GeminiChatTool {
  constructor(private geminiService: GeminiService) {}

  getDefinition(): Tool {
    return {
      name: 'gemini_chat',
      description: 'Chat with Google Gemini models',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to send'
          },
          model: {
            type: 'string',
            default: this.geminiService.getDefaultModel(),
            enum: this.geminiService.getAvailableModels(),
            description: 'Model to use (defaults to latest available)'
          },
          temperature: {
            type: 'number',
            default: 0.7,
            minimum: 0.0,
            maximum: 1.0,
            description: 'Controls randomness (0.0 to 1.0)'
          },
          max_tokens: {
            type: 'integer',
            default: 8192,
            minimum: 1,
            maximum: 32768,
            description: 'Maximum tokens in response'
          },
          system_prompt: {
            type: 'string',
            description: 'Optional system instruction'
          },
          grounding: {
            type: 'boolean',
            default: true,
            description: 'Enable Google Search grounding for real-time information'
          }
        },
        required: ['message']
      }
    };
  }

  async execute(args: any): Promise<TextContent[]> {
    try {
      logger.info('Executing gemini_chat tool', { 
        model: args.model,
        messageLength: args.message?.length 
      });

      if (!args.message) {
        throw new McpError('Message is required', 'INVALID_PARAMS');
      }

      const response = await this.geminiService.chat({
        message: args.message,
        model: args.model,
        temperature: args.temperature,
        maxTokens: args.max_tokens,
        systemPrompt: args.system_prompt,
        grounding: args.grounding
      });

      return createToolResult(true, response.content);

    } catch (error) {
      logger.error('gemini_chat tool execution failed', { error });
      
      if (error instanceof McpError) {
        return createToolResult(false, error.message, error);
      }
      
      return createToolResult(false, `Unexpected error: ${(error as Error).message}`, error as Error);
    }
  }
}
