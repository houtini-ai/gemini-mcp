#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

import { config, validateConfig } from './config/index.js';
import { GeminiService } from './services/gemini/index.js';
import { GeminiDeepResearchTool } from './tools/gemini-deep-research.js';
import logger from './utils/logger.js';
import { McpError, createToolResult } from './utils/error-handler.js';

class GeminiMcpServer {
  private server: McpServer;
  private geminiService: GeminiService;

  constructor() {
    try {
      validateConfig();
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      process.exit(1);
    }

    this.geminiService = new GeminiService(config.gemini);
    
    this.server = new McpServer({
      name: config.server.name,
      version: config.server.version,
    });

    this.registerTools();
    
    logger.info('Gemini MCP Server initialized', {
      serverName: config.server.name,
      version: config.server.version
    });
  }

  private registerTools(): void {
    // Register gemini_chat tool
    this.server.registerTool(
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
            .max(32768)
            .optional()
            .default(8192)
            .describe('Maximum tokens in response'),
          system_prompt: z.string()
            .optional()
            .describe('Optional system instruction'),
          grounding: z.boolean()
            .optional()
            .default(true)
            .describe('Enable Google Search grounding for real-time information')
        },
        outputSchema: {
          content: z.string(),
          success: z.boolean()
        }
      },
      async ({ message, model, temperature, max_tokens, system_prompt, grounding }) => {
        try {
          logger.info('Executing gemini_chat tool', { 
            model,
            messageLength: message?.length 
          });

          if (!message) {
            throw new McpError('Message is required', 'INVALID_PARAMS');
          }

          const response = await this.geminiService.chat({
            message,
            model,
            temperature,
            maxTokens: max_tokens,
            systemPrompt: system_prompt,
            grounding
          });

          return {
            content: createToolResult(true, response.content),
            structuredContent: { content: response.content, success: true }
          };

        } catch (error) {
          logger.error('gemini_chat tool execution failed', { error });
          
          const errorMessage = error instanceof McpError 
            ? error.message 
            : `Unexpected error: ${(error as Error).message}`;
          
          return {
            content: createToolResult(false, errorMessage, error as Error),
            structuredContent: { content: errorMessage, success: false }
          };
        }
      }
    );

    // Register gemini_list_models tool
    this.server.registerTool(
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

          const response = await this.geminiService.listModels();
          
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
          logger.error('gemini_list_models tool execution failed', { error });
          const errorMessage = `Error listing models: ${(error as Error).message}`;
          
          return {
            content: createToolResult(false, errorMessage, error as Error),
            structuredContent: { content: errorMessage, success: false }
          };
        }
      }
    );

    // Register gemini_deep_research tool
    this.server.registerTool(
      'gemini_deep_research',
      {
        title: 'Gemini Deep Research',
        description: 'Conduct deep research on complex topics using iterative multi-step analysis with Gemini. This performs multiple searches and synthesizes comprehensive research reports (takes several minutes). [MCP_RECOMMENDED_TIMEOUT_MS: 900000]',
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
            .describe('Number of research iterations (3-10, default 5). Environment guidance: Claude Desktop: use 3-4 (4-min timeout). Agent SDK/IDEs (VSCode, Cursor, Windsurf)/AI platforms (Cline, Roo-Cline): can use 7-10 (longer timeout tolerance)'),
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

          // Create instance and execute (business logic preserved)
          const deepResearchTool = new GeminiDeepResearchTool(this.geminiService);
          const result = await deepResearchTool.execute({
            research_question,
            model,
            max_iterations,
            focus_areas
          });

          // Result is already TextContent[] from execute method
          return {
            content: result,
            structuredContent: { 
              content: result[0]?.text || 'Research completed', 
              success: true 
            }
          };

        } catch (error) {
          logger.error('Deep research failed', { error });
          
          const errorMessage = error instanceof McpError
            ? error.message
            : `Deep research failed: ${(error as Error).message}`;
          
          return {
            content: createToolResult(false, errorMessage, error as Error),
            structuredContent: { content: errorMessage, success: false }
          };
        }
      }
    );

    logger.info('Tools registered', {
      toolCount: 3,
      tools: ['gemini_chat', 'gemini_list_models', 'gemini_deep_research']
    });
  }

  async start(): Promise<void> {
    try {
      const isValid = await this.geminiService.validateConfig();
      if (!isValid) {
        throw new Error('Gemini API key validation failed');
      }

      logger.info('Starting Gemini MCP Server...');

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('Gemini MCP Server started successfully', {
        transport: 'stdio',
        toolsAvailable: ['gemini_chat', 'gemini_list_models', 'gemini_deep_research']
      });

    } catch (error) {
      logger.error('Failed to start Gemini MCP Server', { error });
      process.exit(1);
    }
  }
}

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

async function main() {
  const server = new GeminiMcpServer();
  await server.start();
}

main().catch(error => {
  logger.error('Server startup failed', { error });
  process.exit(1);
});

export { GeminiMcpServer };
