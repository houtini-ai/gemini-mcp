# Gemini MCP - API Coverage Analysis & Implementation Guide

**Date:** 2025-02-21  
**Current Version:** Latest build (post-test)  
**Analysis Scope:** Comprehensive review of Gemini API capabilities vs current MCP implementation

---

## Executive Summary

Our Gemini MCP server currently provides **solid core functionality** for chat, research, and basic image operations. However, the full Gemini API suite offers significantly more capabilities that could be valuable additions:

**Coverage Status:**
- ✅ **Excellent:** Text chat, deep research, grounding
- 🟡 **Partial:** Image generation (basic only)
- ❌ **Missing:** Video generation, advanced image editing, image analysis, specialized Gemini 3 features

**Strategic Recommendation:** The API offers a rich suite of capabilities worthy of expansion, particularly for image generation/editing workflows and video generation.

---

## CRITICAL: Tool Use Context for Claude

**🎯 This section defines WHEN and HOW Claude should use Gemini tools**

### General Principles

**1. ALWAYS Generate Previews**
- **Rule:** Every image/video generation tool MUST return both inline preview AND saved file path
- **Why:** Users need immediate visual feedback whilst having permanent files
- **Implementation:** All image tools return `structuredContent` with base64 + `savedPath`

**2. Tool Selection Context**

**Use `gemini_chat` when:**
- ✅ User asks general questions requiring current information
- ✅ Research task is straightforward (single-topic, 1-2 sources sufficient)
- ✅ Quick fact-checking or information retrieval
- ✅ Grounding adds value (current events, statistics, real-world data)
- ❌ **DO NOT use** for complex multi-step research (use `gemini_deep_research`)
- ❌ **DO NOT use** for image analysis (use `analyze_image` or `describe_image`)

**Use `gemini_deep_research` when:**
- ✅ User asks for comprehensive analysis across multiple angles
- ✅ Topic requires synthesis of 5+ sources
- ✅ Question includes "research", "comprehensive", "thorough", "all perspectives"
- ✅ User wants report-style output with citations
- ❌ **DO NOT use** for simple fact lookups (use `gemini_chat`)
- ❌ **DO NOT use** for time-sensitive quick queries (5+ minute operation)

**Use `generate_image` when:**
- ✅ User asks to "create", "generate", "make", or "design" an image
- ✅ User describes visual content they want to see
- ✅ User requests product mockups, logos, illustrations, or graphics
- ✅ **ALWAYS use 'use_search: true' when:** weather maps, stock charts, current events, data visualizations, factual infographics
- ⚠️ **CRITICAL:** Return both preview (base64) and savedPath in response
- ⚠️ **CRITICAL:** Preserve thoughtSignature from response for multi-turn editing
- ❌ **DO NOT use** for analyzing existing images (use `analyze_image`)

**Use `edit_image` when:**
- ✅ User wants to modify/adjust a previously generated image
- ✅ User says "make it darker", "add...", "change the...", "remove..."
- ✅ **REQUIRED:** User has thoughtSignature from previous generate/edit response
- ⚠️ **CRITICAL:** Must include thoughtSignature in request or edit will fail/produce unrelated image
- ⚠️ **CRITICAL:** Return both preview and savedPath in response
- ❌ **DO NOT use** for brand new images (use `generate_image`)
- ❌ **DO NOT use** without thoughtSignature (will produce poor results)

**Use `analyze_image` when:**
- ✅ User uploads image and asks questions about it
- ✅ User needs technical analysis (OCR, object detection, scene understanding)
- ✅ User wants structured data extraction from images
- ✅ Complex analysis requiring Gemini 3 Pro multimodal capabilities
- ❌ **DO NOT use** for simple description (use `describe_image` - faster/cheaper)
- ❌ **DO NOT use** for image generation (use `generate_image`)

**Use `describe_image` when:**
- ✅ User wants basic description of what's in an image
- ✅ User asks "what is this?", "describe this image"
- ✅ Simple visual understanding sufficient
- ❌ **DO NOT use** for complex analysis (use `analyze_image`)
- ❌ **DO NOT use** for data extraction (use `analyze_image`)

**Use `generate_landing_page` when:**
- ✅ User asks for HTML website, landing page, or web design
- ✅ User describes business/product needing web presence
- ✅ User wants complete self-contained HTML file
- ⚠️ **CRITICAL:** Return both preview URL and savedPath
- ❌ **DO NOT use** for partial HTML snippets (write directly)
- ❌ **DO NOT use** for complex multi-page sites

---

### Tool Response Requirements

**🎯 Every tool MUST follow these patterns:**

**Image Generation Tools (`generate_image`, `edit_image`):**

```typescript
// REQUIRED response structure
return {
  structuredContent: {
    base64Data: compressed.base64,        // ← ALWAYS include inline preview
    mimeType: 'image/jpeg',
    savedPath: absolutePath,              // ← ALWAYS include file location
    thoughtSignature: signature           // ← CRITICAL for multi-turn editing
  },
  content: [{
    type: 'text',
    text: 
      `Image saved to: ${absolutePath}\n` +
      `HTML preview: ${htmlPath}\n\n` +
      `💡 For multi-turn editing: Use 'edit_image' with this thoughtSignature to make changes:\n` +
      `   Example: "make the background darker", "add more contrast"\n\n` +
      `Technical note: The response includes thoughtSignature data needed for conversational editing.`
  }]
};
```

**Analysis Tools (`analyze_image`, `describe_image`):**

```typescript
// REQUIRED response structure
return {
  content: [{
    type: 'text',
    text: analysisResult  // ← Text-based findings
  }]
};
// DO NOT include structured content for text-only outputs
```

**Research Tools (`gemini_chat`, `gemini_deep_research`):**

```typescript
// REQUIRED response structure
return {
  content: [{
    type: 'text',
    text: 
      researchFindings +
      (groundingSources ? `\n\nSources:\n${formatSources(sources)}` : '')
  }]
};
// ALWAYS include sources when grounding was used
// ALWAYS format citations clearly
```

---

## Current Implementation - What We Have

### ✅ Text & Research

**`gemini_chat`** - Chat with grounding support

**When Claude uses this:**
- Quick fact-checking with real-time data
- General questions where current information helps
- Conversations requiring web context
- Tasks where 1-2 sources sufficient

**Tool description for Claude:**
```
Chat with Google Gemini models with optional Google Search grounding for real-time information.

USE THIS WHEN:
  • User asks factual questions that may have changed since your knowledge cutoff
  • Current events, statistics, or real-world data would improve answer
  • Quick research (1-2 sources sufficient)
  
DO NOT USE:
  • For complex research requiring 5+ sources (use gemini_deep_research)
  • For image analysis (use analyze_image/describe_image)
  • When your existing knowledge is sufficient

ALWAYS: Enable 'grounding: true' for queries about current events, statistics, or time-sensitive facts.
```

---

**`gemini_deep_research`** - Multi-step iterative research

**When Claude uses this:**
- User explicitly requests research/comprehensive analysis
- Topic requires synthesis across multiple perspectives
- Question complexity demands 5-15 web sources
- User wants report with citations

