# Gemini MCP - MCP Apps Implementation Plan

**Date:** 2026-02-21  
**Target:** Implement proper MCP Apps support for inline image preview in Claude Desktop  
**Current Version:** 1.4.7  
**Target Version:** 1.5.0

---

## Executive Summary

**Problem:** The HANDOVER_image_resources.md document describes a solution that was never actually implemented. The current code uses standard `server.registerTool()` instead of `registerAppTool()` from the MCP Apps extension.

**Solution:** Implement the MCP Apps pattern correctly using state-of-the-art library versions and patterns as of February 2026.

---

## Current State Analysis

### Package Versions (Current)
- `@modelcontextprotocol/ext-apps`: ^1.0.1 ✅ (latest stable)
- `@modelcontextprotocol/sdk`: ^1.25.3 ⚠️ (update to ^1.27.0 recommended)

### What's Currently Implemented
1. ✅ Images save to disk correctly
2. ✅ HTML preview files created
3. ✅ Image compression working
4. ❌ NOT using `registerAppTool()` - using standard `server.registerTool()`
5. ❌ NOT registering UI resource with `registerAppResource()`
6. ❌ NOT importing from `@modelcontextprotocol/ext-apps/server`

### What the Handover Claims (INCORRECT)
The handover says:
> "Solution: Use standard MCP image content blocks"
> "Images now display inline using MCP specification"

**This is FALSE.** Standard MCP image content blocks DO NOT display inline in Claude Desktop. Only MCP Apps with proper UI resources do.

---

## Required Changes

### 1. Update Dependencies

**package.json:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/ext-apps": "^1.0.1",
    "@modelcontextprotocol/sdk": "^1.27.0"  // Update from ^1.25.3
  }
}
```

### 2. Add Proper Imports

**src/index.ts (line 1-20):**
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE
} from '@modelcontextprotocol/ext-apps/server';  // NEW IMPORT
import * as z from 'zod';
// ... rest of imports
```

### 3. Create Image Viewer UI Resource

**Create:** `src/ui/image-viewer-app.html`
- Use bundled single-file approach (vite-plugin-singlefile already configured)
- Implement App class from @modelcontextprotocol/ext-apps
- Handle `app.ontoolresult` to receive image data
- Display image with metadata

### 4. Register UI Resource
**Add after server initialization (around line 450):**
```typescript
// Load bundled image viewer UI
const imageViewerHtml = await readFile(
  join(__dirname, 'image-viewer', 'image-viewer-app.html'),
  'utf-8'
);

// Register the UI resource for image preview
registerAppResource(
  server,
  'gemini-image-viewer',
  'ui://gemini/image-viewer.html',
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({
    contents: [{
      uri: 'ui://gemini/image-viewer.html',
      mimeType: RESOURCE_MIME_TYPE,
      text: imageViewerHtml
    }]
  })
);
```

### 5. Convert generate_image Tool

**Replace `server.registerTool()` with `registerAppTool()`:**

```typescript
// BEFORE (current - line ~462):
this.server.registerTool(
  'generate_image',
  { 
    title: 'Generate Image...',
    inputSchema: { /* ... */ }
  },
  async ({ prompt, model, ... }) => {
    // ...
  }
);

// AFTER (new MCP Apps pattern):
registerAppTool(
  this.server,
  'generate_image',
  {
    title: 'Generate Image with Gemini',
    description: 'Generate image with inline preview',
    inputSchema: {
      prompt: z.string().describe('Image description'),
      model: z.string().optional(),
      aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']).optional(),
      // ... other params
    },
    _meta: {
      ui: {
        resourceUri: 'ui://gemini/image-viewer.html'
      }
    }
  },
  async (params) => {
    // Generate image (existing logic)
    const result = await this.imageService.generateImage(params);
    const firstImage = result.parts.find(p => p.type === 'image' && p.base64Data);
    
    // Save to disk (existing logic)
    const savedPath = await saveImageToFile(...);
    const previewPath = await createImagePreviewHtml(...);
    
    // Compress for inline preview
    const compressed = await compressForViewer(
      firstImage.base64Data,
      firstImage.mimeType || 'image/png'
    );
    
    return {
      // Data for UI App (this is what the preview receives)
      structuredContent: {
        imageData: compressed.base64,  // Compressed ~150KB JPEG
        mimeType: 'image/jpeg',
        savedPath,
        previewPath,
        prompt: params.prompt,
        description: result.description,
        metadata: {
          originalSizeKB: Math.round(compressed.originalBytes / 1024),
          previewSizeKB: Math.round(compressed.previewBytes / 1024)
        }
      },
      // Text for LLM and fallback
      content: [
        {
          type: 'text',
          text: `Image generated successfully!\n\nSaved to: ${savedPath}\nHTML preview: ${previewPath}\n\n${result.description || ''}`
        }
      ]
    };
  }
);
```

### 6. Convert edit_image Tool

**Same pattern - replace `server.registerTool()` with `registerAppTool()`:**

