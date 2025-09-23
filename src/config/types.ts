export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface GeminiConfig {
  apiKey?: string;
  safetySettings: SafetySetting[];
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  defaultGrounding: boolean;
}

export interface ServerConfig {
  name: string;
  version: string;
}

export interface Config {
  gemini: GeminiConfig;
  server: ServerConfig;
  logging: {
    level: string;
    format: string;
  };
}