**Tool description for Claude:**
```
Conduct deep research on complex topics using iterative multi-step analysis with Gemini.

USE THIS WHEN:
  • User asks for "research", "comprehensive analysis", "thorough investigation"
  • Topic requires comparing multiple viewpoints/sources
  • Question like "What are all the approaches to..." or "Compare X, Y, Z"
  
DO NOT USE:
  • For simple factual lookups (use gemini_chat)
  • For time-sensitive questions (takes 5+ minutes)
  • When 1-2 sources sufficient
  
EXPECT: 5-15 minute operation with progress updates
RETURNS: Detailed report with citations and source links
```

---

**`gemini_list_models`** - Model discovery

**When Claude uses this:**
- User asks what Gemini models are available
- Troubleshooting model selection
- Checking capabilities before task

**Tool description for Claude:**
```
List available Gemini models and their descriptions.

USE THIS WHEN:
  • User asks "what models are available?"
  • Debugging model selection issues
  • Checking if specific capability is supported

RETURNS: Array of models with descriptions and capabilities
```

---

### ✅ Image Generation & Analysis

**`generate_image`** - Text-to-image generation

**When Claude uses this:**
- User describes visual content to create
- Product mockups, logos, illustrations
- Data-driven visuals (ALWAYS use_search: true for these)
- Any "create/generate/make an image" request

**Tool description for Claude:**
```
Generate photorealistic, illustrative, or data-driven images with Nano Banana Pro (Gemini 3 Pro Image).

USE THIS WHEN:
  • User asks to create/generate/design an image
  • User describes visual content: "Show me...", "Create a logo for..."
  • Product mockups, marketing visuals, illustrations needed
  • Data visualization: weather, charts, infographics (USE grounding!)
  
CRITICAL PARAMETERS:
  • use_search: true - ALWAYS enable for weather, stocks, current events, factual data
  • aspect_ratio: Match user's use case (9:16 for social, 16:9 for presentations, 1:1 for products)
  • image_size: '4K' for print quality, '2K' default, '1K' for speed
  
REFERENCE IMAGES (up to 14):
  • Product mockups: logo + product + scene elements
  • Character consistency: Provide face photos to maintain same person across generations
  • Style transfer: Include style examples to match aesthetic
  
RESPONSE REQUIREMENTS:
  ✅ ALWAYS return base64Data for inline preview
  ✅ ALWAYS return savedPath for permanent file
  ✅ ALWAYS preserve thoughtSignature for multi-turn editing
  ✅ ALWAYS create HTML preview file
  
TELL USER: "Use 'edit_image' to make changes - this thoughtSignature enables conversational editing."

EXAMPLES:
  📸 Photorealistic: "Photorealistic portrait, 85mm lens, golden hour lighting, shallow depth of field"
  🎨 Illustrations: "Kawaii-style sticker with bold outlines, cel-shading, vibrant colors, white background"
  📝 Text rendering: "Minimalist logo with text 'Daily Grind' in clean sans-serif, black and white"
  📊 Data (WITH GROUNDING): "Weather graphic showing 5-day Tokyo forecast with temperatures" + use_search: true
```

---

**`edit_image`** - Image editing with prompts

**When Claude uses this:**
- User wants to modify previously generated image
- User says "make it darker", "add...", "change the..."
- Conversational editing workflow

**Tool description for Claude:**
```
Edit images conversationally using Nano Banana Pro.

CRITICAL: Requires thoughtSignature from previous generate_image or edit_image response.

USE THIS WHEN:
  • User wants to modify existing generated image
  • User says "make the sky darker", "add more trees", "change background to blue"
  • Conversational editing: "now make it warmer", "add text saying..."
  
DO NOT USE:
  • For brand new images (use generate_image)
  • Without thoughtSignature (will produce unrelated/poor quality image)
  
WORKFLOW:
  1. User generates image with generate_image
  2. Claude saves thoughtSignature from response
  3. User requests edit: "make it darker"
  4. Claude calls edit_image WITH thoughtSignature
  5. New thoughtSignature returned for further edits
  
RESPONSE REQUIREMENTS:
  ✅ ALWAYS return base64Data for inline preview
  ✅ ALWAYS return savedPath for permanent file
  ✅ ALWAYS preserve NEW thoughtSignature for next edit
  ✅ ALWAYS create HTML preview file
  
EXAMPLE WORKFLOW:
  User: "Create a sunset beach scene"
  Claude: [calls generate_image, saves thoughtSignature]
  User: "Make the sky more orange"
  Claude: [calls edit_image WITH thoughtSignature]
  User: "Add palm trees"
  Claude: [calls edit_image WITH new thoughtSignature from previous edit]
```

---

**`describe_image`** - Image description (text output)

**When Claude uses this:**
- User uploads image and asks "what is this?"
- Simple visual description needed
- No complex analysis required

**Tool description for Claude:**
```
Describe images using Nano Banana Pro vision (text output only).

USE THIS WHEN:
  • User asks "what is this image?", "describe this picture"
  • Simple visual description sufficient
  • No data extraction or complex analysis needed
  
DO NOT USE:
  • For complex analysis/OCR (use analyze_image)
  • For generating images (use generate_image)
  
RESPONSE: Text description only (no structured content)
```

---

**`analyze_image`** - Image analysis (text output)

**When Claude uses this:**
- User needs technical analysis (OCR, object detection)
- Structured data extraction from images
- Complex multimodal understanding

**Tool description for Claude:**
```
Analyze images with Gemini 3 Pro multimodal understanding (text output only).

USE THIS WHEN:
  • User needs OCR/text extraction from images
  • Object detection, scene understanding required
  • Structured data extraction (tables, charts, diagrams)
  • Technical analysis (architectural drawings, medical images, code screenshots)
  
DO NOT USE:
  • For simple description (use describe_image - faster/cheaper)
  • For generating images (use generate_image)
  
PARAMETERS:
  • media_resolution: 'high' for detailed analysis (default), 'medium' for documents/PDFs, 'low' for simple recognition
  • max_tokens: Increase for complex analysis requiring detailed output
  
RESPONSE: Text-based analysis only (no structured content)
```

---

**`load_image_from_path`** - Load local images

**When Claude uses this:**
- User references local image file path
- Need to load image for generate_image/edit_image/analyze_image
- Converting file path to base64

**Tool description for Claude:**
```
Load local image files and convert to base64 for use with other image tools.

USE THIS WHEN:
  • User provides local file path to image
  • Need to load reference images for generate_image (up to 14)
  • Loading images for analyze_image or describe_image
  
SUPPORTED FORMATS: JPEG, PNG, GIF, WebP, BMP

WORKFLOW:
  User: "Analyze this image: C:/photos/vacation.jpg"
  Claude: 
    1. Call load_image_from_path("C:/photos/vacation.jpg")
    2. Get base64 data
    3. Call analyze_image with base64 data
```

---

### ✅ HTML Generation

**`generate_landing_page`** - Complete HTML pages

**When Claude uses this:**
- User asks for website/landing page
- Need complete self-contained HTML
- Business/product description provided

