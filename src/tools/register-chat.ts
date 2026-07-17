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
      description:
        'Chat with Google Gemini models. Default model: gemini-3.1-pro-preview. ' +
        '[MCP_RECOMMENDED_TIMEOUT_MS: 300000]',
      inputSchema: {
        message: z.string().describe('The message to send'),
        model: z.string()
          .optional()
          .describe(
            'Omit to use the configured default (gemini-3.1-pro-preview). ' +
            'Other valid options: gemini-3-pro-preview, gemini-3-flash-preview. ' +
            'Do NOT pass gemini-1.5-* or gemini-pro — those are out of support.'
          ),
        temperature: z.number()
          .min(0.0)
          .max(1.0)
          .optional()
          .default(0.7)
          .describe('Controls randomness (0.0 to 1.0). Ignored on Gemini 3+ (forced to 1.0 per Google docs).'),
        max_tokens: z.number()
          .int()
          .min(1)
          .max(65536)
          .optional()
          .default(65536)
          .describe(
            'Output token budget INCLUDING Gemini 3 thinking tokens. ' +
            'Leave unset — the default 65536 is correct for almost every call. ' +
            'Values below 4096 are IGNORED and the default applies: thinking consumes ' +
            'the whole budget and returns an empty response (finishReason=MAX_TOKENS).'
          ),
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

        // Floor tiny caller budgets — MCP clients habitually pass caps like 256
        // that thinking burns entirely, returning empty output. Below 4096 the
        // default budget applies instead.
        const effectiveMaxTokens = max_tokens !== undefined && max_tokens < 4096 ? 65536 : max_tokens;

        const response = await ctx.geminiService.chat({
          message,
          model,
          temperature,
          maxTokens: effectiveMaxTokens,
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
