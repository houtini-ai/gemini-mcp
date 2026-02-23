import { App } from '@modelcontextprotocol/ext-apps';
import { setupPathCopy, showPrompt, showContent } from './shared.js';

interface VideoResult {
  videoPath?: string;
  videoUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  prompt?: string;
  htmlPlayerPath?: string;
}

const app = new App({ name: 'Gemini Video Viewer', version: '1.0.0' });

app.ontoolresult = (result: { structuredContent?: VideoResult }) => {
  const data = result.structuredContent;
  if (!data || (!data.videoUrl && !data.videoPath)) return;
  render(data);
};

app.connect();

function render(data: VideoResult) {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const videoWrap = document.getElementById('video-wrap')!;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const specsEl = document.getElementById('specs')!;
  const promptEl = document.getElementById('prompt')!;
  const promptTextEl = document.getElementById('prompt-text')!;

  if (data.videoUrl) {
    // Inline playback via media server URL
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = false;
    video.preload = 'metadata';
    video.src = data.videoUrl;
    if (data.thumbnailUrl) {
      video.poster = data.thumbnailUrl;
    }
    videoWrap.innerHTML = '';
    videoWrap.appendChild(video);
  } else {
    // Fallback: no media server URL available
    const card = document.createElement('div');
    card.className = 'fallback-card';
    card.innerHTML = `
      <div class="fallback-icon">&#127916;</div>
      <div class="fallback-title">Video Generated</div>
      <div class="fallback-subtitle">
        Inline playback is not available. Open the file below in your browser or media player.
      </div>
      ${data.videoPath ? `<div class="fallback-path">${escapeHtml(data.videoPath)}</div>` : ''}
    `;
    videoWrap.innerHTML = '';
    videoWrap.appendChild(card);
  }

  // Path + copy
  setupPathCopy(data.videoPath, pathDisplay, copyBtn);

  // Specs
  const specParts: string[] = [];
  if (data.duration) specParts.push(`<span class="spec-item"><span class="spec-label">Duration:</span> ${data.duration}s</span>`);
  if (data.resolution) specParts.push(`<span class="spec-item"><span class="spec-label">Resolution:</span> ${data.resolution}</span>`);
  if (data.aspectRatio) specParts.push(`<span class="spec-item"><span class="spec-label">Aspect Ratio:</span> ${data.aspectRatio}</span>`);
  if (data.mimeType) specParts.push(`<span class="spec-item"><span class="spec-label">Format:</span> ${data.mimeType}</span>`);
  if (specParts.length > 0) {
    specsEl.innerHTML = specParts.join('');
    specsEl.style.display = 'block';
  }

  // Prompt
  showPrompt(data.prompt, promptEl, promptTextEl);

  showContent(loading, content);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
