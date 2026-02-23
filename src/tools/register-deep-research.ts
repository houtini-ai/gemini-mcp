import * as z from 'zod';
import logger from '../utils/logger.js';
import { toolError } from '../utils/tool-wrapper.js';
import { GeminiDeepResearchTool } from './gemini-deep-research.js';
import type { ToolContext } from './types.js';

export function register(ctx: ToolContext): void {
  ctx.server.registerTool(
    'gemini_deep_research',
    {
      title: 'Gemini Deep Research',
      description:
        'Conduct deep research on complex topics using iterative multi-step analysis with Gemini. ' +
        'This performs multiple searches and synthesizes comprehensive research reports (takes several minutes). ' +
        '[MCP_RECOMMENDED_TIMEOUT_MS: 900000]',
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
          .describe(
            'Number of research iterations (3-10, default 5). Environment guidance: ' +
            'Claude Desktop: use 3-4 (4-min timeout). ' +
            'Agent SDK/IDEs (VSCode, Cursor, Windsurf)/AI platforms (Cline, Roo-Cline): can use 7-10 (longer timeout tolerance)'
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
          maxIterations: max_iterations || 5
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
