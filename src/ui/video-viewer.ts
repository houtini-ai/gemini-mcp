import { App } from '@modelcontextprotocol/ext-apps';

interface VideoResult {
  videoHtml?: string;
  videoPath: string;
  mimeType: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  prompt?: string;
  thumbnailPath?: string;
  htmlPlayerPath?: string;
}

const app = new App({ name: 'Gemini Video Viewer', version: '1.0.0' });

app.ontoolresult = (result: { structuredContent?: VideoResult }) => {
  const data = result.structuredContent;
  if (!data || (!data.videoHtml && !data.videoPath)) return;
  render(data);
};

app.connect();

function render(data: VideoResult) {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const videoWrap = document.querySelector('.video-wrap')!;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const specsEl = document.getElementById('specs')!;
  const promptEl = document.getElementById('prompt')!;
  const promptTextEl = document.getElementById('prompt-text')!;

  // If we have HTML player content, use iframe
  if (data.videoHtml) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      width: 100%;
      height: 600px;
      border: none;
      display: block;
    `;
    iframe.srcdoc = data.videoHtml;
    videoWrap.innerHTML = '';
    videoWrap.appendChild(iframe);
  } else if (data.htmlPlayerPath) {
    // Fallback: show button to open HTML player
    const playerButton = document.createElement('a');
    playerButton.href = `file://${data.htmlPlayerPath.replace(/\\/g, '/')}`;
    playerButton.target = '_blank';
    playerButton.style.cssText = `
      display: block;
      width: 100%;
      padding: 60px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    playerButton.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
      <div>Open Video Player</div>
      <div style="font-size: 14px; margin-top: 8px; opacity: 0.9;">Click to play video in browser</div>
    `;
    
    playerButton.addEventListener('mouseenter', () => {
      playerButton.style.transform = 'translateY(-2px)';
      playerButton.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
    });
    
    playerButton.addEventListener('mouseleave', () => {
      playerButton.style.transform = 'translateY(0)';
      playerButton.style.boxShadow = 'none';
    });
    
    videoWrap.innerHTML = '';
    videoWrap.appendChild(playerButton);
  }

  // Display file path
  pathDisplay.textContent = data.videoPath;
  copyBtn.style.display = 'block';
  copyBtn.addEventListener('click', async () => {
    await copyToClipboard(data.videoPath, copyBtn, 'Copy path');
  });

  // Display video specifications
  const specs = [
    `<span class="spec-item"><span class="spec-label">Duration:</span> ${data.duration}s</span>`,
    `<span class="spec-item"><span class="spec-label">Resolution:</span> ${data.resolution}</span>`,
    `<span class="spec-item"><span class="spec-label">Aspect Ratio:</span> ${data.aspectRatio}</span>`,
    `<span class="spec-item"><span class="spec-label">Format:</span> ${data.mimeType || 'video/mp4'}</span>`
  ];
  specsEl.innerHTML = specs.join('');
  specsEl.style.display = 'block';

  // Display prompt if available
  if (data.prompt) {
    promptTextEl.textContent = data.prompt;
    promptEl.style.display = 'block';
  }

  loading.style.display = 'none';
  content.style.display = 'block';
}

async function copyToClipboard(text: string, button: HTMLButtonElement, originalText: string) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  } catch (err) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      button.textContent = 'Copied!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    } catch (fallbackErr) {
      button.textContent = 'Copy failed';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
    document.body.removeChild(tempInput);
  }
}
