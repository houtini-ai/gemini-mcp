import { platform } from 'os';
import logger from './logger.js';
import { McpError, createToolResult } from './error-handler.js';

const IS_WINDOWS = platform() === 'win32';

export function fileLink(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  return IS_WINDOWS ? `file:///${normalized}` : `file://${normalized}`;
}

export function savedFileMessage(label: string, absolutePath: string): string {
  return `${label}: ${absolutePath}\n  Open: ${fileLink(absolutePath)}`;
}

export function toolError(toolName: string, error: unknown) {
  logger.error(`${toolName} failed`, { error });

  const msg = error instanceof McpError
    ? error.message
    : `${toolName} failed: ${(error as Error).message}`;

  return {
    content: createToolResult(false, msg, error as Error),
    structuredContent: { content: msg, success: false },
  };
}
