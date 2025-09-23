import { GroundingMetadata } from '@google/generative-ai';

export interface ChatRequest {
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  grounding?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  timestamp: string;
  finishReason?: string;
  groundingMetadata?: GroundingMetadata;
}

export interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
}

export interface ListModelsResponse {
  models: ModelInfo[];
  timestamp: string;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}
