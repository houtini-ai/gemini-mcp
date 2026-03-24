import sharp from 'sharp';

/**
 * Target total MCP packet size in bytes (measured as the JSON string length).
 * 940KB leaves ~60KB headroom under the 1MB Claude Desktop transport cap.
 */
const TARGET_PACKET_BYTES = 600_000;

const MAX_PREVIEW_DIMENSION = 800;

export interface ResizeResult {
  base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  originalBytes: number;
  previewBytes: number;
}

/**
 * Resize an image so the final MCP packet stays under TARGET_PACKET_BYTES.
 *
 * @param base64Data        Raw base64 of the source image
 * @param _sourceMimeType   Original mime type (unused — always outputs JPEG)
 * @param nonImageOverhead  Byte size of all non-image content in the tool result
 *                          (text blocks, JSON keys, envelope framing).
 *                          Caller measures this before invoking. Defaults to
 *                          10_000 (10KB) as a safe conservative estimate.
 */
export async function resizeForTransport(
  base64Data: string,
  _sourceMimeType: string,
  nonImageOverhead: number = 10_000,
): Promise<ResizeResult> {
  const inputBuffer = Buffer.from(base64Data, 'base64');
  const originalBytes = inputBuffer.length;

  // base64 string budget available for the image payload
  const base64Budget = TARGET_PACKET_BYTES - nonImageOverhead;

  // base64 encodes 3 binary bytes as 4 chars, so binary ceiling is:
  const binaryBudget = Math.floor(base64Budget * 0.75);

  const dimensionSteps = [MAX_PREVIEW_DIMENSION, 600, 400, 300, 200];
  const quality = 80;

  for (const maxDim of dimensionSteps) {
    const buf = await sharp(inputBuffer)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (buf.length <= binaryBudget) {
      const meta = await sharp(buf).metadata();
      return {
        base64: buf.toString('base64'),
        mimeType: 'image/jpeg',
        width: meta.width ?? maxDim,
        height: meta.height ?? maxDim,
        originalBytes,
        previewBytes: buf.length,
      };
    }
  }

  // Last resort: 200px at quality 60 — will always fit
  const buf = await sharp(inputBuffer)
    .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 60, mozjpeg: true })
    .toBuffer();

  const meta = await sharp(buf).metadata();
  return {
    base64: buf.toString('base64'),
    mimeType: 'image/jpeg',
    width: meta.width ?? 200,
    height: meta.height ?? 200,
    originalBytes,
    previewBytes: buf.length,
  };
}

export { resizeForTransport as compressForViewer };
export type { ResizeResult as CompressResult };
