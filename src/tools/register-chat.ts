import * as z from 'zod';
import logger from '../utils/logger.js';
import { createToolResult } from '../utils/error-handler.js';
import { toolError } from '../utils/tool-wrapper.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
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
          messageLength: message.length
        });

        const response = await ctx.geminiService.chat({
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
        return toolError('gemini_chat', error);
      }
    }
  );
}
