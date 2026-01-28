import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from '../services/gemini/index.js';
import { createToolResult, McpError } from '../utils/error-handler.js';
import logger from '../utils/logger.js';
import { UsageMetadata } from '../services/gemini/types.js';

interface ResearchStep {
  query: string;
  response: string;
  sources: string[];
  usageMetadata: UsageMetadata;
}

export class GeminiDeepResearchTool {
  constructor(private geminiService: GeminiService) {}

  getDefinition(): Tool {
    return {
      name: 'gemini_deep_research',
      description: 'Conduct deep research on complex topics using iterative multi-step analysis with Gemini. This performs multiple searches and synthesizes comprehensive research reports (takes several minutes). [MCP_RECOMMENDED_TIMEOUT_MS: 900000]',
      inputSchema: {
        type: 'object',
        properties: {
          research_question: {
            type: 'string',
            description: 'The complex research question or topic to investigate deeply'
          },
          model: {
            type: 'string',
            default: this.geminiService.getDefaultModel(),
            enum: this.geminiService.getAvailableModels(),
            description: 'Model to use for deep research (defaults to latest available)'
          },
          max_iterations: {
            type: 'integer',
            default: 5,
            minimum: 3,
            maximum: 10,
            description: 'Number of research iterations (3-10, default 5). Environment guidance: Claude Desktop: use 3-4 (4-min timeout). Agent SDK/IDEs (VSCode, Cursor, Windsurf)/AI platforms (Cline, Roo-Cline): can use 7-10 (longer timeout tolerance)'
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: specific areas to focus the research on'
          }
        },
        required: ['research_question']
      }
    };
  }

