# MCP Apps Inline Preview Debugging - Handover Document

**Date:** 21 February 2026  
**Project:** @houtini/gemini-mcp  
**Issue:** MCP Apps inline preview not rendering in Claude Desktop  
**Status:** Protocol working correctly, UI rendering not appearing

---

## Problem Summary

The Gemini MCP server successfully implements MCP Apps according to the specification, but inline UI previews are not rendering in Claude Desktop. Instead, users see only file paths as text output.

**What works:**
- ✅ MCP protocol communication is perfect
- ✅ Claude Desktop advertises MCP Apps support (`io.modelcontextprotocol/ui` extension)
- ✅ `registerAppResource` serves HTML UI correctly
- ✅ Claude Desktop successfully fetches the UI resource
- ✅ `structuredContent` is returned with base64 image data
- ✅ All JSON-RPC communication succeeds

**What doesn't work:**
- ❌ Inline UI preview doesn't render in chat
- ❌ User only sees text output with file paths
- ❌ No interactive HTML component appears

---

## Current Architecture

### Tool Registration (`src/index.ts` line ~491)

```typescript
registerAppTool(
  this.server,
  'generate_image',
  {
    title: 'Generate Image with Gemini',
    description: '...',
    inputSchema: { /* zod schemas */ },
    _meta: {
      ui: {
        resourceUri: 'ui://gemini/image-viewer.html'
      }
    }
  },
  async ({ prompt, model, aspectRatio, imageSize, images, outputPath }) => {
    // Generate image, save to disk
    
    return {
      structuredContent: {
        base64Data: previewImageData,  // Compressed JPEG base64
        mimeType: 'image/jpeg',
        savedPath,
        previewPath,
        description: result.description,
        prompt
      },
      content: [
        { 
          type: 'text', 
          text: `Image saved to: ${savedPath}\nHTML preview: ${previewPath}` 
        }
      ]
    };
  }
);
```

### Resource Registration (`src/index.ts` line ~255)

```typescript
registerAppResource(
  this.server,
  'gemini-image-viewer',
  'ui://gemini/image-viewer.html',
  { 
    mimeType: 'text/html;profile=mcp-app',
    description: 'Interactive image viewer with metadata display'
  },
  async () => ({
    contents: [{
      uri: 'ui://gemini/image-viewer.html',
      mimeType: 'text/html;profile=mcp-app',
      text: imageViewerHtml  // Self-contained HTML with inlined JS
    }]
  })
);
```

### UI Resource (`dist/image-viewer/image-viewer-app.html`)

Self-contained HTML file that:
- Imports `@modelcontextprotocol/ext-apps` client SDK via ESM CDN
- Connects to MCP Apps interface with `app.connect()`
- Listens for `ontoolresult` events
- Receives `structuredContent` and renders image from base64 data

```html
<script type="module">
  import { App } from 'https://esm.sh/@modelcontextprotocol/ext-apps@1.0.1';
  
  const app = new App({ name: 'Gemini Image Viewer', version: '1.0.0' });
  
  app.ontoolresult = (result) => {
    const data = result.structuredContent;
    if (!data || !data.base64Data) return;
    render(data);
  };
  
  app.connect();
</script>
```

---

## Evidence from Logs

From `C:\Users\Richard Baxter\AppData\Roaming\Claude\logs\mcp-server-gemini.log`:

**1. Claude Desktop advertises MCP Apps support:**
```json
{
  "method":"initialize",
  "params":{
    "protocolVersion":"2025-11-25",
    "capabilities":{
      "extensions":{
        "io.modelcontextprotocol/ui":{
          "mimeTypes":["text/html;profile=mcp-app"]
        }
      }
    }
  }
}
```

**2. Resource is registered and listed:**
```json
{
  "jsonrpc":"2.0",
  "id":2,
  "result":{
    "resources":[{
      "uri":"ui://gemini/image-viewer.html",
      "name":"gemini-image-viewer",
      "mimeType":"text/html;profile=mcp-app",
      "description":"Interactive image viewer with metadata display"
    }]
  }
}
```

**3. Claude Desktop fetches the HTML resource:**
```json
{
  "method":"resources/read",
  "params":{"uri":"ui://gemini/image-viewer.html"},
  "jsonrpc":"2.0",
  "id":4
}
```

**4. HTML is served successfully:**
```json
{
  "jsonrpc":"2.0",
  "id":4,
  "result":{
    "contents":[{
      "uri":"ui://gemini/image-viewer.html",
      "mimeType":"text/html;profile=mcp-app",
      "text":"<!DOCTYPE html>\n<html lang=\"en\">..."
    }]
  }
}
```

