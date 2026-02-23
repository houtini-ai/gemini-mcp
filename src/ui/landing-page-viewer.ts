import { App } from '@modelcontextprotocol/ext-apps';
import { setupPathCopy, copyToClipboard, showContent } from './shared.js';

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
  const viewportWrapper = document.querySelector('.viewport-wrapper')! as HTMLElement;

  currentHtml = data.html;

  // Auto-resize iframe to match its content height after load
  iframe.addEventListener('load', () => {
    resizeIframe();
    // Also observe for delayed renders (images, fonts, etc.)
    const timer = setInterval(resizeIframe, 500);
    setTimeout(() => clearInterval(timer), 5000);
  });

  iframe.srcdoc = data.html;

  function resizeIframe() {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        const height = Math.max(
          doc.body.scrollHeight,
          doc.documentElement?.scrollHeight || 0,
          600 // minimum height
        );
        iframe.style.height = height + 'px';
      }
    } catch {
      // cross-origin fallback — just use a tall default
      iframe.style.height = '3000px';
    }
  }

  setupPathCopy(data.savedPath, pathDisplay, copyBtn);

  copyHtmlBtn.addEventListener('click', () => {
    copyToClipboard(currentHtml, copyHtmlBtn, 'Copy HTML');
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

      // Toggle device-mode wrapper class for mobile/tablet padding & background
      if (size === 'desktop') {
        viewportWrapper.classList.remove('device-mode');
      } else {
        viewportWrapper.classList.add('device-mode');
      }

      // Re-measure after layout transition
      setTimeout(resizeIframe, 350);
    });
  });

  showContent(loading, content, 'flex');
}
