/**
 * The `[viewer-ref …]` marker shared by the server (which appends it to tool
 * result text) and the MCP App viewers (which parse it back out). Kept free of
 * Node imports so the Vite-bundled viewers can import it too.
 */
export const VIEWER_PAYLOAD_TOOL = 'gemini_viewer_payload';
export const VIEWER_REF_PATTERN = /\[viewer-ref (gm_[0-9a-f]{12})\]/;

/** The marker line appended to a tool result's text block. */
export function viewerRefLine(ref: string): string {
  return `[viewer-ref ${ref}]`;
}

export function extractViewerRef(text: string): string | undefined {
  return VIEWER_REF_PATTERN.exec(text)?.[1];
}