**Tool description for Claude:**
```
Generate complete, self-contained HTML landing pages using Gemini.

USE THIS WHEN:
  • User asks for "website", "landing page", "web page"
  • User describes business/product needing web presence
  • Need professional HTML with inline CSS/JS
  
DO NOT USE:
  • For partial HTML snippets (write directly)
  • For complex multi-page sites (beyond single landing page)
  
PARAMETERS:
  • brief: Product/service description and page goals (REQUIRED)
  • companyName: Brand name
  • primaryColour: Brand color (#hex or name)
  • sections: Array like ["hero", "features", "pricing", "cta"]
  • style: "minimal" | "bold" | "corporate" | "startup"
  
RESPONSE REQUIREMENTS:
  ✅ Returns raw HTML as string
  ✅ Use Desktop Commander write_file to save
  ✅ HTML is self-contained (inline CSS/JS, no external deps)
  
WORKFLOW:
  1. Call generate_landing_page with brief
  2. Receive HTML string
  3. Save with Desktop Commander: write_file(path, html)
  4. Tell user file location
```

---

## 🔴 MISSING: Critical Features to Add

### 1. Gemini 3 Models - Advanced Features

**🔴 Missing: Thinking Levels** ⭐ HIGH PRIORITY

**What it is:** Control over model's internal reasoning depth  
**API Reference:** https://ai.google.dev/gemini-api/docs/gemini-3#thinking_level

**Why this matters for Claude:**
- **Cost optimization:** Lower thinking = faster/cheaper responses
- **Task matching:** Simple queries don't need deep reasoning
- **User control:** Advanced users can tune performance

**When Claude should use this:**

```
THINKING LEVEL SELECTION GUIDE:

Use 'low' thinking when:
  • Simple factual questions ("What is X?", "Define Y")
  • Quick translations or reformatting
  • Straightforward calculations
  • Chatbot-style responses
  • Speed matters more than depth
  
Use 'high' thinking when (DEFAULT for Gemini 3):
  • Complex debugging or code analysis
  • Multi-step reasoning required
  • Strategic planning or architecture decisions
  • Research synthesis across sources
  • Nuanced judgment calls
  
Use 'medium' thinking when (Flash only):
  • Moderate complexity questions
  • Balanced speed vs depth needed
  
Use 'minimal' thinking when (Flash only):
  • Matches "no thinking" mode
  • Absolute minimum latency required
  • Trivial tasks
```

**Implementation:**

```typescript
// Add to gemini_chat tool
inputSchema: {
  // ... existing params
  thinking_level: z.enum(['low', 'medium', 'high', 'minimal'])
    .optional()
    .describe(
      'Thinking depth for Gemini 3 models only. ' +
      'SELECTION GUIDE:\n' +
      '  • "low" - Simple factual queries, translations, quick answers\n' +
      '  • "high" - Complex debugging, strategic planning, research (DEFAULT)\n' +
      '  • "medium" - Balanced complexity (Flash only)\n' +
      '  • "minimal" - Minimum latency for trivial tasks (Flash only)\n' +
      'Ignored for non-Gemini-3 models.'
    )
}
```

**Tool description update:**

```
gemini_chat: "Chat with Google Gemini models with optional Google Search grounding.

THINKING LEVELS (Gemini 3 only):
  Control reasoning depth to optimize for speed vs quality:
  
  🏃 LOW THINKING - Fast simple tasks:
    • "What is quantum computing?"
    • "Translate this to Spanish"
    • "Format this data as JSON"
    
  🧠 HIGH THINKING - Complex analysis (DEFAULT):
    • "Debug this race condition in my async code"
    • "Compare React vs Vue for enterprise apps"
    • "Research all approaches to user authentication"
    
ALWAYS USE: thinking_level: 'low' for simple lookups to save cost/time
ALWAYS USE: thinking_level: 'high' (or omit) for complex reasoning

..."
```

---

**🔴 Missing: Media Resolution Control** ⭐ HIGH PRIORITY

**What it is:** Fine-grained control over vision processing token allocation  
**API Reference:** https://ai.google.dev/gemini-api/docs/gemini-3#media_resolution

**When Claude should use this:**

```
MEDIA RESOLUTION SELECTION GUIDE:

Use 'media_resolution_high' when (DEFAULT):
  • General image analysis
  • Reading normal-sized text in images
  • Visual understanding tasks
  • When quality matters more than cost
  
Use 'media_resolution_medium' when:
  • Analyzing PDFs or documents (OCR saturates at medium)
  • Scanned documents with clear text
  • Cost optimization for document batches
  
Use 'media_resolution_low' when:
  • Video frame analysis (action recognition)
  • Simple object detection
  • Color/composition analysis
  • Cost-sensitive bulk operations
  
Use 'media_resolution_ultra_high' when:
  • Tiny text that must be read
  • Maximum detail required
  • Medical images, technical diagrams
  • Cost not a concern
```

**Implementation:**

```typescript
// Add to analyze_image and describe_image
inputSchema: {
  // ... existing params
  media_resolution: z.enum([
    'media_resolution_low',      // 280 tokens/image
    'media_resolution_medium',   // 560 tokens/image
    'media_resolution_high',     // 1120 tokens/image (default)
    'media_resolution_ultra_high' // Maximum quality
  ]).optional()
    .default('media_resolution_high')
    .describe(
      'Control image quality vs token usage.\n' +
      'SELECTION GUIDE:\n' +
      '  • "high" (DEFAULT) - General image analysis (1120 tokens)\n' +
      '  • "medium" - PDFs/documents where OCR saturates (560 tokens)\n' +
      '  • "low" - Simple recognition, cost optimization (280 tokens)\n' +
      '  • "ultra_high" - Maximum detail for tiny text\n'
    )
}
```

**Tool description update:**

```
analyze_image: "Analyze images with Gemini 3 Pro multimodal understanding.

MEDIA RESOLUTION - Balance quality vs cost:
  
  🎯 HIGH (DEFAULT) - 1120 tokens/image:
    • General image analysis
    • Reading normal-sized text
    • Visual understanding
    
  📄 MEDIUM - 560 tokens/image:
    • PDFs and scanned documents
    • OCR saturates at medium
    • Cost-effective for doc batches
    
  💰 LOW - 280 tokens/image:
    • Simple object detection
    • Color/composition analysis
    • Bulk operations
    
ALWAYS USE: 'media_resolution_medium' for PDFs to save 50% cost with same OCR quality
ALWAYS USE: 'media_resolution_low' for simple tasks to save 75% cost

..."
```

---

**🔴 Missing: Thought Signatures** ⚠️ CRITICAL FOR MULTI-TURN

**Current Status:** ✅ Already implemented and preserved!  
**Problem:** Not documented or explained to users

**What Claude needs to know:**

```
THOUGHT SIGNATURE REQUIREMENTS:

CRITICAL FOR:
  ✅ Multi-turn image editing (REQUIRED or edits fail with 400 errors)
  ✅ Multi-step function calling (REQUIRED for stateful workflows)
  ⚠️ Text/chat (RECOMMENDED for quality, optional)
  
HOW IT WORKS:
  1. generate_image returns thoughtSignature in response
  2. User requests edit: "make it darker"
  3. Claude MUST include thoughtSignature in edit_image call
  4. Without signature: Edit produces unrelated image or fails
  
WORKFLOW:
  generate_image response → {thoughtSignature: "abc123"}
  ↓ (Claude saves this)
  edit_image request → {thoughtSignature: "abc123"} ← CRITICAL
  ↓
  edit_image response → {thoughtSignature: "def456"} ← Save for next edit
```

**Tool description updates needed:**

