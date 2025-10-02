import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from '../services/gemini';
import { createToolResult, McpError } from '../utils/error-handler';
import logger from '../utils/logger';
import { UsageMetadata } from '../services/gemini/types';

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
      description: 'Conduct deep research on complex topics using iterative multi-step analysis with Gemini. This performs multiple searches and synthesizes comprehensive research reports (takes several minutes).',
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
      report += '*This research involves multiple iterative searches and analysis steps. Please wait...*\n\n';

      const researchSteps: ResearchStep[] = [];
      let cumulativeTokens = 0;

      report += '### Step 1: Creating Research Plan\n\n';

      // IMPROVED: More explicit planning prompt that forces specific queries
      const planningPrompt = `You are a research assistant. Create a detailed research plan for this question: "${researchQuestion}"

${focusAreas.length > 0 ? `Focus specifically on these areas: ${focusAreas.join(', ')}` : ''}

Create EXACTLY ${maxIterations} specific, actionable research queries that will comprehensively answer this question.

CRITICAL REQUIREMENTS:
1. Each query must be self-contained and include the main topic explicitly
2. Each query must be specific enough to guide a Google Search  
3. Format as a numbered list: "1. [Your specific query here]"
4. Do NOT use vague phrases like "the topic", "this aspect", or "it" - always name the specific subject
5. Each query should be a complete question or statement that could stand alone

Example format for a question about "Impact of electric vehicles on oil industry":
1. What is the current global adoption rate of electric vehicles and projected growth through 2030?
2. How have major oil companies' stock prices and valuations changed since 2020 in response to EV adoption?
3. What strategic pivots are oil companies making to adapt to declining gasoline demand from EVs?

Now create ${maxIterations} research queries following this format for the question: "${researchQuestion}"`;

      let planResponse;
      try {
        planResponse = await this.geminiService.chat({
          message: planningPrompt,
          model: model,
          temperature: 0.7,
          maxTokens: 4096,
          grounding: false
        });

        if (planResponse.usageMetadata) {
          cumulativeTokens += planResponse.usageMetadata.totalTokenCount;
          logger.info('Planning phase tokens', {
            used: planResponse.usageMetadata.totalTokenCount,
            cumulative: cumulativeTokens
          });
        }
      } catch (error) {
        logger.error('Planning phase failed', { error });
        throw new McpError('Failed to create research plan. The question may be too complex. Try simplifying it.', 'RESEARCH_PLANNING_FAILED');
      }

      report += planResponse.content + '\n\n';
      
      // IMPROVED: Pass research question to extraction for better fallback
      const researchQueries = this.extractQueries(planResponse.content, maxIterations, researchQuestion);

      report += `### Step 2: Executing Research Queries\n\n`;
      report += `*Conducting ${researchQueries.length} research iterations...*\n\n`;

      let consecutiveFailures = 0;
      
      for (let i = 0; i < researchQueries.length; i++) {
        const query = researchQueries[i];
        
        if (cumulativeTokens >= researchBudget) {
          logger.warn('Approaching token budget, stopping research iterations', {
            cumulative: cumulativeTokens,
            budget: researchBudget
          });
          report += `\n*Note: Research stopped at iteration ${i + 1} due to token budget limits.*\n\n`;
          break;
        }

        logger.info(`Research iteration ${i + 1}/${researchQueries.length}`, { 
          query,
          tokensUsed: cumulativeTokens,
          budget: researchBudget
        });
        report += `#### Research Query ${i + 1}: ${query}\n\n`;

        const contextContent = this.buildSmartContext(researchSteps, researchBudget - cumulativeTokens);

        const searchPrompt = `Research this specific question: "${query}"

${contextContent ? `Context from previous research:\n${contextContent}` : ''}

Provide detailed, factual information with specific data points. Use Google Search grounding to find current information.`;

        let searchResponse;
        try {
          searchResponse = await this.geminiService.chat({
            message: searchPrompt,
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

          // IMPROVED: Validate that grounding actually occurred
          if (searchResponse.groundingMetadata) {
            const hasSearches = (searchResponse.groundingMetadata.webSearchQueries?.length ?? 0) > 0;
            const hasSupports = (searchResponse.groundingMetadata.groundingSupports?.length ?? 0) > 0;
            
            if (!hasSearches && !hasSupports) {
              logger.warn(`Iteration ${i + 1}: Grounding enabled but no searches performed`, {
                query,
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
              query,
              groundingRequested: true
            });
          }

          // IMPROVED: Check for generic failure responses
          const responsePreview = searchResponse.content.substring(0, 100).toLowerCase();
          if (responsePreview.includes('please specify') || 
              responsePreview.includes('i need to know') ||
              responsePreview.includes('clarify the topic')) {
            throw new Error('Query was too vague - received generic response requesting clarification');
          }

          consecutiveFailures = 0; // Reset on success
          
        } catch (error) {
          consecutiveFailures++;
          const errorMsg = (error as Error).message;
          
          logger.error(`Research iteration ${i + 1} failed`, { 
            error: errorMsg,
            query,
            consecutiveFailures
          });

          // IMPROVED: Fail fast if queries are systematically failing
          if (consecutiveFailures >= 2 && researchSteps.length === 0) {
            throw new McpError(
              `Multiple research queries failing consecutively. This usually means:\n` +
              `1. The queries are too vague (missing context about "${researchQuestion}")\n` +
              `2. Grounding/Google Search may not be available\n` +
              `3. The topic may need to be more specific\n\n` +
              `Last attempted query: "${query}"\n` +
              `Error: ${errorMsg}`,
              'RESEARCH_QUERIES_FAILING'
            );
          }

          report += `*Research query ${i + 1} failed: ${errorMsg}*\n\n`;
          continue;
        }

        const sources = this.extractSources(searchResponse.content);
        
        researchSteps.push({
          query,
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
          'All research iterations failed. Possible causes:\n' +
          '1. Research queries were too generic\n' +
          '2. Grounding/Google Search is not responding\n' +
          '3. Network or API issues\n\n' +
          'Try simplifying the question or checking your internet connection.',
          'ALL_ITERATIONS_FAILED'
        );
      }

      report += '### Step 3: Synthesizing Findings\n\n';

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

      const synthesisPrompt = `Based on all the research conducted, synthesize a comprehensive answer to the original question: "${researchQuestion}"

Research conducted:
${synthesisContext}

Create a comprehensive synthesis that:
1. Directly answers the research question
2. Integrates findings from all research queries
3. Highlights key insights and patterns
4. Notes any contradictions or gaps
5. Provides actionable conclusions

Be thorough and well-structured.`;

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
        logger.error('Synthesis phase failed', { error });
        report += '*Note: Synthesis phase encountered an error. Individual research findings are provided above.*\n\n';
        synthesisResponse = { content: 'Synthesis unavailable due to technical limitations. Please review the individual research findings above for insights.' };
      }

      report += synthesisResponse.content + '\n\n';

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

      report += `\n---\n\n*Research completed with ${researchSteps.length} successful iterations using ${model}*\n`;
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
      
      return createToolResult(
        false, 
        `Deep research failed: ${(error as Error).message}. Try reducing max_iterations or simplifying the question.`, 
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
      const stepSummary = `Query ${i + 1}: ${step.query}\nKey findings: ${step.response.substring(0, summaryLength)}${summaryLength < step.response.length ? '...' : ''}\n\n`;
      
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
      
      return `Research Query ${i + 1}: ${step.query}\nFindings: ${truncatedResponse}`;
    }).join('\n\n');
  }

  // IMPROVED: Pass research question for context-aware fallback queries
  private extractQueries(planText: string, maxQueries: number, researchQuestion: string): string[] {
    const queries: string[] = [];
    const lines = planText.split('\n');
    
    // Try multiple patterns to extract queries
    for (const line of lines) {
      // Pattern 1: Standard numbered list (1. query)
      let match = line.match(/^\d+\.\s*(.+?)(?:\s*[-:]\s*|$)/);
      
      // Pattern 2: Bold numbered list (**1. query**)
      if (!match) {
        match = line.match(/^\*\*\d+\.\s*(.+?)\*\*/);
      }
      
      // Pattern 3: Query within bold markdown (**Research Query: query**)
      if (!match) {
        match = line.match(/\*\*Research Query:\s*(.+?)\*\*/i);
      }
      
      if (match) {
        let query = match[1].trim();
        
        // Remove any trailing punctuation or markdown
        query = query.replace(/[*_]+$/, '').trim();
        
        // Clean up query - remove question marks at the end if very long
        if (query.length > 200) {
          const questionMark = query.lastIndexOf('?');
          if (questionMark > 50) {
            query = query.substring(0, questionMark + 1);
          }
        }
        
        if (query.length > 10 && query.length < 500) {
          queries.push(query);
        }
      }
    }
    
    // IMPROVED: Use context-aware fallback queries that include the research question
    if (queries.length === 0) {
      logger.warn('Failed to extract queries from plan, using context-aware fallback queries');
      
      const fallbackQueries = [
        `Provide comprehensive overview of: ${researchQuestion}`,
        `What are the key aspects and current trends related to: ${researchQuestion}`,
        `What are the recent developments and changes regarding: ${researchQuestion}`,
        `Compare different perspectives and approaches to: ${researchQuestion}`,
        `What are the conclusions and recommendations about: ${researchQuestion}`
      ];
      
      logger.info('Using fallback queries with context', {
        researchQuestion: researchQuestion.substring(0, 100),
        fallbackCount: fallbackQueries.length
      });
      
      return fallbackQueries.slice(0, maxQueries);
    }
    
    logger.info('Extracted queries from plan', { count: queries.length, queries });
    return queries.slice(0, maxQueries);
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
