# Gemini MCP — Development Handover

**Package:** `@houtini/gemini-mcp` v1.4.6  
**Location:** `C:\MCP\gemini-mcp`  
**Last session:** February 2026

---

## What happened in the last session

Two things:

1. **Fixed a broken build** — `npm install` had been run without `--include=dev` at some point, leaving devDependencies absent (168 packages instead of 617). `@types/node` was missing, which broke `tsc`. Fix was `npm install --include=dev`. No source changes needed.

2. **Removed deprecated model** — `gemini-2.0-flash-exp` has been pulled from the Gemini API (returns 404). Replaced with `gemini-2.5-flash-image` across three files: `src/services/gemini/image-service.ts`, `src/index.ts`, `README.md`.

---

## Immediate next task: model list audit

The model constants and descriptions in this codebase are partially stale. The work needed is a systematic audit against the current Gemini API docs. Here's what we know from the last session:

### Current models confirmed working (February 2026)

From `gemini_list_models` output:

**Chat / text generation:**
- `gemini-3.1-pro-preview` — best current chat model, 1M context, Feb 2026 update
- `gemini-3.1-pro-preview-customtools` — same but prioritises custom tools over built-ins
- `gemini-3-pro-preview` — previous gen Pro
- `gemini-3-flash-preview` — fast Gemini 3

**Image generation:**
- `gemini-3-pro-image-preview` — default, Nano Banana Pro, highest quality
- `nano-banana-pro-preview` — API alias for above
- `gemini-2.5-flash-image` — Nano Banana, faster/higher volume (replaced `gemini-2.0-flash-exp`)

**Deprecated (remove or replace):**
- `gemini-2.5-flash-preview-05-20` — still in `IMAGE_GENERATION_MODELS` and `IMAGE_VISION_MODELS`, probably stale preview date, needs verification
- `gemini-2.0-flash-exp` — **already removed** this session

### Models from the official docs to evaluate adding

From https://ai.google.dev/gemini-api/docs/models (provided in session):

**gemini-3.1-pro-preview** (Feb 2026)
- 1M input / 65,536 output tokens
- Supports: grounding, function calling, code execution, structured outputs, thinking, URL context
- Recommended for agentic workflows with custom tools
- This is already the default chat model — just ensure the description is current

**gemini-2.5-flash-image** (Oct 2025) — already added
- 65,536 input / 32,768 output tokens
- Image generation + text output

**gemini-3-pro-image-preview** (Nov 2025) — already in place as default
- Same token limits as above
- Supports search grounding and thinking (unusual for image models)

There are also two specialist models in the docs that would require new MCP tools rather than just model constant additions:

**veo-3.1-generate-preview** — video generation with audio
- Input: text + image, Output: video with audio
- Separate API endpoint and response format — not compatible with current `generateContent` flow
- Would need a new `generate_video` tool

**lyria-realtime-exp** — music generation
- Input: weighted text prompts, Output: raw 16-bit PCM audio at 48kHz stereo
- Real-time streaming API — completely different from existing tools
- Would need a new `generate_music` tool

---

## Codebase orientation

### Architecture

```
src/
├── index.ts                          # All tool registrations (McpServer.registerTool)
├── config/
│   ├── index.ts                      # Config object + validateConfig()
│   └── types.ts                      # Config interfaces
├── services/
│   ├── base-service.ts               # Logging helpers
│   └── gemini/
│       ├── index.ts                  # GeminiService — chat, listModels, analyzeImages
│       ├── image-service.ts          # GeminiImageService — generate/edit/describe
│       └── types.ts                  # Shared interfaces
├── tools/
│   ├── gemini-deep-research.ts       # Deep research implementation
│   ├── generate-landing-page.ts      # Landing page generation
│   └── load-image-from-path.ts       # File → base64 loader
└── utils/
    ├── logger.ts                     # Winston logger (file-based, not stdout)
    ├── error-handler.ts              # McpError, createToolResult, GeminiError
    └── image-compress.ts             # Sharp-based compression for inline display
```

### Key constants to update

**`src/services/gemini/image-service.ts`**

```typescript
export const IMAGE_GENERATION_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-preview-05-20',   // <-- verify still valid
  'nano-banana-pro-preview',
] as const;

export const IMAGE_VISION_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-pro-preview',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-preview-05-20',   // <-- same
] as const;
```

**`src/services/gemini/index.ts`**

The `getFallbackModels()` method returns a hardcoded list used when API discovery fails. It currently has Gemini 3 and 3.1 Pro variants — update descriptions if needed but models look correct.

The `GEMINI3_MODEL_PREFIXES` array controls which models get `temperature: 1.0` forced. Currently:
```typescript
const GEMINI3_MODEL_PREFIXES = [
  'gemini-3-pro', 'gemini-3-flash', 'gemini-3-pro-image', 'gemini-3.1-pro',
];
```
This looks correct — Gemini 3+ requires temperature 1.0 per Google's docs.

**`src/config/index.ts`**

Default models are hardcoded here:
```typescript
defaultModel: 'gemini-3.1-pro-preview',
defaultImageAnalysisModel: 'gemini-3.1-pro-preview',
defaultImageDescribeModel: 'gemini-3-flash-preview',
defaultImageGenerationModel: 'gemini-3-pro-image-preview',
```
These all look correct for February 2026.

### Tool descriptions in index.ts

The `model` parameter descriptions in `generate_image` and `edit_image` were updated this session. The `describe_image` and `analyze_image` tools still reference older model names in their descriptions — worth a pass when doing the model audit.

---

## Build process

```bash
cd C:\MCP\gemini-mcp

# Full build (server + UI)
npm run build

# Server only (faster for code changes)
npm run build:server

# Type check without emitting
npm run type-check
```

**Important:** Always `npm install --include=dev` after pulling or if types are missing. The package-lock has been caught in production-only mode before.

After any build, restart Claude Desktop to pick up changes.

Logs are at `C:\MCP\gemini-mcp\logs\combined.log` and `error.log`.

---

## Publishing

```bash
npm version patch        # bumps version, creates git tag
git push --follow-tags   # triggers GitHub Actions → npm publish
```

---

## Suggested work order

1. Verify `gemini-2.5-flash-preview-05-20` is still valid by testing it — if it 404s, remove it from both model arrays and replace with nothing (the `gemini-2.5-flash-image` stable alias covers this use case now)

2. Update tool description strings in `index.ts` for `describe_image` and `analyze_image` to reflect current model names

3. Update `README.md` supported models table — add `gemini-3.1-pro-preview` to the chat models section, verify image models table matches current constants

4. Evaluate whether `veo-3.1-generate-preview` (video) is worth a new tool — it needs a separate API implementation, not a model constant change

5. Bump to v1.4.7 and publish once the above is clean