```
generate_image: "...

MULTI-TURN EDITING:
  This tool returns 'thoughtSignature' in the response - YOU MUST preserve this!
  
  WORKFLOW:
    1. User: "Create a sunset beach scene"
    2. You: Call generate_image, save thoughtSignature from response
    3. User: "Make the sky more orange"
    4. You: Call edit_image WITH saved thoughtSignature
    
  WITHOUT thoughtSignature: Edits will fail or produce unrelated images
  WITH thoughtSignature: Edits maintain visual context and style
  
  ALWAYS tell user: 'Use edit_image to make changes - I have the context needed.'"

edit_image: "...

CRITICAL REQUIREMENT: thoughtSignature from previous generate/edit response

IF USER ASKS FOR EDIT:
  ✅ Check if you have thoughtSignature from previous generation
  ✅ If yes: Call edit_image with thoughtSignature
  ❌ If no: Explain you need original image generation first
  
NEVER: Call edit_image without thoughtSignature (will produce poor results)"
```

---

### 2. Image Generation - Enhanced Features

**🔴 Missing: Search Grounding for Images** ⭐ HIGH IMPACT

**What it is:** Generate images based on real-time web data  
**API Reference:** https://ai.google.dev/gemini-api/docs/image-generation#use-with-grounding

**When Claude should use this:**

```
SEARCH GROUNDING DECISION TREE:

ALWAYS use 'use_search: true' when:
  ✅ Weather visualizations: "Show tomorrow's forecast for London"
  ✅ Stock/financial charts: "Tesla stock performance this week"
  ✅ Current events: "Illustrate last night's Champions League result"
  ✅ Data-driven graphics: "Recent AI breakthroughs infographic"
  ✅ Real-time facts: "Current Bitcoin price visualization"
  
NEVER use grounding when:
  ❌ Fictional/creative content: "Fantasy dragon in magical forest"
  ❌ Generic scenes: "Sunset over mountains"
  ❌ Style/aesthetic images: "Minimalist logo design"
  ❌ Abstract concepts: "Peace and harmony illustration"
```

**Implementation:**

```typescript
// Add to generate_image
inputSchema: {
  // ... existing
  use_search: z.boolean()
    .optional()
    .default(false)
    .describe(
      'Enable Google Search grounding for data-driven images.\n' +
      'WHEN TO USE:\n' +
      '  ✅ Weather maps, forecasts\n' +
      '  ✅ Stock charts, financial data\n' +
      '  ✅ Current events, news illustrations\n' +
      '  ✅ Real-time statistics, infographics\n' +
      'RETURNS: groundingSources array with web sources used'
    )
}
```

**Tool description update:**

```
generate_image: "...

SEARCH GROUNDING - For data-driven visuals:
  
  📊 ENABLE GROUNDING (use_search: true) FOR:
    • Weather: "Show 5-day Tokyo forecast with outfit suggestions"
    • Stocks: "Create chart of Tesla stock this month"
    • News: "Illustrate last night's football match score"
    • Data: "Infographic about recent SpaceX launches"
    
  🎨 NO GROUNDING NEEDED FOR:
    • Creative/fictional content
    • Generic scenes (sunsets, landscapes)
    • Style/aesthetic images
    
  EXAMPLE WITH GROUNDING:
    Prompt: "Create a modern weather graphic showing tomorrow's London forecast"
    use_search: true ← Fetches real forecast data
    Result: Accurate temperatures, conditions, wind speed from real sources
    
  Returns: groundingSources array showing which websites were used

..."
```

---

### 3. Video Generation - COMPLETELY MISSING ⭐ HIGHEST IMPACT

**Model:** Veo 3.1  
**API Reference:** https://ai.google.dev/gemini-api/docs/video

**When Claude should use this:**

```
VIDEO GENERATION USE CASES:

Generate video when user asks for:
  ✅ "Create a video of..."
  ✅ "Generate 8-second clip showing..."
  ✅ Product demos, animations
  ✅ Social media content (9:16 for TikTok, 16:9 for YouTube)
  ✅ B-roll footage, cinematic shots
  
DO NOT use for:
  ❌ Static images (use generate_image)
  ❌ Long-form content (Veo generates 8 seconds max)
  ❌ Real-time needs (generation takes 1-3 minutes)
```

**New Tool: `generate_video`**

**Tool description for Claude:**

```
generate_video: "Generate professional 8-second videos with Veo 3.1 (Google's video model).

USE THIS WHEN:
  • User asks to "create/generate a video"
  • Product demos: "Sleek rotation of wireless headphones"
  • Animations: "Logo materializing with particle effects"
  • B-roll: "Cinematic slow-motion coffee pour"
  • Social content: "TikTok-style product reveal"
  
CRITICAL PARAMETERS:
  • aspect_ratio: 
    → '9:16' for TikTok, Instagram Reels, Snapchat (VERTICAL)
    → '16:9' for YouTube, presentations, desktop (HORIZONTAL)
  • resolution:
    → '1080p' (DEFAULT) - Balanced quality/speed
    → '720p' - Faster generation
    → '4K' - Cinema quality (slower)
  • images: Up to 3 reference images for scene control
  
TIMING:
  ⏱️ Generation takes 1-3 minutes
  🎬 Returns thumbnail preview immediately
  💾 Full video saved when complete
  
RESPONSE REQUIREMENTS:
  ✅ ALWAYS return base64Data (first-frame thumbnail) for preview
  ✅ ALWAYS return savedPath for full video file
  ✅ ALWAYS create HTML player with autoplay
  ✅ ALWAYS include video metadata (duration, resolution, has audio)
  
USER COMMUNICATION:
  Tell user: "Video preview shows first frame. Open HTML file to play full 8-second video with audio."
  
PROMPTING EXAMPLES:
  📱 Social Media:
    "Quick product reveal of smartwatch, dynamic camera movement, vibrant colors, 9:16 format"
    
  🎥 Professional:
    "Cinematic aerial shot of city skyline at sunset, smooth drone movement, 4K quality"
    
  🎨 Animation:
    "Smooth morphing animation from geometric shapes to company logo, modern minimal style"
    
FEATURES:
  🔊 Native audio generation (dialogue, sound effects, music)
  🎬 Frame control (specify exact first/last frames)
  📸 Reference images guide scene composition
  🎞️ Video extension (extend previously generated clips)

WORKFLOW:
  1. User requests video
  2. Claude selects aspect ratio based on use case
  3. Call generate_video (returns job ID)
  4. Wait 1-3 minutes for completion
  5. Return thumbnail preview + saved video path
  6. User opens HTML player for full playback
```

---

### 4. Additional Missing Features

**🔴 Embeddings API**

**When Claude should use this:**

```
USE embeddings when:
  ✅ User needs semantic search over documents
  ✅ Building recommendation systems
  ✅ Clustering similar content
  ✅ RAG (Retrieval Augmented Generation) pipelines
  
DO NOT use for:
  ❌ Simple text generation
  ❌ When direct search APIs available
```

**New Tool: `gemini_embed_text`**

**Tool description:**

```
gemini_embed_text: "Generate 768-dimensional vector embeddings for semantic search and clustering.

USE THIS WHEN:
  • Building semantic search over documents
  • Creating recommendation systems
  • Clustering similar content
  • RAG pipelines requiring embeddings
  
PARAMETERS:
  • texts: Array of strings to embed (1-100 items)
  • task_type: Optimize embeddings for specific use:
    → 'RETRIEVAL_QUERY' - User search queries
    → 'RETRIEVAL_DOCUMENT' - Document corpus
    → 'SEMANTIC_SIMILARITY' - Comparing texts
    → 'CLASSIFICATION' - Category assignment
    → 'CLUSTERING' - Grouping similar items
    
RETURNS:
  • embeddings: Float array (768 dimensions)
  • model: 'text-embedding-004'
  
WORKFLOW:
  1. Embed corpus: task_type: 'RETRIEVAL_DOCUMENT'
  2. Embed query: task_type: 'RETRIEVAL_QUERY'
  3. Calculate cosine similarity
  4. Return top matches
```

