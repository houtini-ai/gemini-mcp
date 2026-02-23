import { App } from '@modelcontextprotocol/ext-apps';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import { setupPathCopy, showDescription, showPrompt, showContent } from './shared.js';

interface ImageResult {
  imageUrl?: string;
  base64Data?: string;
  mimeType?: string;
  savedPath?: string;
  description?: string;
  prompt?: string;
}

const app = new App({ name: 'Gemini Image Viewer', version: '1.0.0' });

app.ontoolresult = (result: { structuredContent?: ImageResult }) => {
  const data = result.structuredContent;
  if (!data || (!data.imageUrl && !data.base64Data)) return;
  render(data);
};

app.connect();

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

  // Prefer media server URL (full-res, bypasses MCP limits) over inline base64
  if (data.imageUrl) {
    img.src = data.imageUrl;
  } else if (data.base64Data && data.mimeType) {
    img.src = `data:${data.mimeType};base64,${data.base64Data}`;
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
