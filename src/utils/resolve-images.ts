import { readFile } from 'fs/promises';
import { extname, resolve } from 'path';
import logger from './logger.js';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

export interface ImageInput {
  data?: string;
  filePath?: string;
  mimeType?: string;
  /** Thought signature from a previous Gemini image generation/edit call.
   *  Must be round-tripped verbatim for conversational editing. */
  thoughtSignature?: string;
  mediaResolution?: string;
}

export interface ResolvedImage {
  data: string;
  mimeType: string;
  /** Preserved thought signature for conversational editing. */
  thoughtSignature?: string;
  mediaResolution?: string;
}

/**
 * Resolve an image input to base64 data, loading from disk if a filePath
 * is provided. This runs server-side so the image data never transits MCP.
 *
 * Priority: if `data` is provided it is used directly; otherwise `filePath`
 * is read from disk.
 */
export async function resolveImageInput(image: ImageInput): Promise<ResolvedImage> {
  if (image.data && image.mimeType) {
    return {
      data: image.data,
      mimeType: image.mimeType,
      thoughtSignature: image.thoughtSignature,
      mediaResolution: image.mediaResolution,
    };
  }

  if (image.filePath) {
    const abs = resolve(image.filePath);
    const ext = extname(abs).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    if (!mimeType) {
      throw new Error(
        `Unsupported image format: ${ext}. Supported: ${Object.keys(MIME_TYPES).join(', ')}`
      );
    }

    const buffer = await readFile(abs);
    logger.info('Resolved image from file path (server-side)', {
      filePath: abs,
      sizeKB: Math.round(buffer.length / 1024),
    });

    return {
      data: buffer.toString('base64'),
      mimeType,
      thoughtSignature: image.thoughtSignature,
      mediaResolution: image.mediaResolution,
    };
  }

  throw new Error(
    'Image must provide either data+mimeType (base64) or filePath. ' +
    'Use filePath to bypass MCP transport limits for large images.'
  );
}

/**
 * Resolve an array of image inputs, loading any filePath references from disk.
 */
export async function resolveImageInputs(images: ImageInput[]): Promise<ResolvedImage[]> {
  return Promise.all(images.map(resolveImageInput));
}