---

**🔴 Structured Outputs**

**When Claude should use this:**

```
USE structured outputs when:
  ✅ User needs strict JSON schema compliance
  ✅ Data extraction from documents
  ✅ API integration requiring exact formats
  ✅ Form filling, data validation
  
DO NOT use for:
  ❌ Free-form creative writing
  ❌ When schema compliance not critical
```

**Tool description update for gemini_chat:**

```
gemini_chat: "...

STRUCTURED OUTPUTS:
  Force JSON schema-compliant responses for data extraction.
  
  USE WHEN:
    • Extracting data from documents
    • API responses requiring exact format
    • Form filling, validation
    
  PARAMETER:
    response_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        ...
      },
      required: ['name']
    }
    
  RESULT: Guaranteed JSON matching schema (or error if impossible)
  
  EXAMPLE:
    User: "Extract product info from this text"
    You: Call gemini_chat with response_schema defining Product structure
    Result: Strict JSON with name, price, description fields

..."
```

---

**🔴 Code Execution**

**When Claude should use this:**

```
USE code execution when:
  ✅ User needs data analysis with Python
  ✅ Chart/graph generation required
  ✅ Mathematical computations
  ✅ Model can't solve without running code
  
DO NOT use for:
  ❌ Simple calculations (Claude can do these)
  ❌ When results must be deterministic
```

**Tool description update for gemini_chat:**

```
gemini_chat: "...

CODE EXECUTION:
  Allow model to run Python code for analysis and visualization.
  
  ENABLE WHEN:
    • User needs data analysis: "Analyze this CSV"
    • Chart generation: "Plot this data"
    • Complex math: "Solve this differential equation"
    • Model says: "I need to run code to..."
    
  PARAMETER:
    enable_code_execution: true
    
  WHAT IT DOES:
    Model can write and execute Python in sandbox
    Results returned as text/images
    
  EXAMPLE:
    User: "Plot the function y = x^2 for x from -10 to 10"
    You: enable_code_execution: true
    Model: Writes matplotlib code, executes, returns image

..."
```

---

## Implementation Priority & Impact

### Phase 1: Quick Wins (1-2 weeks) ⭐ DO FIRST

**Why:** Minimal code, maximum UX improvement

1. **Thinking Levels** (20 lines)
   - Claude can optimize cost/speed for simple vs complex tasks
   - User gets faster responses when appropriate

2. **Media Resolution** (30 lines)
   - Claude can save 50-75% tokens on document OCR
   - Better quality control for different use cases

3. **Search Grounding for Images** (15 lines)
   - Claude can generate factually accurate visualizations
   - Weather, stocks, news illustrations become data-driven

4. **Tool Description Updates** (0 lines code)
   - Claude understands WHEN to use each tool
   - Reduces incorrect tool selection
   - Better user experience through proper tool choice

5. **Thought Signature Documentation** (0 lines code)
   - Already implemented, just document workflow
   - Claude understands multi-turn editing requirements

---

### Phase 2: Video Generation (2-3 weeks) ⭐ HIGH IMPACT

**Why:** Major competitive differentiator, new use cases

**Implementation:** ~300 lines
- Async job handling
- Thumbnail extraction (ffmpeg)
- HTML video player
- Progress polling

**Impact:**
- Sets Gemini MCP apart from competition
- Enables content creators, marketers, educators
- High user demand capability

---

### Phase 3: Advanced Features (2-4 weeks)

**Based on user demand:**

1. **Embeddings API** (50 lines)
   - Semantic search use cases
   - RAG pipelines

2. **Structured Outputs** (20 lines)
   - Data extraction workflows
   - API integration

3. **Code Execution** (15 lines)
   - Data analysis capabilities
   - Chart generation

---

## Summary & Recommendations

### Key Improvements Needed

**1. Tool Use Context** ✅ ADDED
- Every tool now has clear WHEN/HOW guidance
- Claude knows which tool for which situation
- Explicit "ALWAYS/NEVER" rules prevent misuse

**2. Response Requirements** ✅ ADDED
- Every tool specifies exact response structure
- Preview + savedPath pattern enforced
- User communication templates provided

**3. Missing Features Prioritized** ✅ UPDATED
- Phase 1: Quick wins (thinking, resolution, grounding)
- Phase 2: Video (high impact differentiator)
- Phase 3: Advanced (based on demand)

**4. Decision Trees** ✅ ADDED
- When to use grounding vs not
- When to use high vs low thinking
- When to use video vs image generation

### Implementation Recommendation

**Start with Phase 1 immediately:**
- Updates tool descriptions (zero code)
- Adds thinking levels (20 lines)
- Adds media resolution (30 lines)
- Enables search grounding (15 lines)

**Result:** Professional-grade tool suite with clear usage patterns

**Then evaluate Phase 2 (video) based on user feedback and competitive landscape.**

---

## Conclusion

This analysis provides:
- ✅ Clear tool use context for Claude
- ✅ Explicit WHEN/HOW decision trees
- ✅ Response structure requirements
- ✅ Implementation code snippets
- ✅ Prioritized roadmap (effort vs impact)

**Next step:** Implement Phase 1 (1-2 weeks) to dramatically improve Claude's tool selection and user experience, then assess demand for video generation before larger Phase 2 investment.

---

## CRITICAL IMPLEMENTATION ISSUES - MUST FIX

**Date Added:** 2025-02-21  
**Status:** Blocking correct functionality  
**Priority:** HIGH - Fix before adding new features

---

### ❌ BROKEN: `edit_image` - Incorrect Thought Signature Implementation

**Problem:** Currently putting `thoughtSignature` in **user** parts instead of proper conversation history format required by API.

**Current Implementation (WRONG):**
```typescript
// In buildContents() - src/services/gemini/image-service.ts
const userParts: GeminiPart[] = [{ text: prompt }];

if (images?.length) {
  for (const img of images) {
    const part: GeminiPart = {
      inlineData: { mimeType: img.mimeType, data: img.data }
    };
    if (img.thoughtSignature) {
      part.thoughtSignature = img.thoughtSignature;  // ← WRONG: In user parts!
    }
    userParts.push(part);
  }
}

return [{ role: 'user', parts: userParts }];  // ← Single-turn, loses context
```

**This produces (INCORRECT):**
```json
{
  "contents": [{
    "role": "user",
    "parts": [
      { "text": "Make the hat blue" },
      { 
        "inlineData": { "mimeType": "image/png", "data": "..." },
        "thoughtSignature": "abc123..."  // ← WRONG ROLE - API rejects this
      }
    ]
  }]
}
```

