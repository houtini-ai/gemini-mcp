# Gemini MCP Enhancement Requests

**Date:** February 21, 2026  
**Current Version:** 1.1.7  
**Status:** Production - Needs Architecture Refactor

---

## Critical Issues

### 1. Index.ts is 2,610 Lines (PROBLEM)

**Current state:** Monolithic index.ts handles everything:
- Tool registration (17+ tools)
- MCP Apps UI resource loading (4 viewers)
- Image compression logic
- HTML preview generation
- File saving
- Error handling
- All tool business logic

**Why this is broken:**
- Can't find anything quickly
- Changes in one area break others
- Testing is impossible
- Adding new tools means editing 2,600+ line file
- No clear separation of concerns

**What we need:**
```
src/
├── tools/
│   ├── chat/
│   │   └── gemini-chat.ts          // Chat tool isolated
│   ├── research/
│   │   └── deep-research.ts        // Already exists!
│   ├── image/
│   │   ├── generate-image.ts       // Image generation tool
│   │   ├── edit-image.ts           // Image editing tool
│   │   ├── describe-image.ts       // Image description tool
│   │   └── analyze-image.ts        // Image analysis tool
│   ├── video/
│   │   └── generate-video.ts       // Video generation tool
│   ├── svg/
│   │   └── generate-svg.ts         // SVG generation tool (already exists!)
│   ├── landing-page/
│   │   └── generate-landing-page.ts // Landing page tool (already exists!)
│   └── utilities/
│       ├── load-image.ts           // Image loading utility
│       └── prompt-assistant.ts     // Prompt helper
├── viewers/
│   ├── register-viewers.ts         // Centralized viewer registration
│   ├── image-viewer/
│   ├── video-viewer/
│   ├── svg-viewer/
│   └── landing-page-viewer/
├── server/
│   ├── tool-registry.ts            // Auto-discover and register tools
│   └── index.ts                    // MINIMAL: just wire things together
└── utils/
    ├── file-operations.ts          // Save, compress, preview generation
    └── image-compress.ts           // Already exists!
```

**Expected outcome:** index.ts should be <200 lines, just wiring.

---

### 2. No Copyable Links for Generated Assets (CRITICAL UX BUG)

**Problem:** When we generate assets that can't display inline, users have NO way to access them:

**Affected tools:**
- `generate_video` - Returns file path but no clickable link
- `generate_landing_page` - Returns file path but no copy button
- `generate_svg` - SVG viewer doesn't work (see issue #3)

**Current behaviour:**
```
Video saved to: C:\MCP\gemini-mcp\output\video-123.mp4
HTML preview: C:\MCP\gemini-mcp\output\video-123.html
```

User copies path manually. This is broken.

**What we need:**

For videos:
```json
{
  "structuredContent": {
    "videoPath": "C:\\MCP\\gemini-mcp\\output\\video-123.mp4",
    "previewPath": "C:\\MCP\\gemini-mcp\\output\\video-123.html",
    "copyableLink": "file:///C:/MCP/gemini-mcp/output/video-123.html",
    "duration": 8,
    "resolution": "1080p"
  }
}
```

