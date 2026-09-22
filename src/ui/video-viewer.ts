import { setupApp, setupPathCopy, showPrompt, showContent } from './shared.js';

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

function isVideoResult(data: unknown): data is VideoResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as VideoResult;
  return !!(d.videoUrl || d.videoPath);
}

setupApp<VideoResult>('Gemini Video Viewer', isVideoResult, render, {
  unavailableMessage:
    'No video data arrived from the host. The video is saved on disk — see the tool result text for its path.',
});

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
