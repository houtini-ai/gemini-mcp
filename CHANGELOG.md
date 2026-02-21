# Changelog

All notable changes to @houtini/gemini-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-02-21

### Added
- **Video generation** (`generate_video` tool) using Google Veo 3.1
  - Creates 4-8 second videos from text prompts
  - Async job-based workflow with automatic polling (2-5 minutes)
  - Support for 720p, 1080p, and 4K resolutions
  - Native audio generation synchronized with video (automatic based on prompt)
  - Optional first-frame image and reference images for character/style consistency
  - Automatic thumbnail extraction (requires ffmpeg)
  - Interactive HTML video player generation
  - **Inline video viewer** - Videos display directly in Claude Desktop
  - Multiple aspect ratios: 16:9 (landscape) and 9:16 (portrait)
- **Video viewer UI** - Built-in video player with inline preview in Claude Desktop
- **SVG viewer UI** - Inline SVG preview and rendering in Claude Desktop
- **Help system** (`gemini_help` tool) with comprehensive documentation for all features
  - Topics: overview, image_generation, image_editing, image_analysis, chat, deep_research, grounding, media_resolution, models, all
  - Accessible without leaving Claude Desktop
- **Professional chart design systems** (9 systems) in `gemini_prompt_assistant`
  - Storytelling (Cole Nussbaumer Knaflic) - Strategic highlighting
  - Financial (Financial Times) - FT Pink editorial elegance
  - Terminal (Bloomberg/Fintech) - High-density electric neon on black
  - Modernist (W.E.B. Du Bois) - Bold geometric blocks
  - Professional (IBM Carbon/Tailwind) - Enterprise UI
  - Editorial (FiveThirtyEight/Economist) - Data journalism
  - Scientific (Nature/Science) - Academic rigor
  - Minimal (Edward Tufte) - Maximum data-ink ratio
  - Dark (Observable) - Modern dark mode
- Complete colour palettes, typography specs, and design rules for each system
- Enhanced `gemini_prompt_assistant` with design system templates

### Changed
- **Image quality improvements**: Quality 100 @ 1024px (was quality 60 @ 512px)
  - Dramatically better text readability in technical diagrams
  - Professional-grade output quality
  - No visible JPEG compression artifacts
- **Default model upgrades**:
  - `gemini_chat`: Now defaults to `gemini-3.1-pro-preview` (was gemini-3-flash-preview)
  - `analyze_image`: Now defaults to `gemini-3.1-pro-preview` (was gemini-3-flash-preview)
  - Noticeable quality improvements in reasoning and analysis
- **Grounding source display**: Sources now formatted as markdown links in responses
- Updated README with comprehensive feature documentation

### Fixed
- Grounding sources properly extracted and displayed for financial and news queries
- Image preview quality issues resolved
- Video tool registration uses correct MCP SDK patterns (removed deprecated setRequestHandler)
- TypeScript compilation errors in video service configuration
- **Video generation API compatibility**: Removed `generateAudio` parameter from Veo 3.1 API requests
  - Veo 3.1 generates audio natively based on prompt content (no toggle needed)
  - Tool parameter `generateAudio` now controls audio via negative prompting when set to `false`
  - Fixes 400 "isn't supported by this model" errors from Gemini API

### Documentation
- Complete README.md rewrite with all v2.2.0 features
- Added chart design system quick reference
- Added search grounding coverage table
- Documented weather grounding limitation (API-level, not code issue)
- Created comprehensive test results (TEST_RESULTS_v2.1.1.md)

## [2.1.0] - 2025-02-20

### Added
- **Help system** (`gemini_help` tool) with comprehensive documentation for all features
  - Topics: overview, image_generation, image_editing, image_analysis, chat, deep_research, grounding, media_resolution, models, all
  - Accessible without leaving Claude Desktop
