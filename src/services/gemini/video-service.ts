import { GeminiConfig } from '../../config/types.js';
import { GeminiError } from '../../utils/error-handler.js';
import { BaseService } from '../base-service.js';
import fs from 'fs/promises';
import path from 'path';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const VIDEO_GENERATION_MODELS = [
  'veo-3.1-generate-preview',
] as const;

export type VideoModel = typeof VIDEO_GENERATION_MODELS[number];
const DEFAULT_VIDEO_MODEL: VideoModel = 'veo-3.1-generate-preview';

export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p' | '4k';
export type VideoDuration = 4 | 6 | 8;

export interface VideoInput {
  data: string;
  mimeType: string;
}

export interface VideoReferenceImage {
  referenceType: 'asset' | 'style';
  image: VideoInput;
}

export interface GenerateVideoOptions {
  prompt: string;
  model?: string;
  aspectRatio?: VideoAspectRatio;
  resolution?: VideoResolution;
  durationSeconds?: VideoDuration;
  generateAudio?: boolean;
  sampleCount?: number;
  seed?: number;
  firstFrameImage?: VideoInput;
  referenceImages?: VideoReferenceImage[];
  outputPath?: string;
}

export interface GeneratedVideoResult {
  videoPath: string;
  thumbnailPath?: string;
  mimeType: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
}

// ─── Vertex AI Request/Response Shapes ──────────────────────────────────────
// Note: Veo 3.1 uses Vertex AI format even when calling via AI Studio endpoint

interface VeoImageInput {
  bytesBase64Encoded: string;
  mimeType: string;
}

interface VeoReferenceImageInput {
  referenceType: 'asset' | 'style';
  referenceImage: VeoImageInput;
}

interface VeoInstance {
  prompt: string;
  image?: VeoImageInput;
  referenceImages?: VeoReferenceImageInput[];
}

interface VeoParameters {
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
  sampleCount?: number;
  seed?: number;
  negativePrompt?: string;
}

interface VeoRequest {
  instances: VeoInstance[];
  parameters: VeoParameters;
}

interface VeoOperationResponse {
  name: string;
  done?: boolean;
  response?: {
    '@type'?: string;
    // Gemini API format
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri?: string;
          mimeType?: string;
        };
      }>;
    };
    // Vertex AI format  
    predictions?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
    }>;
    videos?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
    }>;
    // Alternative format
    generatedSamples?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
  metadata?: {
    progressPercent?: number;
  };
}

// ─── Retry constants ─────────────────────────────────────────────────────────
const MAX_429_RETRIES = 3;
const INITIAL_BACKOFF_MS = 30_000; // 30 seconds

// ─── Service ─────────────────────────────────────────────────────────────────

export class GeminiVideoService extends BaseService {
  private apiKey: string;
  private defaultModel: string;
  private outputDir: string;
  private pollingIntervalMs: number;
  private maxPollingTimeMs: number;

  constructor(config: GeminiConfig, outputDir?: string) {
    super();
    if (!config.apiKey) {
      throw new GeminiError('Missing API key for Gemini video service');
    }
    this.apiKey = config.apiKey;
    this.defaultModel = DEFAULT_VIDEO_MODEL;
    this.outputDir = outputDir || './output';
    
    // Veo 3.1 video generation takes 2-5 minutes for 1080p 8-second videos
    // Poll every 15 seconds to avoid rate limits
    this.pollingIntervalMs = 15000;
    // Allow up to 10 minutes for video generation
    this.maxPollingTimeMs = 600000;
    
    this.logInfo('Gemini video service initialised', {
      outputDir: this.outputDir,
      pollingInterval: `${this.pollingIntervalMs / 1000}s`,
      maxPollingTime: `${this.maxPollingTimeMs / 1000}s`
    });
  }

