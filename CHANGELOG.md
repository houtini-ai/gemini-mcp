# Changelog

All notable changes to @houtini/gemini-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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