- **Professional chart design systems** (9 systems) in `gemini_prompt_assistant`
  - Storytelling (Cole Nussbaumer Knaflic) - Strategic highlighting
  - Financial (Financial Times) - FT Pink editorial elegance
  - Terminal (Bloomberg/Fintech) - High-density electric neon on black
  - Modernist (W.E.B. Du Bois) - Bold geometric blocks
  - Professional (IBM Carbon/Tailwind) - Enterprise UI
  - Editorial (FiveThirtyEight/Economist) - Data journalism
  - Scientific (Nature/Science) - Academic rigor
  - Minimal (Edward Tufte) - Maximum data-ink ratio
  - Dark (Observable) - Modern dark mode
- Complete colour palettes, typography specs, and design rules for each system
- Enhanced `gemini_prompt_assistant` with design system templates

### Changed
- **Image quality improvements**: Quality 100 @ 1024px (was quality 60 @ 512px)
  - Dramatically better text readability in technical diagrams
  - Professional-grade output quality
  - No visible JPEG compression artifacts
- **Default model upgrades**:
  - `gemini_chat`: Now defaults to `gemini-3.1-pro-preview` (was gemini-3-flash-preview)
  - `analyze_image`: Now defaults to `gemini-3.1-pro-preview` (was gemini-3-flash-preview)
  - Noticeable quality improvements in reasoning and analysis
- **Grounding source display**: Sources now formatted as markdown links in responses
- Updated README with comprehensive feature documentation

### Fixed
- Grounding sources properly extracted and displayed for financial and news queries
- Image preview quality issues resolved

### Documentation
- Complete README.md rewrite with all v2.2.0 features
- Added chart design system quick reference
- Added search grounding coverage table
- Documented weather grounding limitation (API-level, not code issue)
- Created comprehensive test results (TEST_RESULTS_v2.1.1.md)

## [2.1.0] - 2025-02-20

### Added
- **Search grounding for image generation** (`use_search` parameter)
  - Real-time data integration in generated images
  - Grounding sources returned as metadata
  - Perfect for weather, stocks, news-driven infographics
- **Media resolution control** for cost optimization
  - `MEDIA_RESOLUTION_LOW` - 280 tokens (75% savings)
  - `MEDIA_RESOLUTION_MEDIUM` - 560 tokens (50% savings)
  - `MEDIA_RESOLUTION_HIGH` - 1120 tokens (default)
  - `MEDIA_RESOLUTION_ULTRA_HIGH` - 2000+ tokens (max detail)
  - Global and per-image resolution settings
- **Thought signatures** for conversational image editing
  - Maintained across editing turns for visual continuity
  - Automatic capture and return in responses
- Multiple image model support
  - `gemini-3-pro-image-preview` (Nano Banana Pro)
  - `gemini-2.5-flash-image` (faster generation)
  - `gemini-3-flash-preview` (descriptions)
  - `gemini-3.1-pro-preview` (detailed analysis)

### Changed
- Image service refactored with separate generation/vision model handling
- Enhanced error handling for image operations
- Improved media resolution documentation

## [2.0.0] - 2025-01-15

### Added
- Initial public release
- `gemini_chat` - Chat with Google Search grounding
- `gemini_deep_research` - Multi-step iterative research
- `generate_image` - Image generation via Gemini
- `edit_image` - Natural language image editing
- `describe_image` - Image description and analysis
- `analyze_image` - Structured image information extraction
- `load_image_from_path` - Local image file loading
- `generate_landing_page` - Self-contained HTML generation
- `gemini_list_models` - Available model listing
- Configurable output directories for generated images
- Thinking level support for Gemini 3 models
- MCP Apps integration with inline image previews

### Configuration
- `GEMINI_API_KEY` - Required API key
- `GEMINI_DEFAULT_MODEL` - Model selection
- `GEMINI_DEFAULT_GROUNDING` - Grounding preference
- `GEMINI_IMAGE_OUTPUT_DIR` - Image save location
- `GEMINI_ALLOW_EXPERIMENTAL` - Experimental model access
- `DEBUG_MCP` - Debug logging

---

## Version History Summary

- **v2.2.0** - Help system, quality improvements, chart design systems, default model upgrades
- **v2.1.0** - Search grounding, media resolution, thought signatures, multi-model
- **v2.0.0** - Initial release with core features