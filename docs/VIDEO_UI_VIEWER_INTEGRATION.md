# Video UI Viewer Integration - Testing & Implementation Plan

**Date:** 2025-02-21  
**Status:** Ready for Integration Testing  
**Goal:** Enable inline video playback in Claude Desktop

---

## Current Status

### ✅ Completed Components

1. **Video Viewer HTML** (`src/ui/video-viewer.html`)
   - Responsive video player with controls
   - Metadata display (duration, resolution, aspect ratio, format)
   - Prompt display
   - Copy file path functionality
   - Dark mode support matching Claude Desktop theme

2. **Video Viewer Logic** (`src/ui/video-viewer.ts`)
   - Listens for `ontoolresult` events
   - Expects `result.structuredContent` with `VideoResult` interface
   - Converts file paths to `file://` URLs for playback
   - Handles clipboard operations with fallback

3. **Video Generation Tool** (`src/tools/generate-video.ts`)
   - Fully working video generation
   - Returns `TextContent[]` with report and thumbnail
   - Saves video to disk
   - Optionally generates thumbnail and HTML player

---

## Missing Integration Pieces

### 1. Tool Definition Missing `_meta`

**Current state** (line 2343-2359 in `src/index.ts`):
```typescript
this.server.tool(
  'generate_video',
  'Description...',
  {
    prompt: z.string().describe(...),
    // ... other parameters
  },
  async ({ prompt, model, ... }) => {
    // implementation
  }
);
```

**Needs to become**:
```typescript
this.server.tool(
  'generate_video',
  'Description...',
  {
    prompt: z.string().describe(...),
    // ... other parameters
    _meta: {
      ui: {
        resourceUri: 'ui://gemini/video-viewer.html'
      }
    }
  },
  async ({ prompt, model, ... }) => {
    // implementation
  }
);
```

### 2. Tool Response Missing `structuredContent`

**Current return** (line 2381-2383):
```typescript
return {
  content: result  // result is TextContent[]
};
```

**Needs to become**:
```typescript
return {
  content: result,  // Keep existing text/image content
  structuredContent: {
    videoPath: videoPath,
    mimeType: mimeType,
    duration: duration,
    resolution: resolution,
    aspectRatio: aspectRatio,
    prompt: prompt,
    thumbnailPath: thumbnailPath  // optional
  }
};
```

### 3. Generate Video Tool Missing Return Metadata

The `GenerateVideoTool.execute()` method needs to return both:
- Array of `TextContent | ImageContent` for backwards compatibility
- Structured metadata object for UI viewer

---

## Implementation Plan

### Phase 1: Add Tool Metadata (5 minutes)

**File**: `src/index.ts` line ~2359

**Add**:
```typescript
{
  prompt: z.string().describe(...),
  // ... existing parameters ...
  generateHTMLPlayer: z.boolean().optional().default(true).describe(...),
  _meta: {
    ui: {
      resourceUri: 'ui://gemini/video-viewer.html'
    }
  }
},
```

### Phase 2: Update Tool Response (10 minutes)

**File**: `src/index.ts` line ~2360-2383

**Change from**:
```typescript
const videoTool = new GenerateVideoTool(this.geminiService);
const result = await videoTool.execute({
  prompt,
  model,
  // ... params
});

return {
  content: result
};
```

**To**:
```typescript
const videoTool = new GenerateVideoTool(this.geminiService);
const { content, metadata } = await videoTool.execute({
  prompt,
  model,
  // ... params
});

return {
  content,  // TextContent[] for report and thumbnail
  structuredContent: metadata  // VideoResult for UI viewer
};
```

### Phase 3: Update GenerateVideoTool Return Type (15 minutes)

**File**: `src/tools/generate-video.ts`

**Current return type**: `Promise<(TextContent | ImageContent)[]>`

**New return type**:
```typescript
interface GenerateVideoResult {
  content: (TextContent | ImageContent)[];
  metadata: {
    videoPath: string;
    mimeType: string;
    duration: number;
    resolution: string;
    aspectRatio: string;
    prompt: string;
    thumbnailPath?: string;
  };
}
```

