// Gemini API requires UPPERCASE enum values for thinkingConfig.thinkingLevel
export type ThinkingLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'MINIMAL';

// Minimal local shape — the SDK type used to come from @google/generative-ai.
// We only need the fields that addInlineCitations reads.
export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  groundingSupports?: Array<{
    groundingChunkIndices?: number[];
    segment?: { startIndex?: number; endIndex?: number; text?: string };
  }>;
  [key: string]: any;
}

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
  images: Array<{ data: string; mimeType: string; mediaResolution?: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  globalMediaResolution?: string;
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
  /** Model's real output ceiling from the API (outputTokenLimit). */
  outputTokenLimit?: number;
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
  // Grounding sources when search is enabled
  groundingSources?: Array<{
    url: string;
    title: string;
  }>;
}
