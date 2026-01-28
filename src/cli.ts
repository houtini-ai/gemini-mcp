#!/usr/bin/env node

import { GeminiMcpServer } from './index.js';
import logger from './utils/logger.js';

// CLI entry point
async function cli() {
  try {
    logger.info('Starting Gemini MCP Server via CLI...');
    
    const server = new GeminiMcpServer();
    await server.start();
    
  } catch (error) {
    logger.error('CLI startup failed', { error });
    process.exit(1);
  }
}

cli();