**Update `execute()` method** (line ~82):
```typescript
async execute(args: any): Promise<GenerateVideoResult> {
  try {
    // ... existing generation logic ...
    
    const result = await this.geminiService.generateVideo({...});
    
    // Build content array (existing code)
    const responseContent: (TextContent | ImageContent)[] = [];
    // ... existing report building ...
    
    // Extract metadata for UI viewer
    const metadata = {
      videoPath: result.videoPath,
      mimeType: result.mimeType || 'video/mp4',
      duration: args.durationSeconds || 8,
      resolution: args.resolution || '1080p',
      aspectRatio: args.aspectRatio || '16:9',
      prompt: args.prompt,
      thumbnailPath: thumbnailPath  // from thumbnail generation
    };
    
    return {
      content: responseContent,
      metadata
    };
  } catch (error) {
    // ... error handling
  }
}
```

---

## Testing Protocol

### Test 1: Basic Video Generation (No UI)
```
Generate a 4-second video: "A cat jumping over a fence in slow motion"
```

**Expected**:
- ✅ Video file saved to disk
- ✅ Text report with file path
- ✅ Thumbnail displayed inline (if ffmpeg available)
- ❌ No inline video player yet (needs UI viewer integration)

### Test 2: After UI Integration
```
Generate a 4-second video: "Waves crashing on a beach at sunset"
```

**Expected**:
- ✅ Video file saved to disk
- ✅ Text report with file path
- ✅ Thumbnail displayed inline
- ✅ **NEW**: Inline video player appears in chat
  - Should show video with playback controls
  - Should display metadata (duration, resolution, aspect ratio)
  - Should show the prompt used
  - Should have "Copy path" button

### Test 3: Error Handling
```
Generate a video with invalid parameters (deliberately trigger an error)
```

**Expected**:
- ✅ Clear error message
- ✅ No UI viewer attempt
- ✅ Helpful troubleshooting suggestions

---

## Verification Checklist

After implementation:

- [ ] Build succeeds: `npm run build`
- [ ] Type checking passes
- [ ] Video generation still works (backwards compatibility)
- [ ] `_meta.ui.resourceUri` present in tool definition
- [ ] Tool returns both `content` and `structuredContent`
- [ ] `structuredContent` matches `VideoResult` interface in viewer
- [ ] Restart Claude Desktop to load new MCP version
- [ ] Test basic video generation
- [ ] **NEW**: Inline video player appears in chat
- [ ] Video plays correctly in viewer
- [ ] Metadata displays correctly
- [ ] Copy path button works
- [ ] Prompt displays if present
- [ ] Thumbnail shows if available

---

## Known Potential Issues

### 1. File Path Format
Video viewer converts paths to `file://` URLs. Windows paths need proper escaping:
- Input: `C:\videos\output.mp4`
- Converted: `file://C:/videos/output.mp4`

The viewer handles this conversion automatically (line 33-37 in video-viewer.ts).

### 2. MIME Type Handling
Gemini API sometimes doesn't return `mimeType`. Viewer defaults to `video/mp4` (line 39 in video-viewer.ts).

### 3. Browser Restrictions
Some browsers block local file access. The `file://` protocol works in Electron (Claude Desktop uses Electron), but might not work if testing in regular browser.

---

## Rollback Plan

If UI viewer causes issues:

1. **Remove `_meta` from tool definition** (line ~2359 in index.ts)
2. **Revert return to `{ content: result }`** (line ~2381-2383)
3. **Rebuild**: `npm run build`
4. **Restart** Claude Desktop

This restores previous working state with text reports and inline thumbnails.

---

## Next Steps

1. **Implement Phase 1-3** changes above
2. **Build and test** with protocol above
3. **Document findings** for future UI viewer implementations
4. **Apply pattern to SVG viewer** once video viewer validated

---

**References:**
- Video viewer implementation: `src/ui/video-viewer.ts`
- Video viewer HTML: `src/ui/video-viewer.html`
- Image viewer example: `src/index.ts` lines 653-656 (has working `_meta`)
- Tool implementation: `src/tools/generate-video.ts`
