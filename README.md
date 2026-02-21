# @houtini/gemini-mcp

[![npm version](https://img.shields.io/npm/v/@houtini/gemini-mcp.svg?style=flat-square)](https://www.npmjs.com/package/@houtini/gemini-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue?style=flat-square)](https://registry.modelcontextprotocol.io)

**I've been running this MCP server in my Claude Desktop setup for several months, and it's become one of the few I actually leave enabled permanently.** Not because Gemini replaces Claude — it doesn't — but because grounded search, deep research, and image generation are things Gemini genuinely does well, and having them available as tools inside Claude is more useful than switching between browser tabs.

**Version 2.2.0** includes significant improvements: help system for better onboarding, quality 100 image previews (no more blurry images), Gemini 3.1 Pro defaults, professional chart design systems, and enhanced search grounding.

Ten tools. One `npx` command. Here's what's in it.

---

## Get started in two minutes

**Step 1: Get a Gemini API key**

Go to [Google AI Studio](https://aistudio.google.com/apikey) and create a key. Free tier covers most development use — you'll hit rate limits on deep research if you're hammering it, but for day-to-day tool use it's fine.

**Step 2: Add to your Claude Desktop config**

Config file locations:
- Windows: `C:\Users\{username}\AppData\Roaming\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["@houtini/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Step 3: Restart Claude Desktop**

That's it. The tools show up automatically. You don't need to install anything separately — `npx` pulls the package on first run.

### If you want a local build instead

For development, or if you'd rather not rely on npx:

```bash
git clone https://github.com/houtini-ai/gemini-mcp
cd gemini-mcp
npm install --include=dev
npm run build
```

Then point your config at the local build:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["C:/path/to/gemini-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

---

## What's new in v2.2.0

### Help system

```
Use gemini:gemini_help with topic="overview"
```

Get comprehensive documentation for all Gemini MCP features without leaving Claude. Topics include: `overview`, `image_generation`, `image_editing`, `image_analysis`, `chat`, `deep_research`, `grounding`, `media_resolution`, `models`, `all`.

### Image quality improvements

Images now generate at quality 100 (lossless compression) with 1024px previews instead of the previous quality 60 @ 512px. Technical diagrams, charts, and text are now crisp and readable. Dramatically better for any image with fine details or text labels.

### Default model upgrades

- Chat defaults to `gemini-3.1-pro-preview` (was gemini-3-flash-preview)
- Image analysis defaults to `gemini-3.1-pro-preview` (was gemini-3-flash-preview)
- Noticeable quality improvements in responses and reasoning

### Professional chart design systems

The `gemini_prompt_assistant` tool now includes 9 professional chart design systems for data visualization:

- **Professional** (IBM Carbon / Tailwind) - Enterprise dashboards
- **Storytelling** (Cole Nussbaumer Knaflic) - Strategic highlighting for business insights
- **Financial** (Financial Times) - Elegant editorial with FT Pink background
- **Terminal** (Bloomberg / Fintech) - High-density dark mode with electric neon
- **Modernist** (W.E.B. Du Bois) - Bold geometric blocks and stark contrasts
- **Editorial** (FiveThirtyEight / Economist) - Data journalism
- **Scientific** (Nature / Science) - Academic rigor
- **Minimal** (Edward Tufte) - Maximum data-ink ratio
- **Dark** (Observable) - Modern dark mode

Each system provides complete colour palettes, typography specifications, and design rules optimised for clean, modern, uncluttered charts.

---

## What it does

### Chat with Google Search grounding

```
Use gemini:gemini_chat to ask: "What changed in the MCP spec in the last month?"
```

Grounding is on by default. Gemini searches Google before answering, so you get real current information rather than training data cutoff answers. Grounding sources are displayed as markdown links in the response.

For questions where you want the model's reasoning rather than a live search — "explain this code" or similar — set `grounding: false`.

Supports `thinking_level` on Gemini 3 models: `high` for maximum reasoning depth, `low` to keep it fast, `medium`/`minimal` on Gemini 3 Flash only.

### Deep research

```
Use gemini:gemini_deep_research with:
  research_question="What are the current approaches to AI agent memory management?"
  max_iterations=5
```

This runs multiple grounded search iterations, then synthesises a full report. Takes 2-5 minutes depending on complexity. Worth it for anything where you need comprehensive coverage rather than a quick answer.

Set `max_iterations` to 3–4 in Claude Desktop (4-minute tool timeout). In IDEs (Cursor, Windsurf, VS Code) or agent frameworks with longer timeout tolerance, 7–10 iterations produces noticeably better synthesis. Pass `focus_areas` as an array to steer toward specific angles.

### Image generation with search grounding

```
Use gemini:generate_image with:
  prompt="Stock price chart showing Apple (AAPL) closing prices for the last 5 trading days with actual dollar values"
  use_search=true
  aspectRatio="16:9"
```

Default model is `gemini-3-pro-image-preview` (Nano Banana Pro). Also supports `gemini-2.5-flash-image` for faster generation.

**Search grounding for data-driven images** — Enable real-time data integration:

When `use_search=true`, Gemini searches Google for current data before generating the image. Perfect for:
- **Financial data** — Stock charts with current market prices (works reliably)
- **News events** — Current events with actual headlines (works reliably)  
- **Sports scores** — Recent game results with real scores
- **Statistics** — Current data visualizations

⚠️ **Note:** Weather queries don't consistently return grounding sources (Gemini API limitation). Financial and news queries work reliably.

The response includes grounding sources as markdown links showing which websites informed the image:

```
**Sources used for grounding:**
1. [twelvedata.com](https://...)
2. [seekingalpha.com](https://...)
3. [investing.com](https://...)
```

### Media resolution control for cost optimization

Reduce token usage by up to 75% whilst maintaining quality for your use case:

```
Use gemini:analyze_image with:
  images=[{data: pdfBase64, mimeType: "application/pdf"}]
  prompt="Extract all text from this document"
  global_media_resolution="MEDIA_RESOLUTION_MEDIUM"
```

**Resolution levels and token costs:**
- `MEDIA_RESOLUTION_LOW` — 280 tokens (75% savings) — Simple tasks, bulk operations
- `MEDIA_RESOLUTION_MEDIUM` — 560 tokens (50% savings) — **PDFs/documents (OCR saturates at medium)**
- `MEDIA_RESOLUTION_HIGH` — 1120 tokens (default) — Best quality, detailed analysis
- `MEDIA_RESOLUTION_ULTRA_HIGH` — 2000+ tokens (per-image only) — Maximum detail

**Important:** For PDF OCR, MEDIUM resolution provides identical text extraction quality to HIGH whilst using 50% fewer tokens. Only use HIGH/ULTRA_HIGH for complex visual analysis.

Set `global_media_resolution` to apply to all images, or override per-image:

```
Use gemini:analyze_image with:
  images=[
    {data: simpleIcon, mimeType: "image/png", mediaResolution: "MEDIA_RESOLUTION_LOW"},
    {data: detailedDiagram, mimeType: "image/png", mediaResolution: "MEDIA_RESOLUTION_ULTRA_HIGH"}
  ]
  prompt="Analyze both images"
  global_media_resolution="MEDIA_RESOLUTION_MEDIUM"
```

### Image output and storage

**Default behaviour:** Images return as inline base64 previews (quality 100, 1024px) rendered directly in Claude. Perfect for quick generation and viewing.

**Persistent storage:** Set `GEMINI_IMAGE_OUTPUT_DIR` to automatically save all generated images:

```json
"env": {
  "GEMINI_API_KEY": "your-api-key-here",
  "GEMINI_IMAGE_OUTPUT_DIR": "C:/Users/username/Pictures/gemini-output"
}
```

Every image saves to this directory with a timestamp filename. The tool returns both the inline preview AND the file path. For anything you want to keep, set the output directory.

**Per-call override:** Pass `outputPath` to save a specific image to a custom location:

```
Use gemini:generate_image with:
  prompt="Company logo concept"
  outputPath="C:/projects/branding/logo-concept-01.png"
```

⚠️ **Size limits:** Base64 inline previews have a ~1MB limit and don't persist beyond the conversation. For production images or anything you need to keep, use output directories.

### Conversational image editing

Gemini 3 Pro Image maintains visual context across editing turns using thought signatures — the model's memory of what it generated. The server captures these automatically and returns them in the response. Pass them back in the next call to edit with full context.

**Workflow:**

1. Generate initial image:
```
Use gemini:generate_image with:
  prompt="A modern minimalist logo for a tech startup"
  model="gemini-3-pro-image-preview"
```

2. Edit with context:
```
Use gemini:edit_image with:
  prompt="Change the color scheme to blue and green"
  images=[
    {
      data: imageFromStep1Base64,
      mimeType: "image/png",
      thoughtSignature: "thoughtSignatureFromStep1"
    }
  ]
  model="gemini-3-pro-image-preview"
```

The model edits with full continuity. Skip thought signatures and each edit starts from scratch.

### Image analysis and description

Two separate tools for different purposes:

**Quick descriptions:**
```
Use gemini:describe_image with:
  images=[{data: imageBase64, mimeType: "image/jpeg"}]
  prompt="Describe this image in technical detail"
```
Uses `gemini-3-flash-preview` by default. Fast general descriptions.

**Detailed analysis and extraction:**
```
Use gemini:analyze_image with:
  images=[{data: imageBase64, mimeType: "image/jpeg"}]
  prompt="Extract the product name, price, and description from this screenshot"
```
Uses `gemini-3.1-pro-preview` by default. More capable for structured extraction, technical analysis, and complex reasoning about images.

**Load local images:**
```
Use gemini:load_image_from_path with:
  filePath="C:/screenshots/error.png"
```
Returns base64 data ready to pass directly to any image tool.

### Professional chart generation

The `gemini_prompt_assistant` tool provides expert guidance for chart generation using 9 professional design systems:

```
Use gemini:gemini_prompt_assistant with:
  request_type="template"
  use_case="product"
  desired_outcome="Generate a professional product comparison chart"
```

**Available design systems:**

1. **storytelling** (Cole Nussbaumer Knaflic) — Strategic highlighting for business insights
   - Everything muted grey except ONE highlighted data point in bold colour
   - Actionable titles that state the takeaway
   - No legends — direct labeling only
   - Perfect for executive presentations

2. **financial** (Financial Times) — Elegant editorial journalism
   - Signature FT Pink background (#fff1e5)
   - White gridlines on coloured background
   - Serif titles + sans-serif data
   - 2px top border for structure

3. **terminal** (Bloomberg / Fintech) — High-density dark mode
   - Electric neon colours on black (#00e3d1, #34e05b, #ff2b6d)
   - Monospace for precision
   - Y-axis labels on right side
   - Crosshairs and borders

4. **modernist** (W.E.B. Du Bois) — Bold geometric blocks
   - 100% solid opaque colours (no gradients)
   - 1-2px solid black outlines on all shapes
   - No gridlines — direct labels only
   - Centered all-caps titles

5. **professional** (IBM Carbon / Tailwind) — Enterprise UI
6. **editorial** (FiveThirtyEight / Economist) — Data journalism
7. **scientific** (Nature / Science) — Academic rigor
8. **minimal** (Edward Tufte) — Maximum data-ink ratio
9. **dark** (Observable) — Modern dark mode

**Request types:**
- `template` — Get complete prompt templates with colour palettes and rules
- `optimize_prompt` — Improve existing chart prompts
- `troubleshoot` — Fix chart generation issues
- `lighting_guide`, `color_guide`, `lens_guide`, `style_guide` — Specific guidance

### Landing page generation

```
Use gemini:generate_landing_page with:
  brief="A SaaS tool that helps developers monitor API latency"
  companyName="PingWatch"
  primaryColour="#6366F1"
  style="startup"
  sections=["hero", "features", "pricing", "cta"]
  outputPath="C:/dev/pingwatch/landing.html"
```

Returns a self-contained HTML file — inline CSS and vanilla JS, no external dependencies. Useful for quick prototypes and MVP landing pages.

**Styles:** `minimal`, `bold`, `corporate`, `startup`

If you skip `outputPath`, it returns raw HTML string to Claude's context; use Desktop Commander to write it to disk.

---

## Configuration reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google AI API key from [AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_DEFAULT_MODEL` | No | `gemini-3.1-pro-preview` | Default model for `gemini_chat` and `analyze_image` |
| `GEMINI_DEFAULT_GROUNDING` | No | `true` | Enable Google Search grounding by default |
| `GEMINI_IMAGE_OUTPUT_DIR` | No | — | Auto-save directory for all generated images. If unset, images return inline as base64 only |
| `GEMINI_ALLOW_EXPERIMENTAL` | No | `false` | Include experimental/preview models in auto-discovery |
| `GEMINI_MCP_LOG_FILE` | No | `false` | Write logs to `~/.gemini-mcp/logs/`. Off by default — can cause permission issues on npx installs |
| `DEBUG_MCP` | No | `false` | Log to stderr. Useful when debugging tool calls |

---

## Tools reference

| Tool | Description |
|------|-------------|
| `gemini_chat` | Chat with Gemini 3.1 Pro. Google Search grounding on by default. Supports `thinking_level` for Gemini 3 |
| `gemini_deep_research` | Multi-step iterative research with Google Search. Synthesises comprehensive reports (2-5 minutes) |
| `gemini_list_models` | Lists available models from the API with descriptions |
| `gemini_help` | **NEW** Comprehensive help system — get documentation for all features without leaving Claude |
| `generate_image` | Image generation (quality 100 @ 1024px). Returns thought signatures for conversational editing. Supports search grounding |
| `edit_image` | Edit images with natural-language instructions. Pass thought signatures for multi-turn continuity |
| `describe_image` | Describe or analyse images using Gemini 3 Flash. Text output, general descriptions |
| `analyze_image` | Extract structured information from images using Gemini 3.1 Pro. Detailed analysis and reasoning |
| `load_image_from_path` | Read a local image file and return base64 ready for any image tool |
| `generate_landing_page` | Generate self-contained HTML landing pages with inline CSS/JS. No external dependencies |
| `gemini_prompt_assistant` | **NEW** Expert guidance for image generation with 9 professional chart design systems |

---

## Gemini 3 notes

**Temperature:** Gemini 3 models require temperature 1.0. Google's docs warn that lower values cause looping or degraded reasoning. The server enforces this automatically — whatever you pass gets overridden to 1.0 on Gemini 3.

**Thought signatures:** Required for conversational editing with `gemini-3-pro-image-preview`. The server captures and returns them automatically. Pass them back on subsequent edit calls — without them, each edit starts fresh with no memory.

**Thinking level:** Only applies to `gemini_chat` with Gemini 3 models. Gemini 3 Flash supports `minimal` and `medium` in addition to `low` and `high`. Ignored on non-Gemini-3 models.

---

## Supported image models

| Model | Notes |
|-------|-------|
| `gemini-3-pro-image-preview` | Default for generation. Nano Banana Pro — highest quality, Gemini 3 architecture |
| `gemini-2.5-flash-image` | Gemini 2.5 Flash — faster generation, higher volume |
| `nano-banana-pro-preview` | API alias for `gemini-3-pro-image-preview` |
| `gemini-3-flash-preview` | Default for `describe_image` — fast general descriptions |
| `gemini-3.1-pro-preview` | Default for `analyze_image` and `gemini_chat` — advanced reasoning |

---

## Search grounding coverage

Based on testing, search grounding works reliably for:
- ✅ Financial data (stock prices, market data)
- ✅ News and current events
- ✅ Sports scores and statistics
- ⚠️ Weather data (inconsistent — API limitation, not a code issue)

Financial and news queries return 2-5 grounding sources as markdown links. Weather queries may generate images but don't consistently return grounding metadata from the Gemini API.

---

## Chart design system quick reference

**For business presentations:** Use `storytelling` (muted grey with one bold highlight)  
**For editorial content:** Use `financial` (FT Pink background) or `editorial` (FiveThirtyEight style)  
**For dark interfaces:** Use `terminal` (electric neon on black) or `dark` (modern dark mode)  
**For academic work:** Use `scientific` (Nature/Science journals)  
**For maximum clarity:** Use `minimal` (Edward Tufte data-ink)  
**For visual impact:** Use `modernist` (W.E.B. Du Bois geometric blocks)  
**For enterprise apps:** Use `professional` (IBM Carbon / Tailwind)

---

## Requirements

- Node.js 18+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Licence

Apache-2.0

---

## Changelog

### v2.2.0 (2025-02-21)
- ✨ Added `gemini_help` tool with comprehensive documentation
- ✨ Image quality improvements (quality 100 @ 1024px vs old quality 60 @ 512px)
- ✨ Default model upgrades to Gemini 3.1 Pro for chat and analysis
- ✨ Professional chart design systems (9 systems covering major visualization philosophies)
- ✨ Enhanced `gemini_prompt_assistant` with design system templates
- 📝 Comprehensive README update with all features documented
- 🐛 Grounding source display improvements (markdown links)
- 📊 Test coverage for all v2.2.0 features

### v2.1.0
- Search grounding for image generation
- Media resolution control for cost optimization
- Thought signatures for conversational editing
- Multiple model support

### v2.0.0
- Initial public release
- Chat, deep research, image generation
- Image analysis and description
- Landing page generation