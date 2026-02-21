# Changelog

All notable changes to @houtini/gemini-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-02-21

### Added
- **Search Grounding for Images**: `generate_image` and `edit_image` tools now support `use_search` parameter
  - Enables real-time data integration from Google Search before image generation
  - Perfect for weather forecasts, stock charts, news-driven visuals, sports scores
  - Response includes grounding sources as markdown links showing which websites informed the image
  - Grounding metadata extracted from API response: `groundingChunks`, `webSearchQueries`
  - Added to tool responses and logging for full transparency

- **Media Resolution Control**: Comprehensive token cost optimization across all image tools
  - `MEDIA_RESOLUTION_LOW` — 280 tokens per image (75% savings vs default)
  - `MEDIA_RESOLUTION_MEDIUM` — 560 tokens per image (50% savings vs default)
  - `MEDIA_RESOLUTION_HIGH` — 1120 tokens per image (default quality)
  - `MEDIA_RESOLUTION_ULTRA_HIGH` — 2000+ tokens per image (maximum detail, per-image only)
  - Global setting via `global_media_resolution` parameter (applies to all images)
  - Per-image override via `mediaResolution` in images array
  - Supported in: `generate_image`, `edit_image`, `describe_image`, `analyze_image`
  - OCR quality saturates at MEDIUM for PDFs — use MEDIUM for 50% cost reduction with zero quality loss

### Changed
- `GeminiImageResponse` interface expanded to include `groundingMetadata` structure
- `GeneratedImageResult` interface now includes optional `groundingSources` array
- Tool responses display grounding sources as numbered markdown links when available
- Structured content responses include `groundingSources` for UI integration

### Technical Details
- Grounding sources extracted from `groundingChunks.web.uri` and `groundingChunks.web.title`
- Media resolution passed to API via `generationConfig.mediaResolution` (global) and per-part `mediaResolution` (override)
- Full backward compatibility — both features are opt-in with sensible defaults
- No breaking changes to existing tool signatures or response formats

## [2.0.0] - 2026-02-22

### Breaking Changes
- **Thinking Level Enum Fixed**: `thinking_level` parameter now uses UPPERCASE values ('LOW', 'MEDIUM', 'HIGH', 'MINIMAL') to match Gemini API requirements
  - **Previous (broken)**: lowercase values ('low', 'medium', 'high', 'minimal') were rejected by API
  - **Now (working)**: UPPERCASE enum values as per official Gemini API specification
  - **Impact**: Any code explicitly passing `thinking_level` with lowercase values will break
  - **Migration**: Update all `thinking_level` calls to use UPPERCASE: `thinking_level: 'HIGH'` instead of `thinking_level: 'high'`

### Added
- **Thinking Level Exposed**: `gemini_chat` tool now exposes `thinking_level` parameter for Gemini 3 models
  - Controls reasoning depth: 'LOW' (minimal latency), 'MEDIUM'/'MINIMAL' (Gemini 3 Flash only), 'HIGH' (maximum reasoning)
  - Only affects Gemini 3+ models, ignored for earlier versions
  - Temperature automatically set to 1.0 for Gemini 3 models regardless of user input (API requirement)

### Fixed
- **Thinking levels now functional**: Previous implementation used incorrect lowercase enum, causing all thinking level requests to fail silently

## [1.5.0] - 2026-02-21

### Added
- **MCP Apps Support**: Proper inline image preview in Claude Desktop using `@modelcontextprotocol/ext-apps`
  - `generate_image` and `edit_image` now use `registerAppTool()` instead of standard `registerTool()`
  - Self-contained image viewer UI (no Vite build required - single HTML file with CDN imports)
  - Images display inline in chat with metadata (path, description, prompt)
  - Compressed JPEG previews (~150KB) sent to UI while full resolution saved to disk
  - Falls back gracefully for non-Apps MCP clients

