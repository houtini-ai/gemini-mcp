import { App } from '@modelcontextprotocol/ext-apps';

interface ThoughtSignaturePart {
  type: string;
  thoughtSignature: string;
}

interface ImageResult {
  base64Data: string;
  mimeType: string;
  savedPath?: string;
  description?: string;
  prompt?: string;  // Add prompt field
  thoughtSignatures?: ThoughtSignaturePart[];
}

const app = new App({ name: 'Gemini Image Viewer', version: '1.0.0' });

app.ontoolresult = (result: { structuredContent?: ImageResult }) => {
  const data = result.structuredContent;
  if (!data || !data.base64Data) return;
  render(data);
};

app.connect();

function render(data: ImageResult) {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const img = document.getElementById('img') as HTMLImageElement;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const descEl = document.getElementById('desc')!;
  const promptEl = document.getElementById('prompt')!;
  const promptTextEl = document.getElementById('prompt-text')!;

  img.src = `data:${data.mimeType};base64,${data.base64Data}`;

  if (data.savedPath) {
    pathDisplay.textContent = data.savedPath;
    copyBtn.style.display = 'block';
    copyBtn.addEventListener('click', async () => {
      try {
        // Try modern clipboard API first
        await navigator.clipboard.writeText(data.savedPath!);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy path';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        // Fallback: Create temporary input and use execCommand
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

  if (data.description) {
    descEl.textContent = data.description;
    descEl.style.display = 'block';
  }

  if (data.prompt) {
    promptTextEl.textContent = data.prompt;
    promptEl.style.display = 'block';
  }

  loading.style.display = 'none';
  content.style.display = 'block';
}
