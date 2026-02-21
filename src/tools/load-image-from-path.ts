import { readFile } from 'fs/promises';
import { extname, resolve } from 'path';
import { GeminiError } from '../utils/error-handler.js';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

export interface LoadedImage {
  data: string;
  mimeType: string;
  filePath: string;
  sizeBytes: number;
  thoughtSignature?: string;
}

export async function loadImageFromPath(filePath: string): Promise<LoadedImage> {
  const absolutePath = resolve(filePath);
  const ext = extname(absolutePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    throw new GeminiError(
      `Unsupported image format: ${ext}. Supported formats: ${Object.keys(MIME_TYPES).join(', ')}`
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch (error) {
    throw new GeminiError(`Failed to read image file: ${(error as Error).message}`);
  }

  // Try to load corresponding thought signature file if it exists
  // Thought signatures enable conversational editing with gemini-3-pro-image-preview
  const signaturePath = absolutePath.replace(/\.(png|jpg|jpeg|webp|gif|bmp)$/i, '.json');
  let thoughtSignature: string | undefined;
  
  try {
    thoughtSignature = await readFile(signaturePath, 'utf-8');
  } catch {
    // Thought signature file doesn't exist - this is fine, not all images have them
    thoughtSignature = undefined;
  }

  return {
    data: buffer.toString('base64'),
    mimeType,
    filePath: absolutePath,
    sizeBytes: buffer.length,
    thoughtSignature,
  };
}
