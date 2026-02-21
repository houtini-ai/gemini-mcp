# Gemini MCP - Developer Quick Reference

**Last Updated:** 2025-02-21  
**Status:** Post-API-Verification  
**Purpose:** Quick lookup for developers implementing fixes

---

## 🚨 Critical Issues - Fix Immediately

### 1. Thinking Levels (30 minutes)

**Problem:** Lowercase enum values rejected by API

**Files to Change:**
```
src/services/gemini/types.ts        - Line 3 (type definition)
src/tools/gemini-chat.ts            - Add parameter to schema
src/tools/gemini-chat.ts            - Line 58 (wire to service)
```

**Code Changes:**

```typescript
// 1. src/services/gemini/types.ts (LINE 3)
// BEFORE:
export type ThinkingLevel = 'low' | 'medium' | 'high' | 'minimal';

// AFTER:
export type ThinkingLevel = 
  | 'THINKING_LEVEL_UNSPECIFIED'
  | 'MINIMAL'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';
```

```typescript
// 2. src/tools/gemini-chat.ts - Add to inputSchema.properties (after grounding)
thinking_level: {
  type: 'string',
  enum: ['THINKING_LEVEL_UNSPECIFIED', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH'],
  description: 'Thinking depth for Gemini 3 models only.\n' +
              'LOW=fast/cheap, HIGH=deep reasoning. Ignored for non-Gemini-3.'
}
```

```typescript
// 3. src/tools/gemini-chat.ts - Update execute method (LINE 58)
const response = await this.geminiService.chat({
  // ... existing params
  thinkingLevel: args.thinking_level  // ← ADD THIS
});
```

**Test:**
```bash
npm run build
# Restart Claude Desktop
# Test: gemini_chat with thinking_level: 'LOW'
```

---

### 2. Edit Image Conversation History (2 hours)

**Problem:** thoughtSignature in wrong location (user parts instead of model parts)

**Complexity:** Requires conversation history tracking

**See:** `IMPLEMENTATION_GUIDE.md` lines 350-450 for full details

**Skip if:** Short on time, not critical for current users

---

## ⚡ Quick Wins - Add These Next

### 3. Search Grounding for Images (1 hour)

**Files to Change:**
```
src/services/gemini/image-types.ts  - Add useSearch to options
src/services/gemini/image-service.ts - Add tools array to request
src/tools/generate-image.ts         - Add use_search parameter
```

**Code Changes:**

```typescript
// 1. Add to ImageGenerationOptions interface
export interface ImageGenerationOptions {
  // ... existing
  useSearch?: boolean;  // ← ADD
}
```

```typescript
// 2. In image-service.ts - add to request body
const body = {
  contents: /*...*/,
  generationConfig: /*...*/,
  ...(options.useSearch && {
    tools: [{ google_search: {} }]  // ← ADD (note: lowercase!)
  })
};
```

```typescript
// 3. In generate-image.ts - add to inputSchema.properties
use_search: {
  type: 'boolean',
  default: false,
  description: 'Enable Google Search grounding for data-driven images.\n' +
              'Use for: weather, stocks, current events, statistics.'
}
```

**Test:**
```typescript
generate_image({
  prompt: "Weather forecast for London tomorrow with temperatures",
  use_search: true  // Should fetch real forecast data
})
```

---

### 4. Media Resolution Control (1 hour)

**Files to Change:**
```
src/services/gemini/image-types.ts   - Add MediaResolution type
src/services/gemini/image-service.ts - Add to parts and config
src/tools/generate-image.ts          - Add parameters
src/tools/analyze-image.ts           - Add parameters
```

**Code Changes:**

