import sharp from 'sharp';

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

export async function compressForViewer(
  base64Data: string,
  sourceMimeType: string
): Promise<CompressResult> {
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const originalBytes = inputBuffer.length;

  const outputBuffer = await sharp(inputBuffer)
    .resize(MAX_VIEWER_DIMENSION, MAX_VIEWER_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
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