**API Requires (CORRECT):**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Generate a cat in a hat" }]
    },
    {
      "role": "model",
      "parts": [
        { "text": "Here is the image you requested." },
        {
          "inlineData": { "mimeType": "image/png", "data": "..." },
          "thoughtSignature": "abc123..."  // ← Must be in MODEL parts from previous turn
        }
      ]
    },
    {
      "role": "user",
      "parts": [{ "text": "Now make the hat blue." }]
    }
  ]
}
```

**Why This Fails:**
- ❌ API expects thought signatures in MODEL role (from previous response)
- ❌ Putting signatures in USER role breaks the conversational context
- ❌ Results in 400 errors or completely unrelated edits
- ❌ Model can't understand what it previously generated

**Required Fix:**

```typescript
// NEW: Add conversation history parameter
export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  images?: ImageInput[];
  // NEW: Conversation history for multi-turn editing
  previousTurns?: Array<{
    role: 'user' | 'model';
    parts: GeminiPart[];
  }>;
}

// UPDATED: buildContents() must support conversation history
private buildContents(
  prompt: string,
  images?: ImageInput[],
  previousTurns?: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>
): GeminiContent[] {
  
  const contents: GeminiContent[] = [];
  
  // 1. Add previous conversation history if exists
  if (previousTurns?.length) {
    contents.push(...previousTurns);
  }
  
  // 2. Add current user turn
  const userParts: GeminiPart[] = [{ text: prompt }];
  
  // 3. Add reference images WITHOUT thought signatures in user parts
  if (images?.length) {
    for (const img of images) {
      userParts.push({
        inlineData: { mimeType: img.mimeType, data: img.data }
        // NO thoughtSignature here - it belongs in model parts from history
      });
    }
  }
  
  contents.push({ role: 'user', parts: userParts });
  
  return contents;
}
```

**Tool-Level Changes Required:**

```typescript
// edit_image tool needs to build conversation history
async ({ prompt, images, model, outputPath }) => {
  
  // Build conversation history from thought signatures
  const previousTurns: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [];
  
  // If images have thought signatures, reconstruct the model's previous response
  if (images.some(img => img.thoughtSignature)) {
    // Add the original generation request (we don't have this - need to store it!)
    previousTurns.push({
      role: 'user',
      parts: [{ text: 'Generate image' }]  // ← Problem: We don't know original prompt!
    });
    
    // Add model's response with thought signatures
    previousTurns.push({
      role: 'model',
      parts: images.map(img => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
        thoughtSignature: img.thoughtSignature  // ← Correct location
      }))
    });
  }
  
  const result = await this.imageService.generateImage({
    prompt,
    model,
    images: images.map(img => ({
      data: img.data,
      mimeType: img.mimeType
      // NO thoughtSignature here
    })),
    previousTurns  // ← Pass conversation history
  });
}
```

**Additional Problem: We Don't Store Original Prompts**

For proper multi-turn editing, we need to track:
1. Original generation prompt
2. Model response (image + thought signature)
3. Each subsequent edit prompt
4. Each subsequent response

**Options:**

**Option A: Store conversation history in tool layer**
```typescript
// Store in-memory conversation history per image
const imageConversations = new Map<string, ConversationHistory>();

// On generate_image
const history = { turns: [userTurn, modelTurn] };
imageConversations.set(thoughtSignature, history);

// On edit_image  
const history = imageConversations.get(thoughtSignature);
history.turns.push(userTurn);
// Pass full history to API
```

**Option B: Return full conversation history to Claude**
```typescript
// generate_image returns
return {
  structuredContent: { ... },
  conversationHistory: {
    turns: [
      { role: 'user', prompt: originalPrompt },
      { role: 'model', thoughtSignature: 'abc123', imageData: '...' }
    ]
  }
};

// Claude stores this and passes back on edit
```

**Option C: Simplified - Store last turn only**
```typescript
// Just store the last model response
const lastModelResponse = {
  role: 'model',
  parts: [{
    inlineData: { ... },
    thoughtSignature: 'abc123'
  }]
};

// On edit, create minimal history:
const history = [
  { role: 'user', parts: [{ text: 'Previous edit' }] },
  lastModelResponse,
  { role: 'user', parts: [{ text: currentPrompt }] }
];
```

**Recommended Approach: Option C (Simplified)**

Reason: Gemini only needs the immediate previous turn for continuity, not full conversation history.

---

### ❌ MISSING: Thinking Levels (`thinkingConfig`)

**Status:** Not implemented  
**Models:** Gemini 3 series only (`gemini-3-pro-preview`, `gemini-3-flash-preview`)  
**Impact:** Missing cost/latency optimization

**API Format:**
```json
{
  "contents": [...],
  "generationConfig": {
    "thinkingConfig": {
      "includeThoughts": true,     // ← Required field
      "thinkingLevel": "high"      // ← "minimal" | "low" | "medium" | "high"
    },
    "maxOutputTokens": 8192,
    "temperature": 0.7
  }
}
```

**Valid Levels:**
- `"minimal"` - (Flash only) Fastest, minimal reasoning
- `"low"` - Minimize latency for simple tasks
- `"medium"` - (Flash only) Balanced
- `"high"` - Maximum reasoning depth (default for Gemini 3)

**Legacy Note:** Gemini 2.5 uses `thinkingBudget` (integer) instead of `thinkingLevel`

**Implementation Required:**

```typescript
// 1. Update GeminiChatOptions interface
export interface GeminiChatOptions {
  message: string;
  model?: string;
  grounding?: boolean;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';  // ← ADD THIS
}

// 2. Update request body in chat() method
const body = {
  contents: [...],
  generationConfig: {
    maxOutputTokens: options.maxTokens || this.config.maxTokens,
    temperature: options.temperature ?? this.config.temperature,
    ...(options.thinkingLevel && {
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: options.thinkingLevel
      }
    })
  },
  // ... tools, etc
};

// 3. Validate model support
private validateThinkingLevel(model: string, level?: string): void {
  if (!level) return;
  
  const isGemini3 = model.includes('gemini-3');
  if (!isGemini3) {
    throw new GeminiError(
      `thinkingLevel only supported on Gemini 3 models, got: ${model}`
    );
  }
  
  const isFlash = model.includes('flash');
  if ((level === 'minimal' || level === 'medium') && !isFlash) {
    throw new GeminiError(
      `"${level}" thinking level only available on Gemini 3 Flash models`
    );
  }
}
```

**Tool Schema Update:**

```typescript
inputSchema: {
  message: z.string().describe('Message to send to Gemini'),
  // ... existing params
  thinking_level: z.enum(['minimal', 'low', 'medium', 'high'])
    .optional()
    .describe(
      'Thinking depth for Gemini 3 models only.\n' +
      'SELECTION GUIDE:\n' +
      '  • "low" - Simple factual queries, translations, quick answers (fast, cheap)\n' +
      '  • "high" - Complex debugging, strategic planning, research (default, thorough)\n' +
      '  • "medium" - Balanced complexity (Flash only)\n' +
      '  • "minimal" - Minimum latency for trivial tasks (Flash only)\n' +
      'Ignored for non-Gemini-3 models. Cost/latency scale with thinking depth.'
    )
}
```

---

### ❌ MISSING: Media Resolution Control (`mediaResolution`)

**Status:** Not implemented  
**Models:** Gemini 3 and 2.5 series  
**Impact:** Missing quality/cost control for image/video analysis

**API Format:**

```json
{
  "contents": [{
    "parts": [
      {
        "inlineData": { "mimeType": "image/jpeg", "data": "..." },
        "mediaResolution": "MEDIA_RESOLUTION_HIGH"  // ← Per-part (note: UPPERCASE)
      },
      { "text": "Describe this image" }
    ]
  }],
  "generationConfig": {
    "mediaResolution": "MEDIA_RESOLUTION_LOW"  // ← Global default (UPPERCASE)
  }
}
```

**CRITICAL: Enum Values are UPPERCASE with underscores:**
- `"MEDIA_RESOLUTION_LOW"` - ~64-80 tokens per image, 70 per video frame
- `"MEDIA_RESOLUTION_MEDIUM"` - ~560 tokens per image, 70 per video frame
- `"MEDIA_RESOLUTION_HIGH"` - ~1120 tokens per image, 280 per video frame
- `"MEDIA_RESOLUTION_ULTRA_HIGH"` - 2000+ tokens (per-part only, not global)

**Implementation Required:**

```typescript
// 1. Add to ImageInput interface
export interface ImageInput {
  data: string;
  mimeType: string;
  thoughtSignature?: string;
  mediaResolution?: 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 
                    'MEDIA_RESOLUTION_HIGH' | 'MEDIA_RESOLUTION_ULTRA_HIGH';  // ← ADD
}