```typescript
// 1. Add type definition
export type MediaResolution = 
  | 'MEDIA_RESOLUTION_LOW'       // 280 tokens
  | 'MEDIA_RESOLUTION_MEDIUM'    // 560 tokens
  | 'MEDIA_RESOLUTION_HIGH'      // 1120 tokens (default)
  | 'MEDIA_RESOLUTION_ULTRA_HIGH'; // 2000+ tokens

// 2. Add to ImageInput
export interface ImageInput {
  data: string;
  mimeType: string;
  thoughtSignature?: string;
  mediaResolution?: MediaResolution;  // ← ADD
}

// 3. Add to ImageGenerationOptions
export interface ImageGenerationOptions {
  // ... existing
  globalMediaResolution?: Exclude<MediaResolution, 'MEDIA_RESOLUTION_ULTRA_HIGH'>;  // ← ADD
}
```

```typescript
// 4. In buildContents() - add to part construction
if (img.mediaResolution) {
  part.mediaResolution = img.mediaResolution;  // ← ADD
}
```

```typescript
// 5. In request body - add to generationConfig
generationConfig: {
  // ... existing
  ...(options.globalMediaResolution && {
    mediaResolution: options.globalMediaResolution  // ← ADD
  })
}
```

**Test:**
```typescript
// Should use ~560 tokens instead of ~1120 (50% savings)
analyze_image({
  images: [{ data: pdfBase64, mimeType: 'application/pdf', 
            mediaResolution: 'MEDIA_RESOLUTION_MEDIUM' }],
  prompt: "Extract all text"
})
```

---

## 📋 API Reference Quick Lookup

### Thinking Levels (Gemini 3 only)

```typescript
// Valid values (UPPERCASE REQUIRED):
'THINKING_LEVEL_UNSPECIFIED'  // Let API decide
'MINIMAL'                      // Minimum latency
'LOW'                          // Fast, cheap
'MEDIUM'                       // Balanced (default for 3.1 Pro)
'HIGH'                         // Deep Think mode
```

**Usage:**
```typescript
gemini_chat({
  message: "Complex debugging task",
  thinking_level: 'HIGH'  // ← Deep reasoning
})
```

---

### Media Resolution

```typescript
// Per-image (can use ULTRA_HIGH):
'MEDIA_RESOLUTION_LOW'        // 280 tokens - Simple tasks
'MEDIA_RESOLUTION_MEDIUM'     // 560 tokens - PDFs (OCR saturates)
'MEDIA_RESOLUTION_HIGH'       // 1120 tokens - Default
'MEDIA_RESOLUTION_ULTRA_HIGH' // 2000+ tokens - Maximum detail

// Global setting (no ULTRA_HIGH):
'MEDIA_RESOLUTION_LOW'
'MEDIA_RESOLUTION_MEDIUM'
'MEDIA_RESOLUTION_HIGH'
```

**Usage:**
```typescript
analyze_image({
  images: [{
    data: base64,
    mimeType: 'image/jpeg',
    mediaResolution: 'MEDIA_RESOLUTION_MEDIUM'  // ← Per-image override
  }],
  global_media_resolution: 'MEDIA_RESOLUTION_HIGH'  // ← Default for others
})
```

---

### Search Grounding

```typescript
// For text chat:
gemini_chat({
  message: "Latest AI news",
  grounding: true  // ← Enable search
})

// For image generation:
generate_image({
  prompt: "Weather forecast London tomorrow",
  use_search: true  // ← Use real forecast data
})
```

**REST API field name:** `google_search` (lowercase, underscore)  
**JavaScript SDK field:** `googleSearch` (camelCase)  
**We use:** REST API → `google_search`

---

## 🧪 Testing Commands

### Build and Test

```bash
# Full build
npm run build

# Run tests
npm test

# Run specific test
npm test -- thinking-levels.test.ts

# Build and restart Claude Desktop
npm run build && osascript -e 'quit app "Claude"'
```

### Manual Testing in Claude Desktop

**After restart, test each feature:**

```
# Thinking levels
Use gemini_chat with message: "What is 2+2?" and thinking_level: "LOW"
Use gemini_chat with message: "Debug this race condition" and thinking_level: "HIGH"

# Search grounding for images
Use generate_image with prompt: "Tokyo weather tomorrow" and use_search: true

# Media resolution
Use analyze_image on a PDF with mediaResolution: "MEDIA_RESOLUTION_MEDIUM"
Check token usage in logs
```

