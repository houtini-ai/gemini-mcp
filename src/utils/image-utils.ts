import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import logger from './logger.js';
import { compressForViewer } from './image-compress.js';

export async function saveImageToFile(base64Data: string, outputPath: string): Promise<string> {
  const absolutePath = resolve(outputPath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(base64Data, 'base64'));
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
        <img src="${imageFilename}" alt="Generated image">
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
        <a href="${imageFilename}" download class="btn">Download Image</a>
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
  previewPath: string;
  previewImageData: string;
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
  const compressed = await compressForViewer(base64Data, mimeType);

  logger.info('Image saved successfully', {
    savedPath,
    previewPath,
    originalKB: Math.round(compressed.originalBytes / 1024),
    previewKB: Math.round(compressed.previewBytes / 1024),
    compressionRatio: (compressed.originalBytes / compressed.previewBytes).toFixed(1) + 'x',
  });

  return {
    savedPath,
    previewPath,
    previewImageData: compressed.base64,
  };
}