// 2. Add to GenerateImageOptions
export interface GenerateImageOptions {
  // ... existing
  globalMediaResolution?: 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 
                          'MEDIA_RESOLUTION_HIGH';  // ← ADD (no ULTRA_HIGH for global)
}

// 3. Update buildContents to include per-part resolution
private buildContents(
  prompt: string,
  images?: ImageInput[]
): GeminiContent[] {
  const userParts: GeminiPart[] = [{ text: prompt }];

  if (images?.length) {
    for (const img of images) {
      const part: GeminiPart = {
        inlineData: { mimeType: img.mimeType, data: img.data }
      };
      
      // Add per-part media resolution if specified
      if (img.mediaResolution) {
        part.mediaResolution = img.mediaResolution;  // ← ADD
      }
      
      if (img.thoughtSignature) {
        part.thoughtSignature = img.thoughtSignature;
      }
      
      userParts.push(part);
    }
  }

  return [{ role: 'user', parts: userParts }];
}

// 4. Update request body to include global resolution
const body = {
  contents: this.buildContents(options.prompt, options.images),
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE'],
    ...(options.globalMediaResolution && {
      mediaResolution: options.globalMediaResolution  // ← ADD
    }),
    // ... existing config
  }
};
```

**Tool Schema Updates:**

```typescript
// analyze_image and describe_image tools
inputSchema: {
  images: z.array(z.object({
    data: z.string(),
    mimeType: z.string(),
    mediaResolution: z.enum([
      'MEDIA_RESOLUTION_LOW',
      'MEDIA_RESOLUTION_MEDIUM', 
      'MEDIA_RESOLUTION_HIGH',
      'MEDIA_RESOLUTION_ULTRA_HIGH'
    ]).optional().describe(
      'Per-image resolution control (overrides global setting).\n' +
      'SELECTION GUIDE:\n' +
      '  • HIGH (1120 tokens) - Default for detailed analysis\n' +
      '  • MEDIUM (560 tokens) - PDFs/documents (OCR saturates at medium)\n' +
      '  • LOW (280 tokens) - Simple recognition, cost optimization\n' +
      '  • ULTRA_HIGH (2000+ tokens) - Maximum detail for tiny text'
    )
  })),
  global_media_resolution: z.enum([
    'MEDIA_RESOLUTION_LOW',
    'MEDIA_RESOLUTION_MEDIUM',
    'MEDIA_RESOLUTION_HIGH'
  ]).optional().describe(
    'Global default resolution for all images (can be overridden per-image).\n' +
    'Does NOT support ULTRA_HIGH (use per-image for that).'
  )
}
```

---

### ❌ MISSING: Search Grounding for Images

**Status:** Not implemented  
**Models:** `gemini-3-pro-image-preview` (and other image generation models)  
**Impact:** Cannot generate data-driven visuals (weather, charts, current events)

**API Format:**

```json
{
  "contents": [{
    "parts": [{ "text": "Create a weather graphic showing tomorrow's London forecast" }]
  }],
  "tools": [{
    "google_search": {}  // ← Note: snake_case, not camelCase
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]  // Can include both
  }
}
```

**CRITICAL Notes:**
- ✅ Use `"google_search"` (snake_case) for Gemini 3/2.0+ models
- ❌ NOT `"googleSearch"` (camelCase)
- ❌ NOT `"google_search_retrieval"` (legacy Gemini 1.5/2.5)

**Response Includes Grounding Metadata:**
```json
{
  "candidates": [...],
  "groundingMetadata": {
    "searchEntryPoint": {
      "renderedContent": "<html>...</html>"  // Search suggestions HTML/CSS
    },
    "groundingChunks": [  // Top sources used
      {
        "web": {
          "uri": "https://example.com/forecast",
          "title": "London Weather Forecast"
        }
      }
    ]
  }
}
```

**Implementation Required:**

```typescript
// 1. Update GenerateImageOptions
export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  images?: ImageInput[];
  useSearch?: boolean;  // ← ADD: Enable Google Search grounding
}

// 2. Update request body in generateImage()
const body: GeminiImageRequest = {
  contents: this.buildContents(options.prompt, options.images),
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE'],
    // ... image config
  },
  // Add tools array if search grounding requested
  ...(options.useSearch && {
    tools: [{ google_search: {} }]  // ← Note: snake_case
  })
};

// 3. Extract grounding metadata from response
interface GeminiImageResponse {
  candidates?: Array<{
    content: { parts: GeminiPart[] };
  }>;
  groundingMetadata?: {  // ← ADD
    searchEntryPoint?: {
      renderedContent: string;
    };
    groundingChunks?: Array<{
      web: {
        uri: string;
        title: string;
      };
    }>;
  };
  error?: { code: number; message: string; status: string };
}

// 4. Return grounding sources in result
export interface GeneratedImageResult {
  parts: ImageResponsePart[];
  mimeType: string;
  base64Data: string;
  description?: string;
  groundingSources?: Array<{  // ← ADD
    url: string;
    title: string;
  }>;
}

// 5. Extract sources in generateImage()
const groundingSources = data.groundingMetadata?.groundingChunks?.map(chunk => ({
  url: chunk.web.uri,
  title: chunk.web.title
}));

return {
  parts: responseParts,
  mimeType: firstImage.mimeType,
  base64Data: firstImage.base64Data,
  description,
  groundingSources  // ← Return to caller
};
```

**Tool Schema Update:**

```typescript
inputSchema: {
  // ... existing params
  use_search: z.boolean()
    .optional()
    .default(false)
    .describe(
      'Enable Google Search grounding for data-driven images.\n' +
      'WHEN TO USE:\n' +
      '  ✅ Weather forecasts: "Show tomorrow\'s weather in Paris"\n' +
      '  ✅ Stock charts: "Visualize Apple stock this month"\n' +
      '  ✅ Current events: "Illustrate last night\'s match score"\n' +
      '  ✅ Real statistics: "Infographic about recent SpaceX launches"\n' +
      'RETURNS: groundingSources array with web sources used for accuracy.'
    )
}
```

**Tool Response Update:**

```typescript
// In generate_image tool handler
const textLines: string[] = [];
if (savedPath) textLines.push(`Image saved to: ${savedPath}`);
if (previewPath) textLines.push(`HTML preview: ${previewPath}`);
if (result.description) textLines.push(`\n${result.description}`);