  async execute(args: any): Promise<TextContent[]> {
    try {
      logger.info('Starting deep research', { 
        question: args.research_question,
        maxIterations: args.max_iterations || 5
      });

      const researchQuestion = args.research_question;
      const maxIterations = Math.min(args.max_iterations || 5, 10);
      const model = args.model || this.geminiService.getDefaultModel();
      const focusAreas: string[] = args.focus_areas || [];

      const modelContextWindow = this.geminiService.getModelContextWindow(model);
      const synthesisReserve = Math.floor(modelContextWindow * 0.20);
      const researchBudget = Math.floor(modelContextWindow * 0.75);
      
      logger.info('Token budget allocation', {
        model,
        contextWindow: modelContextWindow,
        researchBudget,
        synthesisReserve,
        buffer: modelContextWindow - researchBudget - synthesisReserve
      });

      let report = '# Deep Research Report\n\n';
      report += `## Research Question\n${researchQuestion}\n\n`;
      
      if (focusAreas.length > 0) {
        report += `## Focus Areas\n${focusAreas.map((area: string) => `- ${area}`).join('\n')}\n\n`;
      }

      report += '## Research Process\n\n';
      report += `*Conducting ${maxIterations} research iteration${maxIterations > 1 ? 's' : ''} with Google Search grounding...*\n\n`;

      const researchSteps: ResearchStep[] = [];
      let cumulativeTokens = 0;
      let consecutiveFailures = 0;
      
      // Direct research iterations - just pass the question to Gemini with grounding
      for (let i = 0; i < maxIterations; i++) {
        if (cumulativeTokens >= researchBudget) {
          logger.warn('Approaching token budget, stopping research iterations', {
            cumulative: cumulativeTokens,
            budget: researchBudget
          });
          report += `\n*Note: Research stopped at iteration ${i + 1} due to token budget limits.*\n\n`;
          break;
        }

        logger.info(`Research iteration ${i + 1}/${maxIterations}`, { 
          tokensUsed: cumulativeTokens,
          budget: researchBudget
        });

        // Build the research prompt - either focused on a specific area or the full question
        let iterationPrompt = researchQuestion;
        if (focusAreas.length > 0 && i < focusAreas.length) {
          iterationPrompt = `${researchQuestion}\n\nFocus specifically on: ${focusAreas[i]}`;
          report += `### Iteration ${i + 1}: ${focusAreas[i]}\n\n`;
        } else {
          report += `### Iteration ${i + 1}\n\n`;
        }

        // Include context from previous research if available
        const contextContent = this.buildSmartContext(researchSteps, researchBudget - cumulativeTokens);
        if (contextContent && i > 0) {
          iterationPrompt += `\n\nContext from previous research:\n${contextContent}`;
        }

        let searchResponse;
        try {
          searchResponse = await this.geminiService.chat({
            message: iterationPrompt,
            model: model,
            temperature: 0.5,
            maxTokens: 8192,
            grounding: true
          });

          if (searchResponse.usageMetadata) {
            cumulativeTokens += searchResponse.usageMetadata.totalTokenCount;
            
            logger.info(`Iteration ${i + 1} token usage`, {
              iteration: searchResponse.usageMetadata.totalTokenCount,
              cumulative: cumulativeTokens,
              remaining: researchBudget - cumulativeTokens
            });
          }

          // Validate that grounding actually occurred
          if (searchResponse.groundingMetadata) {
            const hasSearches = (searchResponse.groundingMetadata.webSearchQueries?.length ?? 0) > 0;
            const hasSupports = (searchResponse.groundingMetadata.groundingSupports?.length ?? 0) > 0;
            
            if (!hasSearches && !hasSupports) {
              logger.warn(`Iteration ${i + 1}: Grounding enabled but no searches performed`, {
                responsePreview: searchResponse.content.substring(0, 200)
              });
            } else {
              logger.info(`Iteration ${i + 1}: Grounding successful`, {
                searchQueries: searchResponse.groundingMetadata.webSearchQueries?.length || 0,
                supports: searchResponse.groundingMetadata.groundingSupports?.length || 0
              });
            }
          } else {
            logger.warn(`Iteration ${i + 1}: No grounding metadata returned`, {
              groundingRequested: true
            });
          }

          consecutiveFailures = 0; // Reset on success
          
        } catch (error) {
          consecutiveFailures++;
          const errorMessage = (error as Error).message || 'Unknown error';
          
          logger.error(`Research iteration ${i + 1} failed`, { 
            error: errorMessage,
            consecutiveFailures
          });

          // Fail fast if queries are systematically failing
          if (consecutiveFailures >= 2 && researchSteps.length === 0) {
            throw new McpError(
              `Multiple research iterations failing consecutively.\n\n` +
              `Error: ${errorMessage}\n\n` +
              `This usually means:\n` +
              `1. The question may be too broad or ambiguous\n` +
              `2. API rate limits or quota exceeded\n` +
              `3. Content filtering or safety blocks\n` +
              `4. Network or connectivity issues\n\n` +
              `Try:\n` +
              `- Breaking the question into smaller, more specific queries\n` +
              `- Checking your API quota and rate limits\n` +
              `- Simplifying the research question\n` +
              `- Waiting a few moments before retrying`,
              'RESEARCH_ITERATIONS_FAILING'
            );
          }

          report += `*Iteration ${i + 1} failed: ${errorMessage}*\n\n`;
          continue;
        }

        const sources = this.extractSources(searchResponse.content);
        
        researchSteps.push({
          query: iterationPrompt,
          response: searchResponse.content,
          sources,
          usageMetadata: searchResponse.usageMetadata || {
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            totalTokenCount: 0
          }
        });

        report += searchResponse.content + '\n\n';
      }

      if (researchSteps.length === 0) {
        throw new McpError(
          'All research iterations failed.\n\n' +
          'Possible causes:\n' +
          '1. The question format may not be suitable for research\n' +
          '2. Google Search grounding is not responding\n' +
          '3. API rate limits or quota exceeded\n' +
          '4. Network or connectivity issues\n\n' +
          'Try:\n' +
          '- Rephrasing the question more clearly\n' +
          '- Reducing max_iterations to 3\n' +
          '- Checking your internet connection and API status\n' +
          '- Waiting a few minutes before retrying',
          'ALL_ITERATIONS_FAILED'
        );
      }

      // Optional synthesis if we have multiple iterations
      if (researchSteps.length > 1) {
        report += '### Synthesis\n\n';

        const availableForSynthesis = Math.min(
          synthesisReserve,
          modelContextWindow - cumulativeTokens - 10000
        );

        logger.info('Synthesis phase', {
          tokensUsed: cumulativeTokens,
          synthesisReserve,
          availableForSynthesis,
          researchStepsCompleted: researchSteps.length
        });

        const synthesisContext = this.buildSynthesisContext(researchSteps, availableForSynthesis);

        const synthesisPrompt = `Based on the research conducted, provide a comprehensive synthesis answering: "${researchQuestion}"

Research findings:
${synthesisContext}

Create a synthesis that:
1. Directly answers the research question
2. Integrates findings from all iterations
3. Highlights key insights and patterns
4. Notes any contradictions or gaps
5. Provides actionable conclusions`;

        let synthesisResponse;
        try {
          synthesisResponse = await this.geminiService.chat({
            message: synthesisPrompt,
            model: model,
            temperature: 0.6,
            maxTokens: 16384,
            grounding: false
          });

          if (synthesisResponse.usageMetadata) {
            cumulativeTokens += synthesisResponse.usageMetadata.totalTokenCount;
            logger.info('Synthesis tokens', {
              used: synthesisResponse.usageMetadata.totalTokenCount,
              total: cumulativeTokens
            });
          }
        } catch (error) {
          const errorMessage = (error as Error).message || 'Unknown error';
          logger.error('Synthesis phase failed', { error: errorMessage });
          report += `*Note: Synthesis phase encountered an error (${errorMessage}). Individual research findings are provided above.*\n\n`;
          synthesisResponse = { content: 'Synthesis unavailable. Please review the individual research findings above.' };
        }

        report += synthesisResponse.content + '\n\n';
      }

      report += '### Sources Consulted\n\n';
      const allSources = new Set<string>();
      researchSteps.forEach(step => {
        step.sources.forEach(source => allSources.add(source));
      });

      if (allSources.size > 0) {
        Array.from(allSources).forEach((source, i) => {
          report += `${i + 1}. ${source}\n`;
        });
      } else {
        report += '*Note: No external sources were cited. This may indicate grounding did not function properly.*\n';
      }

      report += `\n---\n\n*Research completed with ${researchSteps.length} successful iteration${researchSteps.length > 1 ? 's' : ''} using ${model}*\n`;
      report += `*Total tokens used: ${cumulativeTokens.toLocaleString()} / ${modelContextWindow.toLocaleString()} available*\n`;
      report += `*Context window utilization: ${((cumulativeTokens / modelContextWindow) * 100).toFixed(1)}%*\n`;

      logger.info('Deep research completed successfully', { 
        iterations: researchSteps.length,
        totalSources: allSources.size,
        totalTokens: cumulativeTokens,
        contextWindow: modelContextWindow,
        utilization: ((cumulativeTokens / modelContextWindow) * 100).toFixed(1) + '%'
      });

      return createToolResult(true, report);

    } catch (error) {
      logger.error('Deep research failed', { error });
      
      if (error instanceof McpError) {
        return createToolResult(false, error.message, error);
      }
      
      const errorMessage = (error as Error).message || 'Unknown error';
      return createToolResult(
        false, 
        `Deep research failed: ${errorMessage}\n\n` +
        `Try:\n` +
        `- Simplifying or rephrasing the question\n` +
        `- Reducing max_iterations\n` +
        `- Breaking it into smaller, more focused queries`, 
        error as Error
      );
    }
  }

