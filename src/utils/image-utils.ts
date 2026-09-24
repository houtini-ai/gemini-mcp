import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve, extname } from 'path';
import sharp from 'sharp';
import logger from './logger.js';
import { resizeForTransport } from './image-compress.js';

type ImageFormat = 'png' | 'jpeg' | 'webp';

const EXT_TO_FORMAT: Record<string, ImageFormat> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
};

const FORMAT_TO_MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * The image MIME type implied by a file path's extension. Falls back to
 * image/png for anything we don't recognise (matching the default save path).
 */
export function mimeTypeForPath(path: string): string {
  const format = EXT_TO_FORMAT[extname(path).toLowerCase()];
  return format ? FORMAT_TO_MIME[format] : 'image/png';
}

/**
 * Detect the real image format from the buffer's magic bytes, so a mislabelled
 * or optimistic mime type can't make us write the wrong codec.
 */
function detectFormat(buf: Buffer): ImageFormat | 'unknown' {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return 'unknown';
}

/**
 * Save generated image bytes to disk, transcoding so the file's contents always
 * match its extension.
 *
 * Gemini picks its own output codec and often returns JPEG bytes even when the
 * caller asked for a `.png` path. Writing those bytes verbatim produced a file
 * whose contents didn't match its name (a JPEG called `.png`), which breaks any
 * tool that trusts the extension. So when the requested extension and the actual
 * bytes disagree we re-encode to the requested format; when they already match
 * (e.g. a `.jpg` path for JPEG bytes) we write the original bytes untouched.
 */
export async function saveImageToFile(base64Data: string, outputPath: string): Promise<string> {
  const absolutePath = resolve(outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });

  const buffer = Buffer.from(base64Data, 'base64');
  const targetFormat = EXT_TO_FORMAT[extname(absolutePath).toLowerCase()];
  const actualFormat = detectFormat(buffer);

  if (targetFormat && actualFormat !== 'unknown' && actualFormat !== targetFormat) {
    let pipeline = sharp(buffer);
    if (targetFormat === 'png') pipeline = pipeline.png();
    else if (targetFormat === 'jpeg') pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true });
    else pipeline = pipeline.webp({ quality: 95 });

    const converted = await pipeline.toBuffer();
    await writeFile(absolutePath, converted);
    logger.info('Transcoded generated image to match requested extension', {
      path: absolutePath,
      requested: targetFormat,
      modelReturned: actualFormat,
    });
    return absolutePath;
  }

  await writeFile(absolutePath, buffer);
  return absolutePath;
}

export async function createImagePreviewHtml(
  imagePath: string,
  prompt: string,
  description?: string
): Promise<string> {
  const htmlPath = imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.html');
  const imageFilename = imagePath.split(/[/\\]/).pop() || 'image';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Image: ${imageFilename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 1200px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 40px;
    }
    .image-container {
      text-align: center;
      margin-bottom: 30px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
    }
    .image-container img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .metadata {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .metadata h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #333;
    }
    .metadata-item {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e0e0e0;
    }
    .metadata-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .metadata-label {
      font-weight: 600;
      color: #667eea;
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metadata-value {
      color: #555;
      line-height: 1.6;
    }
    .prompt-box {
      background: #fff;
      border: 2px solid #667eea;
      border-radius: 6px;
      padding: 15px;
      margin-top: 10px;
      position: relative;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
    }
    .copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #667eea;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.3s;
    }
    .copy-btn:hover {
      background: #5568d3;
    }
    .copy-btn:active {
      background: #4a5bc4;
    }
    .copy-btn.copied {
      background: #10b981;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Gemini Generated Image</h1>
      <p>Created with Google Gemini AI (Nano Banana Pro)</p>
    </div>

    <div class="content">
      <div class="image-container">
        <img src="${imagePath.replace(/\\/g, '/')}" alt="Generated image">
      </div>

      <div class="metadata">
        <h2>Generation Details</h2>

        <div class="metadata-item">
          <span class="metadata-label">Prompt</span>
          <div class="prompt-box" id="promptBox">
            <button class="copy-btn" onclick="copyPrompt()">Copy</button>
            ${prompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
        </div>

        ${description ? `
        <div class="metadata-item">
          <span class="metadata-label">AI Description</span>
          <div class="metadata-value">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        ` : ''}

        <div class="metadata-item">
          <span class="metadata-label">Generated</span>
          <div class="metadata-value">${new Date().toLocaleString()}</div>
        </div>

        <div class="metadata-item">
          <span class="metadata-label">File</span>
          <div class="metadata-value">${imageFilename}</div>
        </div>
      </div>

      <div class="actions">
        <a href="${imagePath.replace(/\\/g, '/')}" download class="btn">Download Image</a>
      </div>
    </div>

    <div class="footer">
      Generated by Gemini MCP Server &middot; @houtini/gemini-mcp
    </div>
  </div>

  <script>
    function copyPrompt() {
      const promptText = document.getElementById('promptBox').innerText.replace('Copy', '').trim();
      navigator.clipboard.writeText(promptText).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>`;

  await writeFile(htmlPath, html, 'utf-8');
  return htmlPath;
}

export interface ProcessedImage {
  savedPath: string;
  /** MIME type of the full-resolution file on disk, matching its extension. */
  savedMimeType: string;
  previewPath: string;
  /** Base64-encoded resized JPEG preview for inline transport */
  previewBase64: string;
  previewMimeType: 'image/jpeg';
  previewWidth: number;
  previewHeight: number;
  originalBytes: number;
}

export async function processGeneratedImage(
  base64Data: string,
  mimeType: string,
  savePath: string,
  prompt: string,
  description?: string
): Promise<ProcessedImage> {
  const savedPath = await saveImageToFile(base64Data, savePath);
  const previewPath = await createImagePreviewHtml(savedPath, prompt, description);

  // Measure non-image overhead: text content that will accompany the image
  // in the tool result (file paths + description + JSON-RPC envelope framing)
  const nonImageOverhead = Buffer.byteLength(
    JSON.stringify({ savedPath, previewPath, description: description ?? '', prompt }),
    'utf8'
  ) + 2_000; // 2KB extra for JSON-RPC envelope keys and framing

  const resized = await resizeForTransport(base64Data, mimeType, nonImageOverhead);

  const base64Chars = resized.base64.length;
  logger.info('Image saved successfully', {
    savedPath,
    previewPath,
    originalKB: Math.round(resized.originalBytes / 1024),
    previewKB: Math.round(resized.previewBytes / 1024),
    previewDimensions: `${resized.width}x${resized.height}`,
    ratio: (resized.originalBytes / resized.previewBytes).toFixed(1) + 'x',
    base64Chars,
    base64KB: Math.round(base64Chars / 1024),
  });

  return {
    savedPath,
    savedMimeType: mimeTypeForPath(savedPath),
    previewPath,
    previewBase64: resized.base64,
    previewMimeType: resized.mimeType,
    previewWidth: resized.width,
    previewHeight: resized.height,
    originalBytes: resized.originalBytes,
  };
}
