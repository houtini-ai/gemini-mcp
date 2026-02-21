import { readFile } from 'fs/promises';
import sharp from 'sharp';

// Test compression on the generated file
const filePath = 'C:/MCP/gemini-mcp/test-output/test-1k-geometric.png';

const MAX_PREVIEW_DIMENSION = 1024;
const PREVIEW_QUALITY = 72;

async function testCompression() {
  console.log('Reading file...');
  const inputBuffer = await readFile(filePath);
  const originalBytes = inputBuffer.length;
  console.log(`Original file size: ${(originalBytes / 1024).toFixed(2)} KB`);

  const image = sharp(inputBuffer);
  const meta = await image.metadata();
  console.log(`Original dimensions: ${meta.width}x${meta.height}`);

  const needsResize = meta.width > MAX_PREVIEW_DIMENSION || meta.height > MAX_PREVIEW_DIMENSION;
  console.log(`Needs resize: ${needsResize}`);

  let pipeline = sharp(inputBuffer);
  if (needsResize) {
    pipeline = pipeline.resize(MAX_PREVIEW_DIMENSION, MAX_PREVIEW_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const outputBuffer = await pipeline
    .jpeg({ quality: PREVIEW_QUALITY, mozjpeg: true })
    .toBuffer();

  const previewBytes = outputBuffer.length;
  const base64Size = Buffer.from(outputBuffer).toString('base64').length;

  console.log(`Compressed size: ${(previewBytes / 1024).toFixed(2)} KB`);
  console.log(`Base64 size: ${(base64Size / 1024).toFixed(2)} KB`);
  console.log(`Compression ratio: ${(originalBytes / previewBytes).toFixed(2)}x`);
  console.log(`Would fit in 1MB response: ${base64Size < 900000 ? 'YES' : 'NO'} (${(base64Size / 1024 / 1024).toFixed(2)} MB)`);
}

testCompression().catch(console.error);