  /**
   * Fetch with automatic retry on 429 (rate limit) responses.
   * Uses exponential backoff starting at INITIAL_BACKOFF_MS.
   */
  private async fetchWithRetry(
    url: string,
    init?: RequestInit,
    label = 'request'
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
      const response = await fetch(url, init);

      if (response.status !== 429) {
        return response;
      }

      // 429 rate limited
      lastError = new GeminiError(
        `Video generation rate limited (429). The API has a quota limit. ` +
        `Please wait 30-60 seconds before retrying.`
      );

      if (attempt < MAX_429_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        this.logInfo(`Rate limited (429) on ${label}, retrying in ${backoffMs / 1000}s`, {
          attempt: attempt + 1,
          maxRetries: MAX_429_RETRIES,
        });
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError!;
  }

  private validateModel(model: string): void {
    if (!VIDEO_GENERATION_MODELS.includes(model as VideoModel)) {
      throw new GeminiError(
        `Invalid video model: ${model}. Allowed: ${VIDEO_GENERATION_MODELS.join(', ')}`
      );
    }
  }

  private buildVeoRequest(options: GenerateVideoOptions): VeoRequest {
    const instance: VeoInstance = {
      prompt: options.prompt
    };

    // Add first frame image if provided (image-to-video)
    if (options.firstFrameImage) {
      instance.image = {
        bytesBase64Encoded: options.firstFrameImage.data,
        mimeType: options.firstFrameImage.mimeType
      };
    }

    // Add reference images if provided (up to 3 for character/style consistency)
    if (options.referenceImages?.length) {
      if (options.referenceImages.length > 3) {
        throw new GeminiError('Maximum 3 reference images allowed');
      }
      
      instance.referenceImages = options.referenceImages.map(ref => ({
        referenceType: ref.referenceType,
        referenceImage: {
          bytesBase64Encoded: ref.image.data,
          mimeType: ref.image.mimeType
        }
      }));
    }

    const parameters: VeoParameters = {
      aspectRatio: options.aspectRatio || '16:9',
      resolution: options.resolution || '1080p',
      durationSeconds: options.durationSeconds || 8,
      sampleCount: options.sampleCount || 1
    };

    if (options.seed !== undefined) {
      parameters.seed = options.seed;
    }

    // Handle audio generation via prompt engineering
    // Gemini API (generativelanguage.googleapis.com) doesn't accept generateAudio parameter
    // Instead, audio is native and controlled via negative prompts
    if (options.generateAudio === false) {
      parameters.negativePrompt = 'audio, sound, noise, speech, dialogue, music, sound effects';
      this.logInfo('Audio generation disabled via negativePrompt');
    }

    return {
      instances: [instance],
      parameters
    };
  }

  private async pollOperation(operationName: string): Promise<VeoOperationResponse> {
    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < this.maxPollingTimeMs) {
      attempts++;
      
      // The operation name from API is like "models/veo-3.1-generate-preview/operations/12345"
      // Since GEMINI_API_BASE already includes /models, we need to strip it to avoid duplication
      let opPath = operationName;
      if (opPath.startsWith('models/')) {
        opPath = opPath.replace('models/', '');
      }

      const url = `${GEMINI_API_BASE}/${opPath}?key=${this.apiKey}`;
      
      this.logInfo(`Polling video operation (attempt ${attempts})`, {
        elapsed: `${Math.round((Date.now() - startTime) / 1000)}s`,
        maxTime: `${this.maxPollingTimeMs / 1000}s`
      });

      const response = await this.fetchWithRetry(url, undefined, 'poll operation');

      if (!response.ok) {
        const text = await response.text();
        throw new GeminiError(`Failed to poll operation: ${response.status} ${text}`);
      }

      const data = await response.json() as VeoOperationResponse;

      if (data.error) {
        throw new GeminiError(`Video generation failed: ${data.error.message}`);
      }

      if (data.done) {
        this.logInfo('Video generation completed', {
          attempts,
          totalTime: `${Math.round((Date.now() - startTime) / 1000)}s`
        });
        return data;
      }

      // Log progress if available
      if (data.metadata?.progressPercent !== undefined) {
        this.logInfo(`Video generation progress: ${data.metadata.progressPercent}%`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollingIntervalMs));
    }

    throw new GeminiError(
      `Video generation timed out after ${this.maxPollingTimeMs / 1000}s. ` +
      `Video generation can take 2-5 minutes for 1080p videos.`
    );
  }