```typescript
registerAppTool(
  this.server,
  'edit_image',
  {
    title: 'Edit Image with Gemini',
    description: 'Edit images with inline preview',
    inputSchema: {
      prompt: z.string(),
      images: z.array(imageInputSchema).min(1),
      // ... other params
    },
    _meta: {
      ui: {
        resourceUri: 'ui://gemini/image-viewer.html'
      }
    }
  },
  async (params) => {
    // Same implementation pattern as generate_image
    // Return structuredContent + content
  }
);
```

### 7. Build UI with Vite

**Update vite.config.ts (if needed):**
```typescript
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist/image-viewer',
    rollupOptions: {
      input: 'src/ui/image-viewer-app.html'
    }
  }
});
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "build:server": "tsc -p tsconfig.server.json",
    "build:ui": "vite build --config vite.config.ts",
    "build": "npm run build:server && npm run build:ui"
  }
}
```

---

## Implementation Steps

### Phase 1: Preparation
1. ✅ Research current MCP Apps specification (DONE via Gemini)
2. ✅ Verify package versions (DONE)
3. ✅ Create implementation plan (THIS DOCUMENT)
4. ⏳ Create handover correction document

### Phase 2: UI Component
1. Create `src/ui/image-viewer-app.html` with App integration
2. Test UI bundle build with Vite
3. Verify single-file output in `dist/image-viewer/`

### Phase 3: Server Changes
1. Update imports to include `@modelcontextprotocol/ext-apps/server`
2. Register UI resource with `registerAppResource()`
3. Convert `generate_image` to use `registerAppTool()`
4. Convert `edit_image` to use `registerAppTool()`
5. Update return format to use `structuredContent`

### Phase 4: Testing
1. Build both server and UI: `npm run build`
2. Restart Claude Desktop
3. Test image generation
4. Verify inline preview appears
5. Test image editing
6. Verify no "Tool result too large" errors

### Phase 5: Documentation
1. Update HANDOVER document with CORRECT solution
2. Create QUICK_REFERENCE with working patterns
3. Write article: "MCP Apps vs Standard Content Blocks: What Actually Works"
4. Update README with inline preview feature

---

## Key Technical Decisions

### Why MCP Apps Instead of Standard Image Blocks?

**Standard MCP image content blocks (`{ type: 'image', data: '...', mimeType: '...' }`):**
- ❌ Do NOT display inline in Claude Desktop
- ❌ Only show in tool result text
- ❌ No interactive preview
- ✅ Work for passing images TO tools

**MCP Apps with UI resources:**
- ✅ DO display inline in Claude Desktop
- ✅ Interactive preview in sandboxed iframe
- ✅ Can show metadata, controls, etc.
- ✅ Supported in Claude Desktop, VS Code, Goose

### Why structuredContent Over Image Content Block?

```typescript
// This does NOT show inline preview:
return {
  content: [
    { type: 'image', data: base64, mimeType: 'image/jpeg' }
  ]
};

// This DOES show inline preview:
return {
  structuredContent: {
    imageData: base64,
    mimeType: 'image/jpeg'
  },
  content: [
    { type: 'text', text: 'Image generated!' }
  ]
};
```

The UI resource receives `structuredContent` via `app.ontoolresult`, not the `content` array.

### Size Management Strategy

**Problem:** Gemini's thoughtSignatures are 850KB (85% of response)
**Solution:** Exclude from response entirely, use file-based editing instead

```typescript
// DON'T return thoughtSignatures to Claude:
return {
  structuredContent: {
    imageData: compressedBase64,  // 150KB compressed
    // NO thoughtSignature field
  }
};

// For conversational editing, use file references:
const editedImage = await editImage({
  prompt: "make it blue",
  images: [{ 
    path: savedImagePath  // Load from disk
  }]
});
```

---

## Expected Outcomes

### Before (Current State)
- ✅ Images save to disk
- ✅ HTML preview files created
- ❌ NO inline preview in Claude Desktop
- ❌ User must manually open files

### After (MCP Apps Implementation)
- ✅ Images save to disk (preserved)
- ✅ HTML preview files created (preserved)
- ✅ **INLINE preview displays in Claude Desktop**
- ✅ Interactive UI with metadata
- ✅ Compressed preview (~150KB) stays under 1MB limit
- ✅ Full resolution available via file path

---

## Rollback Plan

If MCP Apps implementation fails:

1. Git revert to current state
2. Keep standard image content blocks
3. Document that Claude Desktop doesn't support inline preview
4. Update handover to reflect reality
5. Recommend users open HTML preview files manually

---

## Success Criteria

1. ✅ Build completes without errors
2. ✅ Claude Desktop recognizes the tool
3. ✅ Calling tool shows inline preview in chat
4. ✅ Preview displays compressed image
5. ✅ No "Tool result too large" errors
6. ✅ Edit tool also shows inline preview
7. ✅ Full resolution files still saved to disk

---

## References

- **MCP Apps Spec:** https://modelcontextprotocol.io/docs/extensions/apps
- **ext-apps Repository:** https://github.com/modelcontextprotocol/ext-apps
- **API Documentation:** https://modelcontextprotocol.github.io/ext-apps/api/
- **Gemini Research:** Verified via gemini-3-flash-preview with grounding (2026-02-21)

---

**NEXT ACTION:** Create the UI component (`src/ui/image-viewer-app.html`)
