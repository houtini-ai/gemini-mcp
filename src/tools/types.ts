import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GeminiService } from '../services/gemini/index.js';
import { GeminiImageService } from '../services/gemini/image-service.js';
import { MediaServer } from '../services/media-server.js';

export interface ToolContext {
  server: McpServer;
  geminiService: GeminiService;
  imageService: GeminiImageService;
  outputDir: string;
  mediaServer: MediaServer;
}
