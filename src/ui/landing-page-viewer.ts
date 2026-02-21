import { App } from '@modelcontextprotocol/ext-apps';

interface LandingPageResult {
  html: string;
  savedPath?: string;
  brief?: string;
  companyName?: string;
}

const app = new App({ name: 'Gemini Landing Page Viewer', version: '1.0.0' });

let currentHtml = '';

app.ontoolresult = (result: { structuredContent?: LandingPageResult }) => {
  const data = result.structuredContent;
  if (!data || !data.html) return;
  render(data);
};

app.connect();

function render(data: LandingPageResult) {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const iframe = document.getElementById('preview-frame') as HTMLIFrameElement;
  const pathDisplay = document.getElementById('path-display')!;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const copyHtmlBtn = document.getElementById('copy-html-btn') as HTMLButtonElement;
  const viewport = document.getElementById('viewport')!;

  currentHtml = data.html;

  iframe.srcdoc = data.html;

  if (data.savedPath) {
    pathDisplay.textContent = data.savedPath;
    copyBtn.style.display = 'block';
    copyBtn.addEventListener('click', async () => {
      await copyToClipboard(data.savedPath!, copyBtn, 'Copy path');
    });
  } else {
    pathDisplay.innerHTML = '<span class="no-path">Not saved to disk</span>';
  }

  copyHtmlBtn.addEventListener('click', async () => {
    await copyToClipboard(currentHtml, copyHtmlBtn, 'Copy HTML');
  });

  const resizeButtons = document.querySelectorAll('.resize-btn');
  resizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.getAttribute('data-size');
      if (!size) return;

      resizeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      viewport.className = 'viewport';
      viewport.classList.add(size);
    });
  });

  loading.style.display = 'none';
  content.style.display = 'flex';
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
    const tempInput = document.createElement('textarea');
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
