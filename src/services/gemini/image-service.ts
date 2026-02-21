import { GeminiConfig } from '../../config/types.js';
import { GeminiError } from '../../utils/error-handler.js';
import { BaseService } from '../base-service.js';
import { GeneratedImageResult, ImageResponsePart } from './types.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const IMAGE_GENERATION_MODELS = [
  'gemini-3-pro-image-preview',  // Nano Banana Pro — Gemini 3 image model, default for generation
  'gemini-2.5-flash-image',      // Gemini 2.5 Flash image generation (stable alias)
  'nano-banana-pro-preview',     // API alias for gemini-3-pro-image-preview
] as const;

// Models valid for describe_image and analyze_image (text output, multimodal input)
export const IMAGE_VISION_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-pro-preview',
  'gemini-3-pro-image-preview',  // also supports vision
  'gemini-2.5-flash-image',
] as const;

// Combined set for backwards compat — keep IMAGE_MODELS as an alias
export const IMAGE_MODELS = [
  ...IMAGE_GENERATION_MODELS,
  ...IMAGE_VISION_MODELS.filter(m => !IMAGE_GENERATION_MODELS.includes(m as any)),
] as const;

export type ImageModel = typeof IMAGE_GENERATION_MODELS[number];
const DEFAULT_IMAGE_GENERATION_MODEL: ImageModel = 'gemini-3-pro-image-preview';
const DEFAULT_IMAGE_DESCRIBE_MODEL = 'gemini-3-flash-preview';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface ImageInput {
  data: string;
  mimeType: string;
  // Optional: thought signature from a previous generation turn.
  // Required for conversational editing with gemini-3-pro-image-preview.
  thoughtSignature?: string;
}

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  // Reference images. For conversational editing, pass the parts returned
  // by the previous call (including their thoughtSignatures).
  images?: ImageInput[];
}

export interface DescribeImageOptions {
  images: ImageInput[];
  prompt?: string;
  model?: string;
}

// ─── Internal request/response shapes ───────────────────────────────────────

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thoughtSignature?: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiImageRequest {
  contents: GeminiContent[];
  generationConfig: {
    responseModalities: string[];
    imageConfig?: {
      aspectRatio?: string;
      imageSize?: string;
    };
  };
}