// NEW: Include grounding sources
if (result.groundingSources?.length) {
  textLines.push('\nSources used for data accuracy:');
  for (const source of result.groundingSources) {
    textLines.push(`  • ${source.title}: ${source.url}`);
  }
}
```

---

### ❌ COMPLETELY MISSING: Video Generation (Veo 3.1)

**Status:** Not implemented  
**Model:** `veo-3.1` (separate model family, not Gemini)  
**Impact:** Major feature gap, high user demand

**API Endpoint:** Different from image generation
```
POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:generateVideo
```

**Request Format:**
```json
{
  "contents": [{
    "parts": [
      { "text": "Sleek product shot of wireless headphones rotating in studio lighting" },
      // Optional: Up to 3 reference images
      { "inlineData": { "mimeType": "image/jpeg", "data": "..." } }
    ]
  }],
  "config": {
    "videoConfig": {
      "resolution": "1080p",     // "720p" | "1080p" | "4K"
      "aspectRatio": "16:9"      // "16:9" | "9:16"
    }
  }
}
```

**Response - Async Job Pattern:**
```json
{
  "jobId": "projects/.../operations/abc123xyz"
}
```

**Polling Endpoint:**
```
GET https://generativelanguage.googleapis.com/v1beta/operations/{jobId}
```

**Polling Response (In Progress):**
```json
{
  "name": "projects/.../operations/abc123xyz",
  "metadata": {
    "progressPercent": 45,
    "@type": "type.googleapis.com/google.ai.generativelanguage.v1beta.GenerateVideoMetadata"
  },
  "done": false
}
```

**Polling Response (Complete):**
```json
{
  "name": "projects/.../operations/abc123xyz",
  "metadata": { ... },
  "done": true,
  "response": {
    "@type": "type.googleapis.com/google.ai.generativelanguage.v1beta.GenerateVideoResponse",
    "video": {
      "data": "<base64-encoded-mp4>",
      "mimeType": "video/mp4"
    }
  }
}
```

**Implementation Requirements:**

**Need More Information On:**
1. ❓ Exact error response format for failed jobs
2. ❓ Timeout recommendations (how long before giving up?)
3. ❓ Rate limits on polling frequency
4. ❓ Video extension API details (extending existing 8s videos)
5. ❓ Frame control API details (specifying first/last frames)
6. ❓ Audio generation control (dialogue vs music vs effects)

**What We Know:**
- ✅ 8-second video generation
- ✅ Resolutions: 720p, 1080p, 4K
- ✅ Aspect ratios: 16:9, 9:16
- ✅ Native audio generation included
- ✅ Up to 3 reference images supported
- ✅ Async job-based workflow with polling

**Minimal Implementation Sketch:**

```typescript
// 1. New VeoService class
export class VeoService extends BaseService {
  
  async generateVideo(options: VideoOptions): Promise<string> {
    const body = {
      contents: [{
        parts: [
          { text: options.prompt },
          ...(options.images?.map(img => ({ 
            inlineData: { mimeType: img.mimeType, data: img.data }
          })) || [])
        ]
      }],
      config: {
        videoConfig: {
          resolution: options.resolution || '1080p',
          aspectRatio: options.aspectRatio || '16:9'
        }
      }
    };

    const response = await fetch(
      `${GEMINI_API_BASE}/veo-3.1:generateVideo?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    return data.jobId;  // Return job ID for polling
  }

  async checkVideoStatus(jobId: string): Promise<VideoJobStatus> {
    const response = await fetch(
      `${GEMINI_API_BASE}/operations/${jobId}?key=${this.apiKey}`
    );
    
    const data = await response.json();
    
    if (data.done) {
      return {
        status: 'completed',
        videoData: data.response.video.data,
        mimeType: data.response.video.mimeType
      };
    }
    
    return {
      status: data.metadata?.progressPercent 
        ? `processing (${data.metadata.progressPercent}%)` 
        : 'queued'
    };
  }

  async waitForCompletion(
    jobId: string, 
    maxWaitMs: number = 300000  // 5 minutes default
  ): Promise<VideoResult> {
    const startTime = Date.now();
    const pollIntervalMs = 5000;  // Poll every 5 seconds
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkVideoStatus(jobId);
      
      if (status.status === 'completed') {
        return status;
      }
      
      // TODO: Handle error states (need API docs on error format)
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new GeminiError('Video generation timeout');
  }
}

// 2. Tool registration
registerAppTool(
  server,
  'generate_video',
  {
    title: 'Generate Video with Veo',
    description: 'Generate 8-second videos with Veo 3.1 (up to 4K, with audio)',
    inputSchema: {
      prompt: z.string().describe('Video description'),
      resolution: z.enum(['720p', '1080p', '4K']).optional().default('1080p'),
      aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9'),
      images: z.array(imageInputSchema).max(3).optional(),
      outputPath: z.string().optional()
    }
  },
  async ({ prompt, resolution, aspectRatio, images, outputPath }) => {
    // 1. Start async job
    const jobId = await veoService.generateVideo({ prompt, resolution, aspectRatio, images });
    
    // 2. Wait for completion (with progress updates to user?)
    const result = await veoService.waitForCompletion(jobId);
    
    // 3. Save video to disk
    const videoPath = outputPath || resolve(DEFAULT_VIDEO_OUTPUT_DIR, `veo-${Date.now()}.mp4`);
    await saveVideoToFile(result.videoData, videoPath);
    
    // 4. Extract first frame as thumbnail (requires ffmpeg)
    const thumbnail = await extractFirstFrame(videoPath);
    
    // 5. Return thumbnail for preview + video path
    return {
      structuredContent: {
        base64Data: thumbnail.base64,
        mimeType: 'image/jpeg',
        savedPath: videoPath,
        isVideo: true
      },
      content: [{
        type: 'text',
        text: `Video saved to: ${videoPath}\nDuration: 8 seconds\nResolution: ${resolution}`
      }]
    };
  }
);
```

---

## Summary of Required Fixes

### Priority 1: Fix Broken Features
1. **edit_image thought signatures** - CRITICAL, completely broken
   - Implement conversation history format
   - Store previous model responses
   - Test multi-turn editing workflow

### Priority 2: Add Missing Core Features (Quick Wins)
2. **Thinking levels** - 20 lines, high value
3. **Media resolution** - 30 lines, cost optimization
4. **Search grounding for images** - 15 lines, unique capability

### Priority 3: Major New Features
5. **Video generation** - 300+ lines, needs research on:
   - Error handling format
   - Polling best practices
   - Extension and frame control APIs

---

## Information Gaps for Full Implementation

### Known (Can Implement Now):
✅ Thinking levels - Full request/response format documented
✅ Media resolution - Enum values and structure clear
✅ Search grounding for images - Tool format clear
✅ Thought signatures - Conversation history format now understood

### Unknown (Need Research):
❌ Video generation error responses
❌ Video polling timeout recommendations
❌ Video extension API (8s → 16s+)
❌ Frame control API details
❌ Audio generation control options

**Recommendation:** Implement Priority 1 and Priority 2 features immediately (we have all required information). Research Priority 3 (video) in parallel, implement when API details confirmed.

---

*End of Critical Issues Section*