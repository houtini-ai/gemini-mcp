import sharp from 'sharp';

// Target size Claude can handle inline (~400KB base64 ≈ ~300KB binary)
// Must stay well under 1MB total tool result (text + structuredContent + overhead)
const MAX_INLINE_BYTES = 300_000;
// Max dimension for the preview sent to Claude
const MAX_PREVIEW_DIMENSION = 1024;
// JPEG quality for preview (good enough to see the image, not full fidelity)
const PREVIEW_QUALITY = 72;

// Viewer thumbnail — small enough to never exceed 1MB tool result limit
// Maximum quality - just resize to fit, no compression loss
const MAX_VIEWER_DIMENSION = 1024;
const VIEWER_QUALITY = 100;
const MAX_VIEWER_BYTES = 400_000;

export interface CompressResult {
  base64: string;
  mimeType: 'image/jpeg';
  originalBytes: number;
  previewBytes: number;
  wasCompressed: boolean;
}

/**
 * Compress a base64-encoded image to something Claude can display inline.
 * Always outputs JPEG for predictable sizing.
 * If the image is already small enough, still converts to JPEG for consistency.
 */
export async function compressForInline(
  base64Data: string,
  sourceMimeType: string
): Promise<CompressResult> {
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const originalBytes = inputBuffer.length;

  const image = sharp(inputBuffer);
  const meta = await image.metadata();

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Determine if resize is needed
  const needsResize = width > MAX_PREVIEW_DIMENSION || height > MAX_PREVIEW_DIMENSION;

  let pipeline = sharp(inputBuffer);

  if (needsResize) {
    pipeline = pipeline.resize(MAX_PREVIEW_DIMENSION, MAX_PREVIEW_DIMENSION, {
      fit: 'inside',        // preserve aspect ratio
      withoutEnlargement: true,
    });
  }

  const outputBuffer = await pipeline
    .jpeg({ quality: PREVIEW_QUALITY, mozjpeg: true })
    .toBuffer();

  // If still too large after resize, reduce quality progressively
  if (outputBuffer.length > MAX_INLINE_BYTES) {
    for (const quality of [65, 50, 35]) {
      let retryPipeline = sharp(inputBuffer);
      if (needsResize) {
        retryPipeline = retryPipeline.resize(MAX_PREVIEW_DIMENSION, MAX_PREVIEW_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      const retryBuffer = await retryPipeline
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      if (retryBuffer.length <= MAX_INLINE_BYTES) {
        return {
          base64: retryBuffer.toString('base64'),
          mimeType: 'image/jpeg',
          originalBytes,
          previewBytes: retryBuffer.length,
          wasCompressed: true,
        };
      }
    }
  }

  return {
    base64: outputBuffer.toString('base64'),
    mimeType: 'image/jpeg',
    originalBytes,
    previewBytes: outputBuffer.length,
    wasCompressed: needsResize || outputBuffer.length < originalBytes,
  };
}

/**
 * Produce an aggressively small thumbnail for the MCP app viewer.
 * Full-res image is saved to disk separately.
 */
export async function compressForViewer(
  base64Data: string,
  sourceMimeType: string
): Promise<CompressResult> {
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const originalBytes = inputBuffer.length;

  let pipeline = sharp(inputBuffer)
    .resize(MAX_VIEWER_DIMENSION, MAX_VIEWER_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });

  const outputBuffer = await pipeline
    .jpeg({ quality: VIEWER_QUALITY, mozjpeg: true })
    .toBuffer();

  if (outputBuffer.length > MAX_VIEWER_BYTES) {
    for (const quality of [95, 90, 85]) {
      const retryBuffer = await sharp(inputBuffer)
        .resize(MAX_VIEWER_DIMENSION, MAX_VIEWER_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      if (retryBuffer.length <= MAX_VIEWER_BYTES) {
        return {
          base64: retryBuffer.toString('base64'),
          mimeType: 'image/jpeg',
          originalBytes,
          previewBytes: retryBuffer.length,
          wasCompressed: true,
        };
      }
    }
  }

  return {
    base64: outputBuffer.toString('base64'),
    mimeType: 'image/jpeg',
    originalBytes,
    previewBytes: outputBuffer.length,
    wasCompressed: true,
  };
}