  private async downloadVideoFromUri(uri: string, mimeType: string, customPath?: string): Promise<string> {
    this.logInfo('Downloading video from URI', { uri: uri.slice(0, 80) });

    // Download video file using authenticated request
    const response = await this.fetchWithRetry(uri, {
      headers: {
        'x-goog-api-key': this.apiKey
      }
    }, 'download video');

    if (!response.ok) {
      const text = await response.text();
      throw new GeminiError(`Failed to download video: ${response.status} ${text}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Determine file extension from mimeType
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    
    // Use custom path if provided, otherwise generate timestamped filename
    const filename = customPath 
      ? path.basename(customPath)
      : `veo-video-${Date.now()}.${ext}`;
    
    const fullPath = customPath || path.join(this.outputDir, filename);

    // Write buffer to file
    await fs.writeFile(fullPath, buffer);

    this.logInfo('Video file saved', {
      path: fullPath,
      size: `${Math.round(buffer.length / 1024 / 1024)}MB`
    });

    return path.resolve(fullPath);
  }

  private async saveVideoFile(
    base64Data: string,
    mimeType: string,
    customPath?: string
  ): Promise<string> {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Determine file extension from mimeType
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    
    // Use custom path if provided, otherwise generate timestamped filename
    const filename = customPath 
      ? path.basename(customPath)
      : `veo-video-${Date.now()}.${ext}`;
    
    const fullPath = customPath || path.join(this.outputDir, filename);

    // Convert base64 to buffer and write to file
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(fullPath, buffer);

    this.logInfo('Video file saved', {
      path: fullPath,
      size: `${Math.round(buffer.length / 1024 / 1024)}MB`
    });

    return path.resolve(fullPath);
  }

  async generateVideo(options: GenerateVideoOptions): Promise<GeneratedVideoResult> {
    const model = options.model || this.defaultModel;
    this.validateModel(model);

    this.logInfo('Starting video generation', {
      model,
      prompt: options.prompt.slice(0, 80),
      duration: options.durationSeconds || 8,
      resolution: options.resolution || '1080p',
      aspectRatio: options.aspectRatio || '16:9',
      hasFirstFrame: !!options.firstFrameImage,
      referenceImageCount: options.referenceImages?.length || 0
    });

    // Build request body using Vertex AI format
    const requestBody = this.buildVeoRequest(options);

    // Submit async job
    const submitUrl = `${GEMINI_API_BASE}/${model}:predictLongRunning?key=${this.apiKey}`;
    
    const submitResponse = await this.fetchWithRetry(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }, 'submit video');

    if (!submitResponse.ok) {
      const text = await submitResponse.text();
      throw new GeminiError(`Failed to submit video generation: ${submitResponse.status} ${text}`);
    }

    const submitData = await submitResponse.json() as VeoOperationResponse;
    
    if (!submitData.name) {
      throw new GeminiError('No operation name returned from video generation submission');
    }

    this.logInfo('Video generation job submitted', {
      operationName: submitData.name
    });

    // Poll for completion
    const completedOperation = await this.pollOperation(submitData.name);

    // Extract video data from response
    // Gemini API returns: response.generateVideoResponse.generatedSamples[0].video.uri
    // Vertex AI returns: response.predictions[0].bytesBase64Encoded
    const response = completedOperation.response;
    if (!response) {
      throw new GeminiError('No response in completed operation');
    }

    // Debug: Log the actual response structure
    this.logInfo('Completed operation response structure:', {
      hasGenerateVideoResponse: !!response.generateVideoResponse,
      hasPredictions: !!response.predictions,
      hasVideos: !!response.videos,
      hasGeneratedSamples: !!response.generatedSamples,
      responseKeys: Object.keys(response),
      fullResponse: JSON.stringify(response, null, 2).slice(0, 500)
    });

    // Try Gemini API format first (URI-based)
    const geminiSample = response.generateVideoResponse?.generatedSamples?.[0];
    const geminiVideo = geminiSample?.video;
    
    // Try Vertex AI format (base64-based)
    const vertexPrediction = response.predictions?.[0];
    const vertexVideo = response.videos?.[0];
    const altSample = response.generatedSamples?.[0];

    // Handle both URI-based (Gemini API) and base64-based (Vertex AI) responses
    let videoPath: string;
    let mimeType = 'video/mp4'; // Default mimeType
    
    if (geminiVideo?.uri) {
      // Gemini API format - download from URI (mimeType often not included, default to mp4)
      this.logInfo('Using Gemini API format (URI-based download)');
      mimeType = geminiVideo.mimeType || 'video/mp4';
      videoPath = await this.downloadVideoFromUri(geminiVideo.uri, mimeType, options.outputPath);
    } else if (vertexPrediction?.bytesBase64Encoded && vertexPrediction.mimeType) {
      // Vertex AI predictions format
      this.logInfo('Using Vertex AI predictions format (base64)');
      mimeType = vertexPrediction.mimeType;
      videoPath = await this.saveVideoFile(vertexPrediction.bytesBase64Encoded, mimeType, options.outputPath);
    } else if (vertexVideo?.bytesBase64Encoded && vertexVideo.mimeType) {
      // Vertex AI videos format
      this.logInfo('Using Vertex AI videos format (base64)');
      mimeType = vertexVideo.mimeType;
      videoPath = await this.saveVideoFile(vertexVideo.bytesBase64Encoded, mimeType, options.outputPath);
    } else if (altSample?.bytesBase64Encoded && altSample.mimeType) {
      // Alternative generatedSamples format
      this.logInfo('Using generatedSamples format (base64)');
      mimeType = altSample.mimeType;
      videoPath = await this.saveVideoFile(altSample.bytesBase64Encoded, altSample.mimeType, options.outputPath);
    } else {
      // Provide detailed error with actual response structure for debugging
      const debugInfo = {
        hasGenerateVideoResponse: !!response.generateVideoResponse,
        hasPredictions: !!response.predictions,
        hasVideos: !!response.videos,
        hasGeneratedSamples: !!response.generatedSamples,
        responseKeys: Object.keys(response),
        sampleStructure: JSON.stringify({
          geminiSample,
          geminiVideo,
          vertexPrediction,
          vertexVideo,
          altSample
        }, null, 2)
      };
      throw new GeminiError(
        `Video response contains neither URI nor base64 data in any recognized format.\n` +
        `Debug info: ${JSON.stringify(debugInfo, null, 2)}\n` +
        `Full response (first 1000 chars): ${JSON.stringify(response, null, 2).slice(0, 1000)}`
      );
    }

    return {
      videoPath,
      mimeType,
      duration: options.durationSeconds || 8,
      resolution: options.resolution || '1080p',
      aspectRatio: options.aspectRatio || '16:9'
    };
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getAllowedModels(): readonly string[] {
    return VIDEO_GENERATION_MODELS;
  }
}
