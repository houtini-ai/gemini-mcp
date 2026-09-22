import * as z from 'zod';
import logger from '../utils/logger.js';
import { toolError } from '../utils/tool-wrapper.js';
import { GeminiDeepResearchTool, DEFAULT_ITERATIONS } from './gemini-deep-research.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
    'gemini_deep_research',
    {
      title: 'Gemini Deep Research',
      description:
        'Conduct deep research on complex topics using iterative multi-step analysis with Gemini. ' +
        'Runs grounded search passes on a fast model, then synthesises them with Gemini 3.1 Pro. ' +
        'Default 2 passes (2-3 minutes); more passes take proportionally longer. ' +
        '[MCP_RECOMMENDED_TIMEOUT_MS: 900000]',
      inputSchema: {
        research_question: z.string().describe('The complex research question or topic to investigate deeply'),
        model: z.string()
          .optional()
          .describe(
            'Omit to use the defaults: gemini-3.8-flash for the search passes, gemini-3.1-pro-preview for synthesis. ' +
            'Setting this uses one model for both.'
          ),
        max_iterations: z.number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(DEFAULT_ITERATIONS)
          .describe(
            'Number of grounded search passes (1-10, default 2). A synthesis step runs after 2+. ' +
            'Claude Desktop: 2-3 fits its 4-minute timeout. ' +
            'Agent SDK / IDEs (VS Code, Cursor, Windsurf) / Cline: 5-7 for deeper coverage.'
          ),
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
          maxIterations: max_iterations || DEFAULT_ITERATIONS
        });

        const deepResearchTool = new GeminiDeepResearchTool(ctx.geminiService);
        const result = await deepResearchTool.execute({
          research_question,
          model,
          max_iterations,
          focus_areas
        });

        return {
          content: result,
          structuredContent: {
            content: result[0]?.text || 'Research completed',
            success: true
          }
        };
      } catch (error) {
        return toolError('gemini_deep_research', error);
      }
    }
  );
}
