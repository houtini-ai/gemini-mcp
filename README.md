# @houtini/gemini-mcp

[![npm version](https://img.shields.io/npm/v/@houtini/gemini-mcp.svg?style=flat-square)](https://www.npmjs.com/package/@houtini/gemini-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue?style=flat-square)](https://registry.modelcontextprotocol.io)

**I've been running this MCP server in my Claude Desktop setup for several months, and it's become one of the few I actually leave enabled permanently.** Not because Gemini replaces Claude — it doesn't — but because grounded search, deep research, and image generation are things Gemini genuinely does well, and having them available as tools inside Claude is more useful than switching between browser tabs.

Nine tools. One `npx` command. Here's what's in it.

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

## What it does

### Chat with Google Search grounding

```
Use gemini:gemini_chat to ask: "What changed in the MCP spec in the last month?"
```

Grounding is on by default. Gemini searches Google before answering, so you get real current information rather than training data cutoff answers. For questions where you actually want the model's reasoning rather than a live search — "explain this code" or similar — set `grounding: false`.

Supports `thinking_level` on Gemini 3 models: `high` for maximum reasoning depth, `low` to keep it fast, `medium`/`minimal` on Gemini 3 Flash only.

### Deep research

```
Use gemini:gemini_deep_research with:
  research_question="What are the current approaches to AI agent memory management?"
  max_iterations=4
```

This runs multiple grounded search iterations, then synthesises a full report. Takes a few minutes. Worth it for anything where you need comprehensive coverage rather than a quick answer.

Set `max_iterations` to 3–4 in Claude Desktop — there's a 4-minute tool timeout that will cut off longer runs. In IDEs (Cursor, Windsurf, VS Code) or agent frameworks with longer timeout tolerance, 7–10 iterations produces noticeably better synthesis. Pass `focus_areas` as an array if you want to steer it toward specific angles.

### Image generation

```
Use gemini:generate_image with:
  prompt="A photorealistic tabby cat sitting on a windowsill at golden hour"
  aspectRatio="16:9"
```

Default model is `gemini-3-pro-image-preview` (Nano Banana Pro). Also supports `gemini-2.5-flash-image` for faster generation at higher volume.

**Search grounding for data-driven images** — Enable real-time data integration in generated images:

```
Use gemini:generate_image with:
  prompt="Weather forecast visualization for London tomorrow with actual temperatures"
  use_search=true
```

When `use_search` is enabled, Gemini searches Google for current data before generating the image. Perfect for:
- Weather forecasts with real temperatures
- Stock charts with current market data
- News-driven infographics
- Sports scores and statistics

The response includes grounding sources as markdown links showing which websites informed the image.

**Media resolution control for cost optimization** — Reduce token usage by up to 75%:

```
Use gemini:generate_image with:
  prompt="Analyze this PDF"
  images=[{data: pdfBase64, mimeType: "application/pdf"}]
  global_media_resolution="MEDIA_RESOLUTION_MEDIUM"
```

Resolution levels and token costs:
- `MEDIA_RESOLUTION_LOW` — 280 tokens per image (75% savings) — Simple tasks, bulk operations
- `MEDIA_RESOLUTION_MEDIUM` — 560 tokens per image (50% savings) — PDFs/documents (OCR quality saturates here)
- `MEDIA_RESOLUTION_HIGH` — 1120 tokens per image (default) — Best quality, detailed analysis
- `MEDIA_RESOLUTION_ULTRA_HIGH` — 2000+ tokens per image (per-image only) — Maximum detail work

Set `global_media_resolution` to apply to all images, or override per-image in the `images` array:

```
Use gemini:generate_image with:
  images=[
    {data: simpleIcon, mimeType: "image/png", mediaResolution: "MEDIA_RESOLUTION_LOW"},
    {data: detailedDiagram, mimeType: "image/png", mediaResolution: "MEDIA_RESOLUTION_ULTRA_HIGH"}
  ]
```

**Where do images go?** By default, the tool returns the image as base64 data — Claude renders it inline in the conversation. If you set `GEMINI_IMAGE_OUTPUT_DIR` in your config, every generated image saves automatically to that directory as a PNG, and the tool returns the file path alongside the inline preview. For anything you want to keep, set the output directory. Base64 inline has a ~1MB size limit and won't persist beyond the conversation.

```json
"env": {
  "GEMINI_API_KEY": "your-api-key-here",
  "GEMINI_IMAGE_OUTPUT_DIR": "C:/Users/username/Pictures/gemini-output"
}
```

You can also pass `outputPath` per-call to override the directory for a specific generation.

### Conversational image editing

Gemini 3 Pro Image maintains visual context across editing turns using thought signatures — the model's memory of what it generated. The server captures these and returns them in the response. Pass them back in the next call to edit with full context of the previous generation. Skip them and each edit starts from scratch.

1. Call `gemini:generate_image` — note the thought signatures in the response
2. Call `gemini:edit_image` with the original image data and the signatures in the `images` array
3. The model edits with full continuity

### Describe and analyse images

Two separate tools for different purposes:

- `gemini:describe_image` — general description, uses `gemini-3-flash-preview` by default. Fast.
- `gemini:analyze_image` — structured extraction and analysis, uses `gemini-3.1-pro-preview`. More capable for detailed analysis tasks.

Load local images with `gemini:load_image_from_path` and pipe the result straight into either tool:

```
Use gemini:load_image_from_path with filePath="C:/screenshots/error.png",
then pass the result to gemini:analyze_image with prompt="What's causing this error?"
```

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

Returns a self-contained HTML file — inline CSS and vanilla JS, no external dependencies. Useful for quick prototypes. If you skip `outputPath`, it returns the raw HTML string to Claude's context instead; use Desktop Commander to write it to disk from there.

---

## Configuration reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google AI API key from [AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_DEFAULT_MODEL` | No | `gemini-3.1-pro-preview` | Default model for `gemini_chat` and `analyze_image` |
| `GEMINI_DEFAULT_GROUNDING` | No | `true` | Enable Google Search grounding by default |
| `GEMINI_IMAGE_OUTPUT_DIR` | No | — | Auto-save directory for generated images. If unset, images return inline as base64 only |
| `GEMINI_ALLOW_EXPERIMENTAL` | No | `false` | Include experimental/preview models in auto-discovery |
| `GEMINI_MCP_LOG_FILE` | No | `false` | Write logs to `~/.gemini-mcp/logs/`. Off by default — can cause permission issues on npx installs |
| `DEBUG_MCP` | No | `false` | Log to stderr. Useful when debugging tool calls |

---

## Tools reference

| Tool | Description |
|------|-------------|
| `gemini_chat` | Chat with Gemini models. Grounding via Google Search on by default. Supports `thinking_level` for Gemini 3 |
| `gemini_deep_research` | Multi-step iterative research with Google Search. Synthesises a full report. Takes a few minutes |
| `gemini_list_models` | Lists available models from the API |
| `generate_image` | Image generation via `gemini-3-pro-image-preview`. Returns thought signatures for conversational editing |
| `edit_image` | Edit images with natural-language instructions. Pass thought signatures for multi-turn continuity |
| `describe_image` | Describe or analyse images. Text output only |
| `analyze_image` | Extract structured information from images using `gemini-3.1-pro-preview` |
| `load_image_from_path` | Read a local image file and return base64 ready for any image tool |
| `generate_landing_page` | Generate a self-contained HTML landing page. Returns raw HTML |

---

## Gemini 3 notes

**Temperature:** Gemini 3 models require temperature 1.0. Google's docs warn that lower values cause looping or degraded reasoning. The server enforces this automatically — whatever you pass in gets overridden to 1.0 on Gemini 3.

**Thought signatures:** Required for conversational editing with `gemini-3-pro-image-preview`. The server captures and returns them in the response. Pass them back on subsequent edit calls — without them, each edit call starts fresh with no memory of the previous generation.

**Thinking level:** Only applies to `gemini_chat` with Gemini 3 models. Gemini 3 Flash supports `minimal` and `medium` in addition to `low` and `high`. The parameter is ignored on non-Gemini-3 models.

---

## Supported image models

| Model | Notes |
|-------|-------|
| `gemini-3-pro-image-preview` | Default. Nano Banana Pro — highest quality, Gemini 3 architecture |
| `gemini-2.5-flash-image` | Gemini 2.5 Flash image generation — faster, higher volume |
| `nano-banana-pro-preview` | API alias for `gemini-3-pro-image-preview` |

---

## Requirements

- Node.js 18+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Licence

Apache-2.0
