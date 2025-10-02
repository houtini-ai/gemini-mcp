#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config, validateConfig } from './config';
import { GeminiService } from './services/gemini';
import { GeminiChatTool } from './tools/gemini-chat';
import { GeminiListModelsTool } from './tools/gemini-list-models';
import { GeminiDeepResearchTool } from './tools/gemini-deep-research';
import logger from './utils/logger';
import { handleError } from './utils/error-handler';

class GeminiMcpServer {
  private server: Server;
  private geminiService: GeminiService;
  private tools: Map<string, any>;

  constructor() {
    try {
      validateConfig();
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      process.exit(1);
    }

    this.geminiService = new GeminiService(config.gemini);
    
    this.server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map();
    this.initializeTools();
    this.setupHandlers();
    
    logger.info('Gemini MCP Server initialized', {
      serverName: config.server.name,
      version: config.server.version
    });
  }

  private initializeTools(): void {
    const geminiChatTool = new GeminiChatTool(this.geminiService);
    const geminiListModelsTool = new GeminiListModelsTool(this.geminiService);
    const geminiDeepResearchTool = new GeminiDeepResearchTool(this.geminiService);

    this.tools.set('gemini_chat', geminiChatTool);
    this.tools.set('gemini_list_models', geminiListModelsTool);
    this.tools.set('gemini_deep_research', geminiDeepResearchTool);

    logger.info('Tools initialized', {
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys())
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Handling list_tools request');
      
      const tools = Array.from(this.tools.values()).map(tool => tool.getDefinition());
      
      return {
        tools
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Handling call_tool request', { 
        toolName: name,
        hasArgs: !!args 
      });

      try {
        const tool = this.tools.get(name);
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const result = await tool.execute(args);
        
        return {
          content: result
        };

      } catch (error) {
        logger.error('Tool execution failed', { 
          toolName: name,
          error: (error as Error).message
        });

        const mcpError = handleError(error as Error, `tool:${name}`);
        
        return {
          content: [
            {
              type: 'text',
              text: mcpError.message
            }
          ],
          isError: true
        };
      }
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
        toolsAvailable: Array.from(this.tools.keys())
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

if (require.main === module) {
  main().catch(error => {
    logger.error('Server startup failed', { error });
    process.exit(1);
  });
}

export { GeminiMcpServer };
