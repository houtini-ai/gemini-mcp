#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { config, validateConfig } from './config/index.js';
import { GeminiService } from './services/gemini/index.js';
import { GeminiImageService } from './services/gemini/image-service.js';
import { MediaServer } from './services/media-server.js';
import logger from './utils/logger.js';

import { registerViewers } from './tools/register-viewers.js';
import { registerGeminiHelp } from './tools/gemini-help.js';
import { registerPromptAssistant } from './tools/image-prompt-assistant.js';
import { register as registerChat } from './tools/register-chat.js';
import { register as registerListModels } from './tools/register-list-models.js';
import { register as registerDeepResearch } from './tools/register-deep-research.js';
import { register as registerDescribeImage } from './tools/register-describe-image.js';
import { register as registerAnalyzeImage } from './tools/register-analyze-image.js';
import { register as registerLoadImage } from './tools/register-load-image.js';
import { register as registerImageGen } from './tools/register-image-gen.js';
import { register as registerLandingPage } from './tools/register-landing-page.js';
import { register as registerSvg } from './tools/register-svg.js';
import { register as registerVideo } from './tools/register-video.js';

import type { ToolContext } from './tools/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_IMAGE_OUTPUT_DIR = resolve(__dirname, '..', 'output');

const TOOL_NAMES = [
  'gemini_chat', 'gemini_list_models', 'gemini_deep_research',
  'generate_image', 'edit_image', 'describe_image', 'analyze_image',
  'generate_video',
  'load_image_from_path', 'generate_landing_page', 'generate_svg',
  'gemini_help', 'gemini_prompt_assistant',
] as const;

class GeminiMcpServer {
  private server: McpServer;
  private geminiService: GeminiService;
  private mediaServer: MediaServer;
  private outputDir: string;

  constructor() {
    try {
      validateConfig();
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      process.exit(1);
    }

    this.geminiService = new GeminiService(config.gemini, config.server.imageOutputDir);
    this.outputDir = config.server.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
    this.mediaServer = new MediaServer(this.outputDir);

    this.server = new McpServer({
      name: config.server.name,
      version: config.server.version,
    });

    logger.info('Gemini MCP Server initialized', {
      serverName: config.server.name,
      version: config.server.version,
    });
  }

  async start(): Promise<void> {
    try {
      const isValid = await this.geminiService.validateConfig();
      if (!isValid) {
        throw new Error('Gemini API key validation failed');
      }

      logger.info('Starting Gemini MCP Server...');

      await this.mediaServer.start();

      const ctx: ToolContext = {
        server: this.server,
        geminiService: this.geminiService,
        imageService: new GeminiImageService(config.gemini),
        outputDir: this.outputDir,
        mediaServer: this.mediaServer,
      };

      await registerViewers(this.server, __dirname, this.mediaServer.getPort());
      registerGeminiHelp(this.server);
      registerPromptAssistant(this.server);
      registerChat(ctx);
      registerListModels(ctx);
      registerDeepResearch(ctx);
      registerDescribeImage(ctx);
      registerAnalyzeImage(ctx);
      registerLoadImage(ctx);
      registerImageGen(ctx);
      registerLandingPage(ctx);
      registerSvg(ctx);
      registerVideo(ctx);

      logger.info('Tools registered', {
        toolCount: TOOL_NAMES.length,
        tools: [...TOOL_NAMES],
      });

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('Gemini MCP Server started successfully', {
        transport: 'stdio',
        toolsAvailable: [...TOOL_NAMES],
        mediaServerPort: this.mediaServer.getPort(),
      });
    } catch (error) {
      logger.error('Failed to start Gemini MCP Server', { error });
      process.exit(1);
    }
  }

  shutdown(): void {
    this.mediaServer.stop();
  }
}

let serverInstance: GeminiMcpServer | null = null;

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  serverInstance?.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  serverInstance?.shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  serverInstance?.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  serverInstance?.shutdown();
  process.exit(1);
});

async function main() {
  serverInstance = new GeminiMcpServer();
  await serverInstance.start();
}

main().catch(error => {
  logger.error('Server startup failed', { error });
  serverInstance?.shutdown();
  process.exit(1);
});

export { GeminiMcpServer };
