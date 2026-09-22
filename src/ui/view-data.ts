/**
 * Turns an MCP tool result into the data a viewer renders. Pure logic, no DOM
 * and no ext-apps import, so it is unit-tested under Jest.
 */
import { VIEWER_PAYLOAD_TOOL, extractViewerRef as extractRefFromText } from '../utils/viewer-ref.js';

export interface ContentBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResultLike {
  content?: ContentBlock[];
  structuredContent?: unknown;
  isError?: boolean;
}

/** The slice of ext-apps `App` the resolver needs. */
export interface ToolCaller {
  callServerTool(params: { name: string; arguments: Record<string, unknown> }): Promise<unknown>;
}

export function extractViewerRef(result: ToolResultLike): string | undefined {
  for (const block of result.content ?? []) {
    if (block.type === 'text' && block.text) {
      const ref = extractRefFromText(block.text);
      if (ref) return ref;
    }
  }
  return undefined;
}

export function textOfContent(result: ToolResultLike): string {
  return (result.content ?? [])
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text as string)
    .join('\n');
}

/**
 * Resolve a view's data from a tool result.
 *
 * Prefers `structuredContent`. Claude Desktop forwards tool results to app
 * views with that field stripped (modelcontextprotocol/ext-apps#696), so when
 * it is missing the view fetches the payload the server stashed under the
 * `[viewer-ref …]` marker via the app-only `gemini_viewer_payload` tool.
 */
export function resolveViewData<T>(
  app: ToolCaller,
  connected: Promise<unknown>,
  result: ToolResultLike,
  guard: (data: unknown) => data is T,
): Promise<T | undefined> {
  // Typed wrapper: an async generic can't return T directly (Awaited<T>).
  return resolveViewDataImpl(app, connected, result, guard) as Promise<T | undefined>;
}

async function resolveViewDataImpl(
  app: ToolCaller,
  connected: Promise<unknown>,
  result: ToolResultLike,
  guard: (data: unknown) => boolean,
): Promise<unknown> {
  if (guard(result.structuredContent)) return result.structuredContent;

  const ref = extractViewerRef(result);
  if (!ref) return undefined;

  try {
    await connected;
    const fetched = (await app.callServerTool({
      name: VIEWER_PAYLOAD_TOOL,
      arguments: { ref },
    })) as ToolResultLike;
    if (fetched.isError) return undefined;
    if (guard(fetched.structuredContent)) return fetched.structuredContent;
    // The payload is duplicated into the text block in case the host strips
    // structuredContent from tools/call responses as well.
    const text = textOfContent(fetched);
    if (text) {
      const parsed: unknown = JSON.parse(text);
      if (guard(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[gemini viewer] could not fetch view payload', err);
  }
  return undefined;
}
