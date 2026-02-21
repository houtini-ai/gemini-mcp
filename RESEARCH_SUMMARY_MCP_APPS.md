# Gemini MCP - MCP Apps Research Summary

**Date:** 2026-02-21  
**Research Method:** Gemini 3 Flash Preview with grounding  
**Status:** ✅ COMPLETE - Ready for implementation

---

## Key Findings

### 1. Current Package Versions (Feb 2026)

**Verified from npm registry:**
- `@modelcontextprotocol/ext-apps`: **v1.0.1** (latest stable, released Jan 2026)
- `@modelcontextprotocol/sdk`: **v1.27.0** (latest stable)

**Current Gemini MCP versions:**
- ext-apps: ^1.0.1 ✅ (up to date)
- sdk: ^1.25.3 ⚠️ (should update to ^1.27.0)

### 2. The HANDOVER Document Is WRONG

**What it claims:**
> "Solution: Use standard MCP image content blocks"
> "Images now display inline using MCP specification"

**Reality:**
- Standard image content blocks (`{ type: 'image', data: '...'}`) do NOT display inline in Claude Desktop
- Only MCP Apps with UI resources display inline
- The "solution" described was never actually implemented
- Current code uses `server.registerTool()`, NOT `registerAppTool()`

### 3. Correct Implementation Pattern

**Required imports:**
```typescript
import { 
  registerAppTool, 
  registerAppResource, 
  RESOURCE_MIME_TYPE 
} from "@modelcontextprotocol/ext-apps/server";
```

**Tool registration:**
```typescript
registerAppTool(
  server,
  "generate_image",
  {
    description: "...",
    inputSchema: { /* ... */ },
    _meta: {
      ui: { resourceUri: "ui://gemini/image-viewer.html" }
    }
  },
  async (params) => {
    return {
      structuredContent: {  // ← UI receives this
        imageData: compressedBase64,
        mimeType: 'image/jpeg',
        // ... metadata
      },
      content: [{  // ← LLM sees this
        type: 'text',
        text: 'Image generated!'
      }]
    };
  }
);
```

**UI resource registration:**
```typescript
registerAppResource(
  server,
  'gemini-image-viewer',
  'ui://gemini/image-viewer.html',
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({
    contents: [{
      uri: 'ui://gemini/image-viewer.html',
      mimeType: RESOURCE_MIME_TYPE,
      text: imageViewerHtmlContent
    }]
  })
);
```

### 4. UI Component Pattern

**HTML with App integration:**
```html
<!DOCTYPE html>
<html>
<body>
  <div id="preview">Loading...</div>
  
  <script type="module">
    import { App } from "@modelcontextprotocol/ext-apps";
    
    const app = new App({ name: "Image Viewer" });
    
    app.ontoolresult = (result) => {
      const { imageData, mimeType } = result.structuredContent;
      const img = document.createElement('img');
      img.src = `data:${mimeType};base64,${imageData}`;
      document.getElementById('preview').appendChild(img);
    };
    
    app.connect();
  </script>
</body>
</html>
```

### 5. Critical Technical Details

**outputSchema is OPTIONAL:**
- Not required in v1.0.1
- Can be added for validation but not mandatory

**Both structuredContent AND content allowed:**
- Can return both in same response
- `structuredContent` → UI App receives
- `content` → LLM sees (fallback for non-Apps clients)

**CSP configuration:**
- Bundled single-file HTML recommended (via vite-plugin-singlefile)
- External resources require `_meta.ui.csp` configuration
- Default is deny-by-default sandbox

**Size management:**
- Compress images to ~150KB for inline preview
- Exclude thoughtSignatures (850KB!) from response
- Use file-based editing instead of thoughtSignature persistence

### 6. Claude Desktop Support

**Confirmed:** Claude Desktop (web and desktop) fully supports MCP Apps as of January 2026.

**Also supported:**
- Visual Studio Code (Insiders)
- Goose
- ChatGPT
- Postman
- MCPJam

### 7. Build Configuration

**Vite bundling:**
```typescript
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

**Build scripts:**
```json
{
  "build:server": "tsc -p tsconfig.server.json",
  "build:ui": "vite build",
  "build": "npm run build:server && npm run build:ui"
}
```

---

## Implementation Readiness

✅ **Research complete**  
✅ **Patterns verified**  
✅ **Package versions confirmed**  
✅ **Implementation plan created**  

**Next step:** Implement the UI component and server changes per IMPLEMENTATION_PLAN_MCP_APPS.md

---

## Article Opportunities

This research reveals several article angles:

1. **"When Documentation Lies: The MCP Apps Discovery Story"**
   - How a handover document described a solution that was never implemented
   - The difference between MCP Apps and standard content blocks
   - Why Claude Desktop doesn't show standard image blocks inline

2. **"MCP Apps vs Standard Content Blocks: What Actually Works"**
   - Technical comparison of the two approaches
   - When to use which pattern
   - Real-world implementation examples

3. **"State-of-the-Art MCP Development: Using Gemini for Research"**
   - How to verify current package versions
   - Using grounding to find authoritative sources
   - Avoiding outdated documentation pitfalls

---

**Research conducted:** 2026-02-21 09:00-10:00 GMT  
**Model used:** gemini-3-flash-preview with grounding enabled  
**Sources verified:** npm registry, official MCP documentation, ext-apps repository  
**Confidence:** HIGH - All findings cross-referenced with authoritative sources
