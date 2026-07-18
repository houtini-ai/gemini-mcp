import { Config } from './types.js';
import * as dotenv from 'dotenv';

dotenv.config();

export const config: Config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ],
    defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.1-pro-preview',                // chat / text
    defaultDeepResearchModel: process.env.GEMINI_DEEP_RESEARCH_MODEL || 'gemini-3.1-pro-preview',  // deep_research
    defaultImageAnalysisModel: process.env.GEMINI_IMAGE_ANALYSIS_MODEL || 'gemini-3.1-pro-preview', // analyze_image
    defaultImageDescribeModel: process.env.GEMINI_IMAGE_DESCRIBE_MODEL || 'gemini-3-flash-preview', // describe_image (lighter task)
    defaultImageGenerationModel: process.env.GEMINI_IMAGE_GENERATION_MODEL || 'gemini-3-pro-image-preview', // generate_image / edit_image
    maxTokens: 65536,
    temperature: 1.0,
    defaultGrounding: true,
    allowExperimentalModels: process.env.GEMINI_ALLOW_EXPERIMENTAL === 'true',
    requestTimeoutMs: Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) || 240000
  },
  server: {
    name: 'gemini-mcp',
    version: '2.5.1',
    imageOutputDir: process.env.GEMINI_IMAGE_OUTPUT_DIR
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
