#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE
} from '@modelcontextprotocol/ext-apps/server';
import * as z from 'zod';

import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname, resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';

import { config, validateConfig } from './config/index.js';
import { GeminiService } from './services/gemini/index.js';
import { GeminiImageService } from './services/gemini/image-service.js';
import { GeminiDeepResearchTool } from './tools/gemini-deep-research.js';
import { GenerateLandingPageTool } from './tools/generate-landing-page.js';
import { loadImageFromPath } from './tools/load-image-from-path.js';
import { handlePromptAssistant } from './tools/gemini-prompt-assistant.js';
import logger from './utils/logger.js';
import { McpError, createToolResult } from './utils/error-handler.js';
import { compressForInline, compressForViewer } from './utils/image-compress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default output directory for generated images (relative to package root)
const DEFAULT_IMAGE_OUTPUT_DIR = resolve(__dirname, '..', 'output');
