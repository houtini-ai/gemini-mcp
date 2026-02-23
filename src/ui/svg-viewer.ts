import { App } from '@modelcontextprotocol/ext-apps';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import { setupPathCopy, showDescription, showPrompt, showContent } from './shared.js';

interface SVGResult {
  svgContent: string;
  savedPath?: string;
  description?: string;
  prompt?: string;
}

const app = new App({ name: 'Gemini SVG Viewer', version: '1.0.0' });

app.ontoolresult = (result: { structuredContent?: SVGResult }) => {
  const data = result.structuredContent;
  if (!data || !data.svgContent) return;
  render(data);
};

app.connect();

function render(data: SVGResult) {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const container = document.getElementById('panzoom-container')!;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const descEl = document.getElementById('desc')!;
  const promptEl = document.getElementById('prompt')!;
  const promptTextEl = document.getElementById('prompt-text')!;
  const zoomInBtn = document.getElementById('zoom-in')!;
  const zoomOutBtn = document.getElementById('zoom-out')!;
  const zoomResetBtn = document.getElementById('zoom-reset')!;
  const zoomLevelEl = document.getElementById('zoom-level')!;

  // Render SVG inline
  container.innerHTML = data.svgContent;

  // Initialize panzoom on the container
  const pz: PanzoomObject = Panzoom(container, {
    maxScale: 10,
    minScale: 0.1,
    contain: 'outside',
    canvas: true,
  });

  // Mouse wheel zoom on the svg-wrap parent
  const svgWrap = container.parentElement!;
  svgWrap.addEventListener('wheel', (e) => {
    pz.zoomWithWheel(e);
    updateZoomLevel();
  });

  function updateZoomLevel() {
    const scale = pz.getScale();
    zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
  }

  zoomInBtn.addEventListener('click', () => {
    pz.zoomIn();
    updateZoomLevel();
  });

  zoomOutBtn.addEventListener('click', () => {
    pz.zoomOut();
    updateZoomLevel();
  });

  zoomResetBtn.addEventListener('click', () => {
    pz.reset();
    setTimeout(updateZoomLevel, 300);
  });

  // Listen for panzoom events to keep level display in sync
  container.addEventListener('panzoomchange', () => updateZoomLevel());

  // Path, description, prompt
  setupPathCopy(data.savedPath, pathDisplay, copyBtn);
  showDescription(data.description, descEl);
  showPrompt(data.prompt, promptEl, promptTextEl);
  showContent(loading, content);
}