### Changed
- **Updated SDK**: `@modelcontextprotocol/sdk` from ^1.25.3 to ^1.27.0 for latest MCP Apps support
- **Build simplified**: Removed Vite build step - image viewer is now single self-contained HTML file
- **Return format**: `generate_image` and `edit_image` now return `structuredContent` for UI preview plus `content` for LLM/fallback
- **Removed thoughtSignatures from response**: No longer returned to Claude to save tokens (850KB → 0KB), use file-based editing instead

### Fixed
- Async tool registration moved from constructor to `start()` method to support UI resource loading
- TypeScript compilation now includes DOM types for fetch API support

### Technical Details
- UI resource registered as `ui://gemini/image-viewer.html` with `RESOURCE_MIME_TYPE`
- Image viewer uses `@modelcontextprotocol/ext-apps` from esm.sh CDN (no build step)
- `_meta.ui.resourceUri` links tools to viewer component
- Full backward compatibility - works with and without MCP Apps support

## [1.4.6] - 2026-02-20

### Fixed
- **`describe_image` bug**: Tool was validating models against the image generation allowlist (`IMAGE_GENERATION_MODELS`) rather than the broader vision allowlist. This caused all `describe_image` calls without an explicit model to throw immediately, since the default describe model (`gemini-3-flash-preview`) wasn't in the generation list. Introduced separate `IMAGE_GENERATION_MODELS` and `IMAGE_VISION_MODELS` constants and updated `validateModel()` to use the correct list per operation type.

### Changed
- **`image-service.ts`**: Expanded `IMAGE_MODELS` to include all models valid for generation or vision tasks — `gemini-3-flash-preview`, `gemini-3-pro-preview`, `gemini-3.1-pro-preview`, plus the existing generation models. The combined `IMAGE_MODELS` export is retained for backwards compatibility.
- **`gemini/index.ts`**: Removed duplicate `isGemini3Model` function and `GEMINI3_PREFIXES` constant. Both were identical to the existing `isGemini3` / `GEMINI3_MODEL_PREFIXES` declarations. Dead code.

### Documentation
- **README rewritten**: Complete overhaul — now covers all 9 tools with working examples, full environment variable table (including `GEMINI_IMAGE_OUTPUT_DIR`, `GEMINI_ALLOW_EXPERIMENTAL`, `DEBUG_MCP`, `GEMINI_MCP_LOG_FILE`), thought signature workflow for conversational image editing, and Claude Desktop timeout guidance for deep research.

## [1.4.5] - Previous release

## [1.4.3] - 2025-01-29

### Fixed
- **Logger Path Issue (#1)**: Fixed ENOENT error when running via npx on macOS/Unix systems
  - File logging now disabled by default to avoid directory permission issues
  - Logs only created when explicitly enabled via `GEMINI_MCP_LOG_FILE=true` environment variable
  - When enabled, logs are written to user home directory (`~/.gemini-mcp/logs/` on Unix, `C:\Users\username\.gemini-mcp\logs\` on Windows)
  - Console logging (stderr) only enabled in development mode or when `DEBUG_MCP=true`
  - Fallback to minimal error logging if directory creation fails
  - Cross-platform compatible with proper path handling for Windows, macOS, and Linux

### Changed
- Logging behaviour is now opt-in rather than default-on
- All console output goes to stderr to avoid corrupting MCP stdio communication
- Log directory uses user home directory for better cross-platform compatibility

### Added
- New environment variable: `GEMINI_MCP_LOG_FILE` (default: false) - Enable file logging
- New environment variable: `DEBUG_MCP` (default: false) - Enable console debugging
- Comprehensive logging documentation in README.md
- Graceful fallback when log directory creation fails

### Technical Details
- Logger now uses `os.homedir()` and `path.join()` for cross-platform paths
- Recursive directory creation with proper error handling
- Log files: 5MB max size, 5 files retained (rotating logs)
- No breaking changes — all existing configurations continue to work

### Thanks
- @mattjohnsonpint for reporting the macOS logger path issue