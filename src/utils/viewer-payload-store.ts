/**
 * Short-lived store for MCP App viewer payloads.
 *
 * Claude Desktop forwards `ui/notifications/tool-result` to an app view with
 * `structuredContent` stripped (modelcontextprotocol/ext-apps#696), so a view
 * that reads its data from that field never renders — the "Waiting for
 * image..." widget in issue #12. The host's tools/call proxy is unaffected, so
 * each tool stashes its view payload here, tags the result text with a tiny
 * `[viewer-ref …]` marker, and the view fetches the payload back through the
 * app-only `gemini_viewer_payload` tool when the field is missing.
 *
 * Bounded FIFO: the store only needs to outlive the widget's first render.
 */
import { randomBytes } from 'crypto';

export { VIEWER_PAYLOAD_TOOL, VIEWER_REF_PATTERN, viewerRefLine, extractViewerRef } from './viewer-ref.js';

export const MAX_VIEWER_PAYLOADS = 32;

const store = new Map<string, Record<string, unknown>>();

export function stashViewerPayload(payload: Record<string, unknown>): string {
  const ref = `gm_${randomBytes(6).toString('hex')}`;
  store.set(ref, payload);
  while (store.size > MAX_VIEWER_PAYLOADS) {
    const oldest = store.keys().next().value as string;
    store.delete(oldest);
  }
  return ref;
}

export function getViewerPayload(ref: string): Record<string, unknown> | undefined {
  return store.get(ref);
}

/** Test hook. */
export function clearViewerPayloads(): void {
  store.clear();
}
