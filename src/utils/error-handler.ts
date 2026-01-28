import logger from './logger.js';

export class McpError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class GeminiError extends McpError {
  constructor(message: string, code = 'GEMINI_ERROR') {
    super(message, code, 500);
    this.name = 'GeminiError';
  }
}

export class ConfigurationError extends McpError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

export function handleError(error: Error, context?: string): McpError {
  const contextMessage = context ? `[${context}] ` : '';
  const fullMessage = `${contextMessage}${error.message}`;
  
  logger.error(fullMessage, { 
    error: error.stack,
    context 
  });

  if (error instanceof McpError) {
    return error;
  }

  if (error.message.includes('API key')) {
    return new ConfigurationError(fullMessage);
  }

  if (error.message.includes('Gemini') || error.message.includes('generative')) {
    return new GeminiError(fullMessage);
  }

  return new McpError(fullMessage);
}

export function createToolResult(success: boolean, content: string, error?: Error) {
  if (success) {
    return [{ type: 'text' as const, text: content }];
  }
  
  const errorMessage = error ? handleError(error).message : content;
  return [{ type: 'text' as const, text: `Error: ${errorMessage}` }];
}
