import { GroundingMetadata } from '@google/generative-ai';

export type ThinkingLevel = 'low' | 'medium' | 'high' | 'minimal';

export interface ChatRequest {
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  grounding?: boolean;
  thinkingLevel?: ThinkingLevel;
}

export interface ImageAnalysisRequest {
  prompt: string;
  images: Array<{ data: string; mimeType: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  cachedContentTokenCount?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  timestamp: string;
  finishReason?: string;
  groundingMetadata?: GroundingMetadata;
  usageMetadata?: UsageMetadata;
}

export interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  contextWindow: number;
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

// A single part extracted from a Gemini image response.
// thoughtSignature must be preserved and returned verbatim in follow-up turns
// for gemini-3-pro-image-preview conversational editing (API enforces strict validation).
export interface ImageResponsePart {
  type: 'image' | 'text';
  // Present when type === 'image'
  mimeType?: string;
  base64Data?: string;
  // Present when type === 'text'
  text?: string;
  // Thought signature from Gemini 3 - must be round-tripped for conversational editing
  thoughtSignature?: string;
}

export interface GeneratedImageResult {
  parts: ImageResponsePart[];
  // Convenience: first image part
  mimeType: string;
  base64Data: string;
  description?: string;
}