**5. Tool returns structuredContent:**
```json
{
  "jsonrpc":"2.0",
  "id":5,
  "result":{
    "content":[{
      "type":"text",
      "text":"Image saved to: C:\\MCP\\gemini-mcp\\test-output\\gemini-1771670517189.png\nHTML preview: ..."
    }],
    "structuredContent":{
      "base64Data":"...[8798 chars]...",
      "mimeType":"image/jpeg",
      "savedPath":"C:\\MCP\\gemini-mcp\\test-output\\gemini-1771670517189.png",
      "prompt":"A purple triangle on an orange background"
    }
  }
}
```

**Conclusion:** The protocol is working perfectly. Claude Desktop is receiving all the correct data but not rendering the UI.

---

## Research Findings

### MCP Apps Support Confirmed

According to official documentation:
- **MCP Apps are supported in Claude Desktop** (along with claude.ai, VS Code Insiders, Goose, Postman, MCPJam)
- Available on **Pro, Max, Team, and Enterprise plans**
- Feature was announced January 26, 2026 in MCP blog

### Critical Detail from Documentation

From the official getting started guide:
> "Claude will **prompt you for permission** to display the App. Click '**Always allow**', and you'll see the MCP App render"

**This suggests there should be a permission dialog that the user hasn't seen yet.**

### Reddit User Insight

One Reddit user reported:
> "Claude Desktop doesn't natively let you render a full UI layer on top of MCP yet as it's mostly built around the chat interface."

This was from a month ago, so may be outdated given the January 26 official announcement.

---

## Working Reference Implementation

**CRITICAL INVESTIGATION TASK:** Examine `C:\MCP\better-search-console` which successfully renders MCP Apps dashboards.

User reports:
- Uses Vite build system (may be unnecessary)
- Successfully renders interactive dashboards when requested
- Works in the same Claude Desktop environment

**What to investigate:**

1. **Tool registration differences:**
   - How does it use `registerAppTool`?
   - What `_meta` structure does it use?
   - Any differences in `structuredContent` format?

2. **Resource registration differences:**
   - How is `registerAppResource` called?
   - What MIME type is used?
   - Is the HTML structure different?

3. **Build process:**
   - Why does it use Vite? Is bundling required?
   - What does the final HTML output look like?
   - Are there any build-time transformations?

4. **Client-side code:**
   - How does it use `@modelcontextprotocol/ext-apps` client SDK?
   - Any differences in how `app.connect()` is called?
   - How does it handle `structuredContent`?

5. **Package dependencies:**
   - Check `package.json` for any additional dependencies
   - Are there any MCP Apps-specific packages we're missing?

---

## File Locations

### Gemini MCP Source
- Main server: `C:\MCP\gemini-mcp\src\index.ts`
- UI template: `C:\MCP\gemini-mcp\src\ui\image-viewer.html`
- UI TypeScript: `C:\MCP\gemini-mcp\src\ui\image-viewer.ts`
- Built HTML: `C:\MCP\gemini-mcp\dist\image-viewer\image-viewer-app.html`
- Package: `C:\MCP\gemini-mcp\package.json`

