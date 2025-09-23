export interface ChatRequest {
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  timestamp: string;
  finishReason?: string;
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
