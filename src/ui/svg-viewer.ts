import { App } from '@modelcontextprotocol/ext-apps';

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
  const svgContainer = document.getElementById('svg-container')!;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const descEl = document.getElementById('desc')!;
  const promptEl = document.getElementById('prompt')!;
  const promptTextEl = document.getElementById('prompt-text')!;

  // Render SVG content
  svgContainer.innerHTML = data.svgContent;

  // Display file path if saved
  if (data.savedPath) {
    pathDisplay.textContent = data.savedPath;
    copyBtn.style.display = 'block';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(data.savedPath!);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy path';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        const tempInput = document.createElement('input');
        tempInput.value = data.savedPath!;
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
          document.execCommand('copy');
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy path';
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (fallbackErr) {
          copyBtn.textContent = 'Copy failed';
          setTimeout(() => {
            copyBtn.textContent = 'Copy path';
          }, 2000);
        }
        document.body.removeChild(tempInput);
      }
    });
  } else {
    pathDisplay.innerHTML = '<span class="no-path">Not saved to disk</span>';
  }

  // Display description if available
  if (data.description) {
    descEl.textContent = data.description;
    descEl.style.display = 'block';
  }

  // Display prompt if available
  if (data.prompt) {
    promptTextEl.textContent = data.prompt;
    promptEl.style.display = 'block';
  }

  loading.style.display = 'none';
  content.style.display = 'block';
}