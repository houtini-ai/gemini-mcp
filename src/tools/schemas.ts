import * as z from 'zod';

/**
 * Shared Zod schema for image input, used by describe_image, analyze_image,
 * generate_image (reference images), and edit_image.
 *
 * Images can be provided in two ways:
 *  1. Inline base64: set `data` (base64 string) and `mimeType`
 *  2. File path:     set `filePath` — the tool loads the image server-side,
 *                    bypassing the MCP transport limit entirely.
 *
 * Use `filePath` for large images (>1 MB) to avoid MCP transport failures.
 * The `load_image_from_path` tool returns a filePath you can pass directly.
 */
export const imageInputSchema = z.object({
  data: z.string()
    .optional()
    .describe('Base64 encoded image data'),
  filePath: z.string()
    .optional()
    .describe(
      'Local file path to the image (alternative to base64 data). ' +
      'The image is loaded server-side, bypassing MCP transport limits. ' +
      'Use the filePath returned by load_image_from_path.'
    ),
  mimeType: z.string()
    .optional()
    .describe('MIME type of the image (e.g., image/png, image/jpeg). Required when using data, auto-detected from filePath.'),
  thoughtSignature: z.string()
    .optional()
    .describe(
      'Thought signature from a previous generate_image or edit_image call. ' +
      'Required for conversational editing with Gemini 3 Pro Image. ' +
      'Pass the thoughtSignature from the previous response to maintain edit context.'
    ),
  mediaResolution: z.enum([
    'MEDIA_RESOLUTION_LOW',
    'MEDIA_RESOLUTION_MEDIUM',
    'MEDIA_RESOLUTION_HIGH',
    'MEDIA_RESOLUTION_ULTRA_HIGH'
  ]).optional().describe(
    'Per-image resolution override. LOW=280 tokens (75% savings), MEDIUM=560 tokens (50% savings), ' +
    'HIGH=1120 tokens (default), ULTRA_HIGH=2000+ tokens (max detail, per-image only)'
  )
});
