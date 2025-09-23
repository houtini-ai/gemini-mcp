import { Config } from './types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config: Config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ],
    defaultModel: 'gemini-2.5-flash',
    maxTokens: 8192,
    temperature: 0.7,
    defaultGrounding: true
  },
  server: {
    name: 'gemini-mcp',
    version: '1.0.0'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined'
  }
};

export function validateConfig(): void {
  if (!config.gemini.apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable not set. ' +
      'Please set your Gemini API key: export GEMINI_API_KEY=your-api-key-here'
    );
  }
}
