import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import {
  setupApp, setupPathCopy, showDescription, showPrompt, showContent, textOfContent,
  type ToolResultLike,
} from './shared.js';

interface ImageResult {
  imageUrl?: string;
  base64Data?: string;
  mimeType?: string;
  savedPath?: string;
  description?: string;
  prompt?: string;
}

function isImageResult(data: unknown): data is ImageResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as ImageResult;
  return !!(d.imageUrl || d.base64Data || d.savedPath);
}

/**
 * Last resort when the host delivered neither structuredContent nor a usable
 * viewer ref: the inline preview (≤800px JPEG) is always in the content
 * blocks, and the saved path is in the text block.
 */
function fromContent(result: ToolResultLike): ImageResult | undefined {
  const image = result.content?.find(b => b.type === 'image' && b.data);
  if (!image?.data) return undefined;
  const text = textOfContent(result);
  const savedPath = /Image saved \(full-res\): (.+)/.exec(text)?.[1]?.trim();
  return { base64Data: image.data, mimeType: image.mimeType || 'image/jpeg', savedPath };
}

setupApp<ImageResult>('Gemini Image Viewer', isImageResult, render, {
  fromContent,
  unavailableMessage:
    'No image data arrived from the host. The full-resolution file is saved on disk — see the tool result text for its path.',
});

function render(data: ImageResult) {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const container = document.getElementById('panzoom-container')!;
  const img = document.getElementById('img') as HTMLImageElement;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const descEl = document.getElementById('desc')!;
  const promptEl = document.getElementById('prompt')!;
  const promptTextEl = document.getElementById('prompt-text')!;
  const zoomInBtn = document.getElementById('zoom-in')!;
  const zoomOutBtn = document.getElementById('zoom-out')!;
  const zoomResetBtn = document.getElementById('zoom-reset')!;
  const zoomLevelEl = document.getElementById('zoom-level')!;
  const imageDimsEl = document.getElementById('image-dims')!;

  // Prefer media server URL (full-res, bypasses MCP limits) over inline base64.
  // base64Data only appears on the content-block fallback path.
  if (data.imageUrl) {
    img.src = data.imageUrl;
  } else if (data.base64Data && data.mimeType) {
    img.src = `data:${data.mimeType};base64,${data.base64Data}`;
  } else if (data.savedPath) {
    // Last resort: convert file path to file:// URI for local viewing
    const fileUrl = 'file:///' + data.savedPath.replace(/\\/g, '/');
    img.src = fileUrl;
  }

  // Show dimensions once loaded
  img.addEventListener('load', () => {
    imageDimsEl.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
  });

  // Initialize panzoom
  const pz: PanzoomObject = Panzoom(container, {
    maxScale: 10,
    minScale: 0.1,
    contain: 'outside',
    canvas: true,
  });

  const imageWrap = container.parentElement!;
  imageWrap.addEventListener('wheel', (e) => {
    pz.zoomWithWheel(e);
    updateZoomLevel();
  });

  function updateZoomLevel() {
    const scale = pz.getScale();
    zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
  }

  zoomInBtn.addEventListener('click', () => { pz.zoomIn(); updateZoomLevel(); });
  zoomOutBtn.addEventListener('click', () => { pz.zoomOut(); updateZoomLevel(); });
  zoomResetBtn.addEventListener('click', () => { pz.reset(); setTimeout(updateZoomLevel, 300); });
  container.addEventListener('panzoomchange', () => updateZoomLevel());

  // Path, description, prompt
  setupPathCopy(data.savedPath, pathDisplay, copyBtn);
  showDescription(data.description, descEl);
  showPrompt(data.prompt, promptEl, promptTextEl);
  showContent(loading, content);
}
