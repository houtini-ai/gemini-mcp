import * as z from 'zod';
import { registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { getViewerPayload } from '../utils/viewer-payload-store.js';
import { VIEWER_PAYLOAD_TOOL } from '../utils/viewer-ref.js';
import type { ToolContext } from './types.js';

export { VIEWER_PAYLOAD_TOOL };

/**
 * App-only tool the MCP App viewers call to recover their view payload when
 * the host forwarded the tool result without `structuredContent`
 * (Claude Desktop — see src/utils/viewer-payload-store.ts). Marked
 * `visibility: ['app']` so hosts that honour it hide it from the model.
 */
export function register(ctx: ToolContext): void {
  registerAppTool(
    ctx.server,
    VIEWER_PAYLOAD_TOOL,
    {
      title: 'Viewer payload (internal)',
      description:
        'Internal helper used by the Gemini MCP App viewers to fetch their display data. ' +
        'Not for model use — it returns nothing useful outside the viewer iframe.',
      inputSchema: {
        ref: z.string().describe('The [viewer-ref …] token from a tool result'),
      },
      _meta: {
        ui: { visibility: ['app'] },
      },
    },
    async ({ ref }) => {
      const payload = getViewerPayload(ref);
      if (!payload) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Unknown or expired viewer ref: ${ref}` }],
        };
      }
      // Duplicate into text so the view can still recover it if the host
      // strips structuredContent from tools/call responses too.
      return {
        structuredContent: payload,
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    }
  );
}