### Reference Implementation
- Source: `C:\MCP\better-search-console\`
- Focus on comparing architecture and build process

### Logs
- Gemini MCP: `C:\Users\Richard Baxter\AppData\Roaming\Claude\logs\mcp-server-gemini.log`
- Better Search Console: `C:\Users\Richard Baxter\AppData\Roaming\Claude\logs\mcp-server-better-search-console.log`
- Main Claude: `C:\Users\Richard Baxter\AppData\Roaming\Claude\logs\main.log`

---

## Environment Details

**Claude Desktop Version:** 1.1.3918  
**Platform:** Windows 10 (10.0.26200)  
**Node.js:** v24.6.0  
**Claude Plan:** Unknown (need to verify Pro/Max/Team/Enterprise status)

**MCP Servers Currently Active:**
- @houtini/gemini-mcp (local build at `C:\MCP\gemini-mcp\dist\index.js`)
- better-search-console (working reference)
- Plus 15+ other MCP servers

---

## Hypotheses to Test

### Hypothesis 1: Permission Dialog Not Appearing
**Test:** Look for permission prompts when generating images. The official docs state users must click "Always allow" for MCP Apps to render.

**Action:** Generate image and carefully watch for any permission dialogs, notifications, or UI prompts.

### Hypothesis 2: Plan Requirement
**Test:** Verify Claude plan level. MCP Apps may require Pro/Max/Team/Enterprise.

**Action:** Check Settings → Account in Claude Desktop to confirm plan level.

### Hypothesis 3: Settings Toggle Required
**Test:** There may be a setting to enable MCP Apps UI rendering.

**Action:** Check Settings → Extensions and Settings → Developer for any MCP Apps-related toggles.

### Hypothesis 4: Build Process Difference
**Test:** Compare our simple HTML file vs better-search-console's Vite build.

**Action:** Examine better-search-console build output and see if bundling/transformation is required.

### Hypothesis 5: Version Incompatibility
**Test:** MCP Apps rendering may not be fully rolled out to Claude Desktop version 1.1.3918.

**Action:** Check for Claude Desktop updates. Compare version to better-search-console working environment.

---

## Next Steps

### Immediate Actions

1. **Investigate better-search-console implementation:**
   ```bash
   # Compare tool registration
   code C:\MCP\better-search-console\src\index.ts
   
   # Check build configuration
   code C:\MCP\better-search-console\vite.config.ts
   code C:\MCP\better-search-console\package.json
   
   # Examine UI files
   dir C:\MCP\better-search-console\ui /s
   ```

2. **Check for permission prompts:**
   - Generate a test image
   - Watch carefully for ANY dialogs or prompts
   - Check for collapsed UI elements in chat
   - Look for "Used Gemini" integration blocks

3. **Verify environment:**
   - Confirm Claude plan level
   - Check for Claude Desktop updates
   - Review Settings → Extensions for MCP Apps options

4. **Compare logs:**
   - Check better-search-console logs when it successfully renders
   - Look for differences in JSON-RPC communication
   - Identify any additional handshake or capability negotiation

### If Permission Dialog is the Issue

The user mentioned: "No - it's more like a code block in that there's a </> symbol that expands the contents. It seems not to be an object with rendering capability"

This suggests the tool response is being treated as data/code rather than as an MCP App. The permission dialog should appear BEFORE this.

### If Build Process is the Issue

Compare our self-contained HTML approach vs Vite bundling:
- Does Vite produce significantly different output?
- Are there any imports that need to be bundled differently?
- Is there additional configuration in the HTML that we're missing?

---

## Code Changes Made This Session

### Attempted Fix 1: Embedded Resources (Reverted)
Initially tried returning HTML as embedded resources in tool response. This was incorrect - MCP Apps use two-part registration (tool + resource).

### Current Correct Implementation
- Tool returns `structuredContent` with image data
- Separate `registerAppResource` serves UI HTML
- Linked via `_meta.ui.resourceUri`

**No further code changes should be needed** - the implementation follows the official spec exactly.

---

## Questions for User

Before proceeding, confirm:

1. **What Claude plan are you on?** (Free/Pro/Max/Team/Enterprise)
2. **Do you see ANY permission prompts or dialogs** when generating images?
3. **Are there Settings → Extensions or Settings → Developer options** related to MCP Apps?
4. **When you use better-search-console to create a dashboard, what exactly happens?** Does a UI appear inline? Is there a permission prompt first?
5. **Can you share a screenshot** of what the better-search-console dashboard looks like when it renders successfully?

---

## Success Criteria

MCP Apps inline preview is working when:
- User generates an image via `generate_image` tool
- Claude Desktop shows a permission prompt (if first time)
- After allowing, an **interactive HTML UI renders inline** in the chat
- The UI shows the generated image with metadata (prompt, file path, copy button)
- No manual browser navigation required
- Experience matches better-search-console dashboard rendering

---

## Additional Resources

### Official Documentation
- MCP Apps specification: https://modelcontextprotocol.io/docs/extensions/apps
- MCP Apps blog announcement (Jan 26, 2026): http://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
- Anthropic MCP overview: https://docs.anthropic.com/en/docs/mcp

### Reference Implementations
- better-search-console (local, working)
- MCP Apps examples: https://github.com/modelcontextprotocol/ext-apps

### Debugging Commands
```bash
# Rebuild gemini-mcp
cd C:\MCP\gemini-mcp && npm run build

# Check better-search-console structure
cd C:\MCP\better-search-console
dir /s *.html
dir /s *.ts

# View logs in real-time
tail -f "C:\Users\Richard Baxter\AppData\Roaming\Claude\logs\mcp-server-gemini.log"
```

---

**End of Handover**

Next Claude instance should:
1. Investigate better-search-console implementation in detail
2. Identify the key difference that makes it work
3. Apply learnings to gemini-mcp
4. Test with user to confirm inline rendering works