---

## 📝 Commit Message Templates

### Thinking Levels Fix

```
fix: update thinking level enums to uppercase per API spec

- Change ThinkingLevel type from lowercase to UPPERCASE
- Add thinking_level parameter to gemini_chat tool schema  
- Wire parameter through to service layer
- Add validation for Gemini 3 models only

BREAKING CHANGE: thinking_level values must be uppercase
  'low' → 'LOW', 'high' → 'HIGH'

Closes #XX
```

### Search Grounding

```
feat: add search grounding for image generation

- Add useSearch parameter to image generation options
- Include google_search tool in API request when enabled
- Extract and return grounding sources to user
- Add use_search parameter to generate_image tool

Enables data-driven image generation for weather, stocks, news
```

### Media Resolution

```
feat: add media resolution control for cost optimization

- Add MediaResolution type with four quality levels
- Support per-image and global resolution settings
- Update all image tools with resolution parameters
- Document token savings (50-75% reduction)

Enables cost optimization for bulk document processing
```

---

## 🔍 Debugging Tips

### Issue: API returns 400 error

**Check:**
1. Enum values are UPPERCASE (thinking levels, media resolution)
2. Field names match REST API spec (google_search, not googleSearch)
3. No invalid combinations (ULTRA_HIGH only per-image, not global)

### Issue: Thinking level ignored

**Check:**
1. Model is Gemini 3 (gemini-3-*, gemini-3.1-*)
2. Value is uppercase ('HIGH' not 'high')
3. Parameter wired through all layers (tool → service → API)

### Issue: Image editing produces wrong results

**Check:**
1. thoughtSignature included in request
2. thoughtSignature in correct location (model parts, not user parts)
3. Conversation history preserved across calls

---

## 📚 Documentation Files

**Read first:**
- `IMPLEMENTATION_GUIDE.md` - Step-by-step code changes
- `API_ANALYSIS_SUMMARY.md` - Project overview

**Reference:**
- `API_COVERAGE_ANALYSIS.md` - Complete API analysis (2000+ lines)
- `API_COVERAGE_CORRECTIONS.md` - API verification corrections

**When stuck:**
- Search `IMPLEMENTATION_GUIDE.md` for the feature name
- Look for exact code snippets to copy
- Check test examples at end of each section

---

## ⏱️ Time Estimates

**Phase 1a - Critical Fixes:**
- Thinking levels: 30 minutes ⚡
- Edit image conversation: 2 hours 🔧

**Phase 1b - Quick Wins:**
- Search grounding: 1 hour ⚡
- Media resolution: 1 hour ⚡

**Phase 2 - Major Features:**
- Video generation: 6 hours 🏗️

**Total Phase 1: 4.5 hours** (recommended this sprint)

---

## 🎯 Success Criteria

### Thinking Levels
- [ ] API accepts 'HIGH' value without errors
- [ ] 'LOW' shows faster response than 'HIGH'
- [ ] Claude Desktop shows thinking_level in tool schema

### Search Grounding
- [ ] Weather image shows real forecast data
- [ ] Grounding sources displayed to user
- [ ] Works without grounding (graceful fallback)

### Media Resolution  
- [ ] 'MEDIA_RESOLUTION_MEDIUM' uses ~560 tokens
- [ ] PDF OCR quality same for MEDIUM vs HIGH
- [ ] 50% token savings verified in logs

---

## 🚀 Deployment Checklist

Before merging:
- [ ] `npm run build` succeeds
- [ ] `npm test` all pass
- [ ] Manual test in Claude Desktop
- [ ] CHANGELOG.md updated
- [ ] README.md updated with new parameters
- [ ] Breaking changes documented
- [ ] Version bumped to 2.0.0

---

*Quick reference complete. Start with thinking levels, then add quick wins, then tackle video generation.*
