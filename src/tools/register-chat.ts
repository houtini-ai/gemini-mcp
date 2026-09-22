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
      // The essentials live HERE, not only in the per-parameter descriptions.
      // Some clients drop parameter descriptions when they present tools to the
      // model - the tool description survives - so anything a caller must not
      // get wrong has to be in this string or it may never be read. The
      // max_tokens line is the one that matters: a small cap is spent on Gemini
      // 3 thinking before any visible output, and the empty result reads as a
      // timeout rather than as the cap it actually is.
      description:
        'Chat with Google Gemini models. Grounded in Google Search by default, ' +
        'on gemini-3.1-pro-preview. ' +
        'DO NOT SET max_tokens - the server allocates the model\'s full output ' +
        'ceiling automatically. It is a cap, not consumption, so unused headroom ' +
        'costs nothing; setting a small one makes Gemini 3 thinking burn the whole ' +
        'budget and return empty output that looks like a timeout. ' +
        '[MCP_RECOMMENDED_TIMEOUT_MS: 300000]',
      inputSchema: {
        message: z.string().describe('The message to send'),
        model: z.string()
          .optional()
          .describe(
            'Omit to use the configured default (gemini-3.1-pro-preview). ' +
            'Other valid options: gemini-3.8-flash (GA, fast), gemini-3.5-flash, gemini-3-pro-preview, gemini-3-flash-preview. ' +
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
          .optional()
          .describe(
            'Output token budget INCLUDING Gemini 3 thinking tokens. ' +
            'OMIT THIS — the server allocates the model\'s full output ceiling ' +
            '(queried live, 65,536 on current Gemini 3 text models). It is a cap, ' +
            'not consumption — unused headroom costs nothing. Values below 4096 are ' +
            'IGNORED (thinking burns them before any visible output) and values above ' +
            'the model\'s real limit are clamped to it.'
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
        // that thinking burns entirely, returning empty output. Below 4096 we
        // drop the cap so the service resolves the model's full headroom.
        const effectiveMaxTokens = max_tokens !== undefined && max_tokens < 4096 ? undefined : max_tokens;

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