MCP app item should show:
- Video thumbnail (if we have one)
- Copy link button (copies file:// URL)
- Open in browser button
- Download button

Same pattern for landing pages and SVGs.

**Image viewer DOES work** - we're doing this right there:
- Inline preview thumbnail
- Full path visible
- HTML preview link
- This should be the template for other asset types

---

### 3. SVG Viewer Not Working

**Current state:** We register `gemini-svg-viewer` resource but it never displays.

**Test result:**
```bash
# Generate SVG
generate_svg(prompt="technical diagram", outputPath="test.svg")

# What happens:
✓ SVG saved to: C:\MCP\gemini-mcp\test-outputs\test-svg-diagram.svg
✗ No preview shown
✗ No MCP app item
✗ Just text response with file path
```

**Root cause:** Unknown - need to debug:
1. Is viewer HTML loading correctly?
2. Is structuredContent format wrong?
3. Is MCP apps not recognising SVG mime type?

**What we need:**
- SVG should render inline like images do
- Fallback: copy button for file:// URL if inline fails
- HTML preview wrapper (like we do for images) as backup

---

### 4. Video Generation API Quota Issues (DOCUMENTATION)

**Problem:** Video generation hits quota limits quickly.

**Test results:**
```bash
# First video: Works
generate_video(duration=8, resolution="1080p")
✓ Success

# Second video (5 mins later):
❌ Error: 429 RESOURCE_EXHAUSTED
"You exceeded your current quota"
```

**API limitations discovered:**
- 1080p requires 8-second duration (not documented in our tool)
- Quota exhausts after 1-2 videos
- No way to check remaining quota

**What we need:**

1. **Better parameter validation:**
```typescript
if (resolution === '1080p' && durationSeconds !== 8) {
  throw new McpError(
    '1080p resolution requires exactly 8 seconds duration',
    'INVALID_PARAMS'
  );
}
```

2. **Quota checking:**
```typescript
// Before generation
const quota = await checkVideoQuota();
if (quota.remaining < 1) {
  return {
    content: 'Video generation quota exhausted. Resets at: ' + quota.resetTime
  };
}
```

3. **Better error messages:**
```typescript
catch (error) {
  if (error.code === 429) {
    return 'Quota exceeded. Google limits video generation heavily. ' +
           'Try again in 1 hour or use a different API key.';
  }
}
```

---

### 5. Image Compression Works But Needs Documentation

**Current state:** We compress images correctly:
- `compressForViewer()` - Aggressive compression for MCP preview (<1MB)
- `compressForInline()` - Moderate compression
- Full resolution saved to disk

**Test results:**
```
Original: 2.4MB
Preview: 180KB (13.3x compression)
✓ Under 1MB MCP limit
✓ Instant preview in Claude Desktop
✓ Full quality available on disk
```

This is working well! But needs documenting:

**What we need in README:**
```markdown
### Image Compression Strategy

All generated images use a two-tier approach:

1. **Full Resolution** - Saved to disk (user-specified path or output dir)
2. **Preview Thumbnail** - JPEG compressed to ~150-300KB for instant display

The preview uses aggressive compression (quality=60, max 800x600) to stay 
well under MCP's 1MB protocol limit. Full quality is always preserved on disk.

**Why this matters:** Without compression, 4K images (3-5MB) would fail to 
display in Claude Desktop. The preview shows immediately whilst full quality 
remains accessible.
```

---

### 6. HTML Preview Generation is Duplicated

**Problem:** We generate HTML previews in three places:
1. `createImagePreviewHtml()` in index.ts (images)
2. Landing page viewer (landing pages)
3. Video viewer (videos)

Same code, different files.

**What we need:**
```typescript
// src/utils/preview-generator.ts

export interface PreviewOptions {
  assetPath: string;
  assetType: 'image' | 'video' | 'svg' | 'landing-page';
  prompt: string;
  description?: string;
  metadata?: Record<string, any>;
}

export async function generatePreviewHtml(
  options: PreviewOptions
): Promise<string> {
  // Single template with asset-type-specific rendering
}
```

Then:
```typescript
// In each tool
const previewPath = await generatePreviewHtml({
  assetPath: savedPath,
  assetType: 'video',
  prompt,
  metadata: { duration, resolution }
});
```

---

### 7. Error Handling is Inconsistent

**Problem:** Some tools use `McpError`, some use raw `Error`, some return structured errors.

**Example inconsistency:**
```typescript
// Tool A
throw new McpError('Invalid params', 'INVALID_PARAMS');

// Tool B
throw new Error('Invalid params');

// Tool C
return {
  content: createToolResult(false, 'Invalid params')
};
```

**What we need:**

Standard error wrapper for all tools:
```typescript
// src/server/tool-wrapper.ts

export function wrapTool<T extends ZodSchema>(
  name: string,
  schema: T,
  handler: (params: z.infer<T>) => Promise<any>
) {
  return async (params: unknown) => {
    try {
      // Validate params
      const validated = schema.parse(params);
      
      // Execute handler
      const result = await handler(validated);
      
      // Normalise response format
      return normaliseToolResponse(result);
      
    } catch (error) {
      return handleToolError(name, error);
    }
  };
}
```

Then every tool becomes:
```typescript
registerTool('my_tool', wrapTool(
  'my_tool',
  mySchema,
  async (params) => {
    // Just business logic, errors handled automatically
  }
));
```

---

### 8. Viewer Registration is Fragile

**Current code:**
```typescript
try {
  const imageViewerHtml = await readFile(/* path */);
  registerAppResource(/* ... */);
  logger.info('Image viewer registered');
} catch (error) {
  logger.warn('Failed to load image viewer');
}

// Repeated 4 times for each viewer
```

**Problems:**
- Silent failures (just warns, continues)
- No way to know which viewers actually loaded
- Duplicated registration code
- Path resolution is brittle

**What we need:**
```typescript
// src/viewers/register-viewers.ts

interface ViewerConfig {
  name: string;
  resourceId: string;
  uri: string;
  htmlPath: string;
}

const VIEWERS: ViewerConfig[] = [
  {
    name: 'Image Viewer',
    resourceId: 'gemini-image-viewer',
    uri: 'ui://gemini/image-viewer.html',
    htmlPath: './image-viewer/src/ui/image-viewer.html'
  },
  // ... others
];

export async function registerAllViewers(server: McpServer) {
  const results = await Promise.allSettled(
    VIEWERS.map(v => registerViewer(server, v))
  );
  
  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  logger.info('Viewer registration complete', {
    succeeded: succeeded.length,
    failed: failed.length,
    available: succeeded.map(r => r.value.name)
  });
  
  if (failed.length > 0) {
    logger.error('Some viewers failed to load', {
      failures: failed.map((r, i) => ({
        viewer: VIEWERS[i].name,
        error: r.reason
      }))
    });
  }
}
```

---

## Suggested Refactor Plan

### Phase 1: Tool Extraction (Week 1)
1. Move each tool to own file in `src/tools/[category]/`
2. Create `tool-wrapper.ts` for consistent error handling
3. Update index.ts to import and register (still >1000 lines but better)

### Phase 2: Viewer Centralisation (Week 1)
1. Create `src/viewers/register-viewers.ts`
2. Move all viewer registration logic
3. Add proper error reporting

### Phase 3: Asset Link UX (Week 2)
1. Add copyable file:// links to all asset types
2. Ensure MCP app items have copy buttons
3. Add fallback HTML previews for everything

### Phase 4: Preview Generation (Week 2)
1. Create unified `preview-generator.ts`
2. Replace duplicated HTML generation
3. Add tests

### Phase 5: Clean Index (Week 2)
1. Move file operations to `src/utils/file-operations.ts`
2. Create `src/server/tool-registry.ts` for registration
3. Reduce index.ts to <200 lines

### Phase 6: Documentation (Week 3)
1. Document compression strategy
2. Document API quota limits
3. Add troubleshooting guide for each asset type

---

## Questions for Discussion

1. **Tool registration:** Auto-discovery or explicit imports?
   - Auto: Scan `src/tools/**/*.ts` and register anything exporting `ToolDefinition`
   - Explicit: Import each tool manually (current approach, safer)

2. **Viewer fallbacks:** What if inline preview fails?
   - Always generate HTML preview
   - Always show copyable file:// link
   - Both?

3. **SVG viewer:** Debug or just use HTML preview?
   - Inline SVG in MCP apps would be nice
   - HTML preview works fine as fallback
   - Worth the debugging time?

4. **Video quota:** How to handle gracefully?
   - Pre-check quota before generation?
   - Just better error messages?
   - Document expected limits?

5. **Error standardisation:** Breaking change or gradual?
   - Could break existing tool consumers
   - But current inconsistency is worse
   - Version bump to 2.0?

---

## Success Metrics

After refactor, we should have:

✅ index.ts <200 lines  
✅ All tools in separate files  
✅ Consistent error handling across all tools  
✅ Copyable links for all asset types  
✅ Clear documentation of compression strategy  
✅ Known API quota limits documented  
✅ Viewer registration centralised with error reporting  
✅ SVG viewer working OR documented why HTML fallback is used  

---

**Priority order:**
1. Asset link UX (critical - users can't access their files)
2. Tool extraction (critical - maintenance nightmare)
3. Viewer centralisation (important - fragile)
4. Error handling (important - inconsistent)
5. Documentation (important - compression works but undocumented)
6. Preview generation cleanup (nice to have)

**Estimated effort:** 2-3 weeks for complete refactor