import { App } from '@modelcontextprotocol/ext-apps';
import { resolveViewData, textOfContent, type ToolResultLike } from './view-data.js';

export { resolveViewData, extractViewerRef, textOfContent } from './view-data.js';
export type { ContentBlock, ToolResultLike } from './view-data.js';

/**
 * Shared CSS variables and reset used by all Gemini MCP viewers.
 * Injected at runtime so each viewer HTML can stay minimal.
 */
export const BASE_STYLES = `
  :root {
    color-scheme: light dark;
    /* Light mode defaults */
    --bg: var(--color-background-primary, #ffffff);
    --panel: var(--color-background-secondary, #f3f4f6);
    --text: var(--color-text-primary, #1a1a1a);
    --text-secondary: var(--color-text-secondary, #6b7280);
    --border: var(--color-border-default, #d1d5db);
    --accent: var(--color-accent-primary, #059669);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: var(--color-background-primary, #111827);
      --panel: var(--color-background-secondary, #1f2937);
      --text: var(--color-text-primary, #f3f4f6);
      --text-secondary: var(--color-text-secondary, #9ca3af);
      --border: var(--color-border-default, #374151);
      --accent: var(--color-accent-primary, #6ee7b7);
    }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    gap: 16px;
  }

  .loading {
    margin-top: 60px;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
  }

  .content { display: none; width: 100%; max-width: 900px; }

  .meta {
    width: 100%;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.6;
    margin-top: 12px;
    color: var(--text);
  }

  .path {
    font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
    font-size: 12px;
    color: var(--accent);
    word-break: break-all;
  }

  .meta-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 4px 12px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }
  .copy-btn:hover {
    background: var(--panel);
    border-color: var(--accent);
    color: var(--accent);
  }
  .copy-btn.copied {
    color: var(--accent);
    border-color: var(--accent);
    background: transparent;
  }

  .desc {
    margin-top: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }

  .prompt-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }

  .prompt-label {
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .no-path {
    color: var(--text-secondary);
    font-style: italic;
    font-size: 12px;
  }

  /* Zoom controls bar */
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-top: 8px;
  }
  .zoom-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.15s ease;
    line-height: 1;
  }
  .zoom-btn:hover {
    background: var(--panel);
    border-color: var(--accent);
    color: var(--accent);
  }
  .zoom-level {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: center;
    font-family: var(--font-mono, 'Menlo', 'Consolas', monospace);
  }

  /* Specs row (video) */
  .specs {
    margin-top: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
  .spec-item {
    display: inline-block;
    margin-right: 16px;
  }
  .spec-label {
    color: var(--text-secondary);
    font-weight: 600;
  }
`;

// ─── Tool result → view data ─────────────────────────────────────────────────

export interface SetupAppOptions<T> {
  /**
   * Last-resort builder from the plain content blocks, used when neither
   * structuredContent nor the stashed payload is available.
   */
  fromContent?: (result: ToolResultLike) => T | undefined;
  /** Shown in place of the placeholder when nothing renderable arrives. */
  unavailableMessage?: string;
}

/**
 * Wire an MCP App: connect, resolve the tool result into view data through the
 * fallbacks in view-data.ts, and render exactly once. When a result arrives
 * that cannot be rendered, the placeholder is replaced with an explanation
 * rather than spinning forever. There is deliberately no pre-result timeout:
 * hosts may mount the widget when the tool starts, and a video takes minutes.
 */
export function setupApp<T>(
  name: string,
  guard: (data: unknown) => data is T,
  render: (data: T) => void,
  options: SetupAppOptions<T> = {},
): App {
  const app = new App({ name, version: '1.0.0' });
  const loading = () => document.getElementById('loading');
  let settled = false; // a result is being resolved or has been rendered
  let connected: Promise<unknown> = Promise.resolve();

  const unavailable = (message: string) => {
    const el = loading();
    if (el) el.textContent = message;
  };

  // Handlers must be registered before connect(): the host may deliver the
  // result as soon as the handshake completes.
  app.ontoolresult = (result: ToolResultLike) => {
    if (settled) return;
    settled = true;
    if (result.isError) {
      unavailable(`The tool reported an error:\n${textOfContent(result) || 'see the chat for details.'}`);
      return;
    }
    // .then rather than await: awaiting a generic Promise<T> yields Awaited<T>,
    // which TypeScript can't unify with the T the render callback expects.
    resolveViewData(app, connected, result, guard).then(resolved => {
      const data = resolved ?? options.fromContent?.(result);
      if (!data) {
        settled = false; // let a later, complete result still render
        unavailable(options.unavailableMessage ?? DEFAULT_UNAVAILABLE);
        return;
      }
      render(data);
    });
  };

  // Resolve (not reject) on failure: resolveViewData awaits this promise, and a
  // rejected one would surface as an unhandled rejection when no result comes.
  connected = app.connect().catch(err => {
    console.error('[gemini viewer] app.connect() failed', err);
    unavailable('Could not connect to the host. The file is saved on disk — see the tool result for its path.');
  });

  return app;
}

const DEFAULT_UNAVAILABLE =
  'No preview data arrived from the host. The file is saved on disk — see the tool result text for its path.';

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/**
 * Copy text to clipboard with fallback for sandboxed iframes.
 */
export async function copyToClipboard(
  text: string,
  button: HTMLButtonElement,
  originalText: string,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    flashButton(button, originalText);
  } catch {
    // Fallback for sandboxed environments
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:absolute;left:-9999px';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      flashButton(button, originalText);
    } catch {
      button.textContent = 'Copy failed';
      setTimeout(() => { button.textContent = originalText; }, 2000);
    }
    document.body.removeChild(el);
  }
}

function flashButton(btn: HTMLButtonElement, originalText: string) {
  btn.textContent = 'Copied!';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove('copied');
  }, 2000);
}

/**
 * Wire up the standard path display + copy button.
 */
export function setupPathCopy(
  path: string | undefined,
  pathEl: HTMLElement,
  copyBtn: HTMLButtonElement,
): void {
  if (path) {
    pathEl.textContent = path;
    copyBtn.style.display = 'block';
    copyBtn.addEventListener('click', () => copyToClipboard(path, copyBtn, 'Copy path'));
  } else {
    pathEl.innerHTML = '<span class="no-path">Not saved to disk</span>';
  }
}

/**
 * Show prompt section if prompt text is available.
 */
export function showPrompt(prompt: string | undefined, container: HTMLElement, textEl: HTMLElement): void {
  if (prompt) {
    textEl.textContent = prompt;
    container.style.display = 'block';
  }
}

/**
 * Show description if available.
 */
export function showDescription(desc: string | undefined, el: HTMLElement): void {
  if (desc) {
    el.textContent = desc;
    el.style.display = 'block';
  }
}

/**
 * Transition from loading state to content state.
 */
export function showContent(loadingEl: HTMLElement, contentEl: HTMLElement, displayMode = 'block'): void {
  loadingEl.style.display = 'none';
  contentEl.style.display = displayMode;
}