  private buildSmartContext(steps: ResearchStep[], maxTokens: number): string {
    if (steps.length === 0) return '';

    const ESTIMATED_CHARS_PER_TOKEN = 4;
    const maxChars = maxTokens * ESTIMATED_CHARS_PER_TOKEN * 0.8;
    let context = '';
    let currentLength = 0;

    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      const summaryLength = Math.min(1000, step.response.length);
      const stepSummary = `Previous finding ${i + 1}: ${step.response.substring(0, summaryLength)}${summaryLength < step.response.length ? '...' : ''}\n\n`;
      
      if (currentLength + stepSummary.length > maxChars) {
        logger.info('Context budget reached, including most recent research only', {
          includedSteps: steps.length - i,
          totalSteps: steps.length
        });
        break;
      }

      context = stepSummary + context;
      currentLength += stepSummary.length;
    }

    return context;
  }

  private buildSynthesisContext(steps: ResearchStep[], maxTokens: number): string {
    const ESTIMATED_CHARS_PER_TOKEN = 4;
    const maxCharsPerStep = Math.floor((maxTokens * ESTIMATED_CHARS_PER_TOKEN) / steps.length);

    return steps.map((step, i) => {
      const truncatedResponse = step.response.length > maxCharsPerStep
        ? step.response.substring(0, maxCharsPerStep) + '...'
        : step.response;
      
      return `Research Iteration ${i + 1}:\n${truncatedResponse}`;
    }).join('\n\n');
  }

  private extractSources(content: string): string[] {
    const sources: string[] = [];
    const urlRegex = /https?:\/\/[^\s)]+/g;
    const matches = content.match(urlRegex);
    
    if (matches) {
      matches.forEach(url => {
        const cleanUrl = url.replace(/[.,;:]+$/, '');
        if (cleanUrl.length > 10) {
          sources.push(cleanUrl);
        }
      });
    }
    
    return [...new Set(sources)];
  }
}
