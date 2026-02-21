export interface SafetySetting {
  category: string;
  threshold: string;
}

export type ThinkingLevel = 'low' | 'medium' | 'high' | 'minimal';

export interface GeminiConfig {
  apiKey?: string;
  safetySettings: SafetySetting[];
  // Task-specific default models
  defaultModel: string;           // chat / text generation
  defaultImageAnalysisModel: string;  // analyze_image (multimodal reasoning)
  defaultImageDescribeModel: string;  // describe_image (lighter vision task)
  defaultImageGenerationModel: string; // generate_image / edit_image
  maxTokens: number;
  temperature: number;
  defaultGrounding: boolean;
  allowExperimentalModels?: boolean;
}

export interface ServerConfig {
  name: string;
  version: string;
  imageOutputDir?: string;
}

export interface Config {
  gemini: GeminiConfig;
  server: ServerConfig;
  logging: {
    level: string;
    format: string;
  };
}