interface GeminiImageResponse {
  candidates?: Array<{
    content: { parts: GeminiPart[] };
  }>;
  error?: { code: number; message: string; status: string };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class GeminiImageService extends BaseService {
  private apiKey: string;
  private defaultGenerationModel: string;
  private defaultDescribeModel: string;

  constructor(config: GeminiConfig) {
    super();
    if (!config.apiKey) {
      throw new GeminiError('Missing API key for Gemini image service');
    }
    this.apiKey = config.apiKey;
    this.defaultGenerationModel = config.defaultImageGenerationModel || DEFAULT_IMAGE_GENERATION_MODEL;
    this.defaultDescribeModel = config.defaultImageDescribeModel || DEFAULT_IMAGE_DESCRIBE_MODEL;
    this.logInfo('Gemini image service initialised');
  }

  private validateModel(model: string, operation: 'generation' | 'vision' = 'generation'): void {
    const allowed = operation === 'generation' ? IMAGE_GENERATION_MODELS : IMAGE_MODELS;
    if (!allowed.includes(model as any)) {
      throw new GeminiError(
        `Invalid model for ${operation}: ${model}. Allowed: ${allowed.join(', ')}`
      );
    }
  }

  // Build a GeminiContent[] from prompt + optional reference images.
  // When reference images carry thoughtSignatures (conversational editing),
  // they are attached to the corresponding inlineData part as required by the API.
  private buildContents(
    prompt: string,
    images?: ImageInput[]
  ): GeminiContent[] {
    const userParts: GeminiPart[] = [{ text: prompt }];

    if (images?.length) {
      for (const img of images) {
        const part: GeminiPart = {
          inlineData: { mimeType: img.mimeType, data: img.data },
        };
        if (img.thoughtSignature) {
          part.thoughtSignature = img.thoughtSignature;
        }
        userParts.push(part);
      }
    }

    return [{ role: 'user', parts: userParts }];
  }

  async generateImage(options: GenerateImageOptions): Promise<GeneratedImageResult> {
    const model = options.model || this.defaultGenerationModel;
    this.validateModel(model, 'generation');

    const supportsImageConfig =
      model.includes('image') || model.includes('imagen');

    const body: GeminiImageRequest = {
      contents: this.buildContents(options.prompt, options.images),
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(supportsImageConfig && (options.aspectRatio || options.imageSize)
          ? {
              imageConfig: {
                ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
                ...(options.imageSize && { imageSize: options.imageSize }),
              },
            }
          : {}),
      },
    };

    this.logInfo('Generating image', {
      model,
      prompt: options.prompt.slice(0, 80),
      hasReferenceImages: !!(options.images?.length),
    });

    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new GeminiError(`Gemini image API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as GeminiImageResponse;

    if (data.error) {
      throw new GeminiError(`Gemini image API error: ${data.error.message}`);
    }

    if (!data.candidates?.length) {
      throw new GeminiError('No image generated — empty response from Gemini');
    }

    // Extract all parts, preserving thoughtSignatures.
    // The API guarantees signatures on the first part and every inlineData part
    // for gemini-3-pro-image-preview. We must surface them so callers can
    // round-trip them for conversational editing.
    const responseParts: ImageResponsePart[] = [];

    for (const rawPart of data.candidates[0].content.parts) {
      if (rawPart.inlineData) {
        responseParts.push({
          type: 'image',
          mimeType: rawPart.inlineData.mimeType,
          base64Data: rawPart.inlineData.data,
          thoughtSignature: rawPart.thoughtSignature,
        });
      } else if (rawPart.text !== undefined) {
        responseParts.push({
          type: 'text',
          text: rawPart.text,
          thoughtSignature: rawPart.thoughtSignature,
        });
      }
    }

    const firstImage = responseParts.find(p => p.type === 'image');
    if (!firstImage || !firstImage.base64Data || !firstImage.mimeType) {
      throw new GeminiError('No image data in Gemini response');
    }

    const description = responseParts
      .filter(p => p.type === 'text' && p.text)
      .map(p => p.text)
      .join('') || undefined;

    this.logInfo('Image generated successfully', {
      mimeType: firstImage.mimeType,
      partsCount: responseParts.length,
      hasSignatures: responseParts.some(p => !!p.thoughtSignature),
    });

    return {
      parts: responseParts,
      mimeType: firstImage.mimeType,
      base64Data: firstImage.base64Data,
      description,
    };
  }

  async describeImage(options: DescribeImageOptions): Promise<string> {
    const model = options.model || this.defaultDescribeModel;
    this.validateModel(model, 'vision');

    if (!options.images?.length) {
      throw new GeminiError('At least one image is required for describe_image');
    }

    const prompt = options.prompt || 'Describe this image in detail. What do you see?';

    // Description is text-only — no IMAGE modality needed
    const body = {
      contents: this.buildContents(prompt, options.images),
      generationConfig: { responseModalities: ['TEXT'] },
    };

    this.logInfo('Describing image', { model, imageCount: options.images.length });

    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new GeminiError(`Gemini image API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as GeminiImageResponse;

    if (data.error) {
      throw new GeminiError(`Gemini image API error: ${data.error.message}`);
    }

    if (!data.candidates?.length) {
      throw new GeminiError('No response from Gemini');
    }

    const description = data.candidates[0].content.parts
      .filter(p => p.text)
      .map(p => p.text)
      .join('');

    if (!description) {
      throw new GeminiError('No description in Gemini response');
    }

    return description;
  }

  getDefaultModel(): string {
    return this.defaultGenerationModel;
  }

  getDefaultDescribeModel(): string {
    return this.defaultDescribeModel;
  }

  getAllowedModels(): readonly string[] {
    return IMAGE_MODELS;
  }
}
