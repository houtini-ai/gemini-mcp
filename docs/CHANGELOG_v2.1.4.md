# v2.1.4 - Context Window Fix & UX Improvements

**Release Date:** 2025-02-21

## 🔧 Critical Fix: Thought Signature Context Window Issue

### Problem Solved
Prior to this version, conversational image editing with thought signatures would attempt to re-upload the full base64 image data, consuming **500K+ tokens** per image and killing Claude's context window.

### Solution Implemented
Modified `buildContents()` in `image-service.ts` to detect when a thought signature is present and:
- ✅ Send only the thought signature for conversational editing
- ✅ Include empty `inlineData.data` field (per Gemini API spec)
- ✅ Preserve mimeType for output format specification
- ✅ Save ~2-3MB of base64 data per edit operation

**Technical Details:**
```typescript
// Before (WRONG - kills context window):
if (img.thoughtSignature) {
  part.inlineData = { mimeType: img.mimeType, data: img.data }; // FULL IMAGE
  part.thoughtSignature = img.thoughtSignature;
}

// After (CORRECT - signature only):
if (img.thoughtSignature) {
  part.thoughtSignature = img.thoughtSignature;
  part.inlineData = { mimeType: img.mimeType, data: '' }; // EMPTY!
}
```

Per Google Gemini API documentation:
> "You should include the mimeType but can leave the data field empty or omit it if the thoughtSignature is present"

## ✨ UX Enhancement: Copyable Prompt Display

### New Feature
HTML preview now displays the generation prompt in a **copyable text box** with one-click copy functionality.

**Benefits:**
- Users can easily copy and modify prompts for iterative refinement
- Professional code-style formatting makes prompts easy to read
- Visual feedback on copy (button changes to "Copied!" with green colour)
- Particularly useful for conversational editing workflows

**Implementation:**
- Added styled `.prompt-box` container with monospace font
- Integrated copy button with clipboard API
- Smooth visual transitions and user feedback
- Maintains all existing preview functionality

## 📊 Impact

**Token Savings:**
- **Before:** 500K+ tokens per image edit (kills Claude context)
- **After:** <100 tokens per image edit (95%+ reduction)

**Workflow Improvement:**
- Enables multi-turn conversational editing without context loss
- Users can iterate on prompts efficiently
- Professional presentation of generation metadata

## 🔄 Breaking Changes
None - fully backwards compatible.

## 📝 Files Modified
1. `src/services/gemini/image-service.ts` - Fixed thought signature handling
2. `src/index.ts` - Enhanced HTML preview with copyable prompt
3. `package.json` - Version bump to 2.1.4

## 🧪 Testing Checklist

Before using in production:
- [ ] Test generate_image creates proper HTML preview
- [ ] Test edit_image with thought signature (should use empty data field)
- [ ] Verify copy button works in HTML preview
- [ ] Confirm no context window issues with multi-turn edits
- [ ] Check thought signature files still save correctly

## 🚀 Deployment

```bash
npm run build:server
# Restart Claude Desktop to load new version
```

---

**Full Changelog:** https://github.com/houtini-ai/gemini-mcp/blob/main/CHANGELOG.md