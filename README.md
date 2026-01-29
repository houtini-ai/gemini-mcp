# Gemini MCP Server

[![npm version](https://img.shields.io/npm/v/@houtini/gemini-mcp.svg?style=flat-square)](https://www.npmjs.com/package/@houtini/gemini-mcp)
[![Known Vulnerabilities](https://snyk.io/test/github/houtini-ai/gemini-mcp/badge.svg)](https://snyk.io/test/github/houtini-ai/gemini-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue?style=flat-square)](https://registry.modelcontextprotocol.io/servers/io.github.houtini/gemini)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green?style=flat-square)](https://modelcontextprotocol.io)

A production-ready Model Context Protocol server for Google's Gemini AI models. I've built this with TypeScript and the latest MCP SDK (1.25.3), focusing on real-world reliability rather than feature bloat.

## What This Does

This server connects Claude Desktop (or any MCP client) to Google's Gemini models. The integration is straightforward: chat with Gemini, get model information, and run deep research tasks with Google Search grounding built in.

What I think matters here: the server discovers available models automatically from Google's API, which means you're always working with the latest releases without updating configuration files. No hardcoded model lists that go stale.

## Quick Start

The simplest way to use this is with `npx` - no installation required:

```bash
# Get your API key from Google AI Studio first
# https://makersuite.google.com/app/apikey

# Test it works (optional)
npx @houtini/gemini-mcp

# Add to Claude Desktop (configuration below)
```

## Installation Options

### Recommended: npx (No Installation)

```bash
npx @houtini/gemini-mcp
```

This approach pulls the latest version automatically. I prefer this because you don't clutter your system with global packages, and updates happen transparently.

### Alternative: Global Installation

```bash
npm install -g @houtini/gemini-mcp
gemini-mcp
```

### Alternative: Local Project

```bash
npm install @houtini/gemini-mcp
npx @houtini/gemini-mcp
```

### From Source (Developers)

```bash
git clone https://github.com/houtini-ai/gemini-mcp.git
cd gemini-mcp
npm install
npm run build
npm start
```

## Configuration

### Step 1: Get Your API Key

Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to create a free API key. This takes about 30 seconds.

### Step 2: Configure Claude Desktop

Add this to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Using npx (Recommended)

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

#### Using Global Installation

```json
{
  "mcpServers": {
    "gemini": {
      "command": "gemini-mcp",
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Requires `npm install -g @houtini/gemini-mcp` first.

#### Using Local Build

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["./node_modules/@houtini/gemini-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Only works if installed locally in the current directory.

### Step 3: Restart Claude Desktop

After updating the config, restart Claude Desktop. The server loads on startup.

### Optional: Additional Configuration

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["@houtini/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "LOG_LEVEL": "info",
        "GEMINI_ALLOW_EXPERIMENTAL": "false"
      }
    }
  }
}
```

**Environment Variables:**

| Variable | Default | What It Does |
|----------|---------|--------------|
| `GEMINI_API_KEY` | *required* | Your Google AI Studio API key |
| `LOG_LEVEL` | `info` | Logging detail: `debug`, `info`, `warn`, `error` |
| `GEMINI_ALLOW_EXPERIMENTAL` | `false` | Include experimental models (set `true` to enable) |

## Dynamic Model Discovery

The server automatically discovers available Gemini models from Google's API on first use. This happens transparently - you don't need to configure anything.

### How It Works

1. Server starts instantly with reliable fallback models
2. First request triggers model discovery from Google's API (adds 1-2 seconds once)
3. Subsequent requests use the discovered models (no delay)
4. If discovery fails, fallback models work immediately

What I've found: this approach keeps you current with Google's releases whilst maintaining instant startup. The server filters to stable production models by default, which avoids experimental model rate limits.

### What Gets Discovered

- All available Gemini models (stable and experimental)
- Accurate context window sizes directly from Google
- Model capabilities and recommended use cases
- Latest releases as soon as Google makes them available

The default model selection prioritises: stable models over experimental, newest version available, Flash variants for speed, and capability matching for your request type.

### Performance Impact

- Startup: 0ms (instant)
- First request: +1-2 seconds (one-time discovery)
- Subsequent requests: 0ms overhead
- Discovery failure: 0ms (uses fallback immediately)

Check your logs after first request to see what was discovered:
```
Models discovered from API (count: 38, defaultModel: gemini-2.5-flash)
```

## Experimental Models

By default, the server uses stable production models. This ensures reliable performance and avoids Google's stricter rate limits on experimental releases.

### Stable vs Experimental

**Stable Models** (default behaviour):
- Production-ready
- Better rate limits
- Consistent performance
- Examples: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`

**Experimental Models** (opt-in):
- Latest features before stable release
- Stricter rate limits
- Potentially unexpected behaviour
- Can be deprecated quickly
- Examples: `gemini-exp-1206`, `gemini-2.0-flash-thinking-exp`

### Enabling Experimental Models

Set `GEMINI_ALLOW_EXPERIMENTAL=true` in your configuration:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["@houtini/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "GEMINI_ALLOW_EXPERIMENTAL": "true"
      }
    }
  }
}
```

This includes experimental models in discovery and makes them eligible as defaults. You can still explicitly request any model regardless of this setting - the flag only affects which models are used automatically.

### When to Enable

Keep experimental disabled if you need reliable, consistent performance or you're building production applications.

Enable experimental if you're testing cutting-edge features, doing research, or you understand the rate limit trade-offs.

## Usage Examples

### Basic Chat

```
Can you help me understand quantum computing using Gemini?
```

Claude automatically uses the `gemini_chat` tool.

### Creative Writing

```
Use Gemini to write a short story about artificial intelligence discovering creativity.
```

### Technical Analysis

```
Use Gemini Pro to explain the differences between various machine learning algorithms.
```

### Model Selection

```
Use Gemini 1.5 Pro to analyse this code and suggest improvements.
```

### Getting Model Information

```
Show me all available Gemini models and their capabilities.
```

---

## Complete Prompting Guide

Check the **[Comprehensive Prompting Guide](PROMPTING_GUIDE.md)** for:

- Advanced prompting techniques
- Model selection strategies
- Parameter tuning (temperature, tokens, system prompts)
- Using Google Search grounding
- Creative workflows and use cases
- Best practices
- Troubleshooting

**[Read the Prompting Guide](PROMPTING_GUIDE.md)**

---

## Google Search Grounding

Google Search grounding is built in and enabled by default. This gives Gemini models access to current web information, which significantly improves accuracy for questions requiring up-to-date data.

### What It Does

When you ask a question that benefits from current information:
1. Analyses your query to determine if web search helps
2. Generates relevant search queries automatically
3. Performs Google searches using targeted queries
4. Processes results and synthesises information
5. Provides enhanced response with inline citations
6. Shows search metadata including queries used

### Best Use Cases

**Current Events & News**
```
What are the latest developments in AI announced this month?
Recent breakthroughs in quantum computing research?
```

**Real-time Data**
```
Current stock prices for major tech companies
Today's weather forecast for London
```

**Recent Developments**
```
New software releases this week
Latest scientific discoveries in medicine
```

**Fact Checking**
```
Verify recent statements about climate change
Check the latest statistics on global internet usage
```

### Controlling Grounding

Grounding is enabled by default. Disable it for purely creative or hypothetical responses:

```
Use Gemini without web search to write a fictional story about dragons in space.
```

For API calls, use the `grounding` parameter:

```json
{
  "message": "Write a creative story about time travel",
  "grounding": false
}
```

### Understanding Grounded Responses

Grounded responses include source citations and search transparency:

```
Sources: (https://example.com/article1) (https://example.com/article2)
Search queries used: latest AI developments 2025, OpenAI GPT-5 release
```

What I've found: grounding dramatically reduces hallucinations for factual queries whilst maintaining creative flexibility when you need it.

## Deep Research

The server includes deep research capability that performs iterative multi-step research on complex topics. This synthesises comprehensive reports with proper citations.

### How It Works

Deep research conducts multiple research iterations:

1. Initial broad exploration
2. Gap analysis identifying what's missing
3. Targeted research into specific areas
4. Synthesis into comprehensive report
5. Iteration until thorough coverage

### Using Deep Research

```
Use Gemini deep research to investigate the impact of quantum computing on cybersecurity.
```

With parameters:
```
Use Gemini deep research with 7 iterations to create a comprehensive report on renewable energy trends, focusing on solar and wind power adoption rates.
```

### Research Parameters

| Parameter | Type | Default | What It Does |
|-----------|------|---------|--------------|
| `research_question` | string | *required* | The topic to investigate |
| `max_iterations` | integer | 5 | Research cycles (3-10) |
| `focus_areas` | array | - | Specific aspects to emphasise |
| `model` | string | *latest stable* | Which model to use |

### Best For

- Academic research and literature reviews
- Market analysis and competitive intelligence
- Technology trend analysis
- Policy research and impact assessments
- Multi-faceted business problems

### Configuring Iterations by Environment

Different AI environments have different timeout tolerances:

**Claude Desktop (3-5 iterations recommended)**
- Timeout: ~4 minutes
- Safe maximum: 5 iterations
- Use 3-4 for most tasks

**Agent SDK / IDEs (7-10 iterations recommended)**
- Timeout: 10+ minutes
- Maximum: 10 iterations
- Use 7-10 for comprehensive research

**AI Platforms like Cline, Roo-Cline (7-10 iterations)**
- Similar to Agent SDK
- Can handle longer processes

### Handling Timeouts

If you hit timeout or thread limits:

1. Reduce iterations (start with 3)
2. Narrow focus using `focus_areas` parameter
3. Split complex topics into smaller research tasks
4. Check which environment you're using

Example with focused research:
```
Use Gemini deep research with 3 iterations focusing on cost analysis and market adoption to examine solar panel technology trends.
```

Deep research takes several minutes. It's designed for comprehensive analysis rather than quick answers.

## API Reference

### gemini_chat

Chat with Gemini models.

**Parameters:**

| Parameter | Type | Required | Default | What It Does |
|-----------|------|----------|---------|--------------|
| `message` | string | Yes | - | The message to send |
| `model` | string | No | *Latest stable* | Which model to use |
| `temperature` | number | No | 0.7 | Randomness (0.0-1.0) |
| `max_tokens` | integer | No | 8192 | Maximum response length (1-32768) |
| `system_prompt` | string | No | - | System instruction |
| `grounding` | boolean | No | true | Enable Google Search |

**Example:**
```json
{
  "message": "What are the latest developments in quantum computing?",
  "model": "gemini-1.5-pro",
  "temperature": 0.5,
  "max_tokens": 1000,
  "system_prompt": "You are a technology expert. Provide current information with sources.",
  "grounding": true
}
```

### gemini_list_models

Retrieve information about discovered Gemini models.

**Parameters:** None required

**Example:**
```json
{}
```

**Response includes:**
- Model names and display names
- Descriptions of strengths
- Context window sizes from Google
- Recommended use cases

### gemini_deep_research

Conduct iterative multi-step research.

**Parameters:**

| Parameter | Type | Required | Default | What It Does |
|-----------|------|----------|---------|--------------|
| `research_question` | string | Yes | - | Topic to research |
| `max_iterations` | integer | No | 5 | Research cycles (3-10) |
| `focus_areas` | array | No | - | Specific areas to emphasise |
| `model` | string | No | *Latest stable* | Model to use |

**Example:**
```json
{
  "research_question": "Impact of AI on healthcare diagnostics",
  "max_iterations": 7,
  "focus_areas": ["accuracy improvements", "cost implications", "regulatory challenges"]
}
```

### Available Models

Models are dynamically discovered from Google's API. Typical available models:

| Model | Best For | Description |
|-------|----------|-------------|
| **gemini-2.5-flash** | General use | Latest Flash - fast, versatile |
| **gemini-2.5-pro** | Complex reasoning | Latest Pro - advanced capabilities |
| **gemini-2.0-flash** | Speed-optimised | Gemini 2.0 Flash - efficient |
| **gemini-1.5-flash** | Quick responses | Gemini 1.5 Flash - fast |
| **gemini-1.5-pro** | Large context | 2M token context window |

Use `gemini_list_models` to see exact available models with current context limits.

## Development

### Building from Source

```bash
git clone https://github.com/houtini-ai/gemini-mcp.git
cd gemini-mcp
npm install
npm run build
npm run dev
```

### Scripts

| Command | What It Does |
|---------|--------------|
| `npm run build` | Compile TypeScript |
| `npm run dev` | Development mode with live reload |
| `npm start` | Run compiled server |
| `npm test` | Run tests |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Fix linting issues |

### Project Structure

```
src/
├── config/           # Configuration management
├── services/         # Business logic
│   └── gemini/       # Gemini API integration
├── tools/            # MCP tool implementations
├── utils/            # Logger and error handling
├── cli.ts            # CLI entry
└── index.ts          # Main server
```

### Architecture

The server follows clean, layered architecture:

1. CLI Layer - Command-line interface
2. Server Layer - MCP protocol handling
3. Tools Layer - MCP tool implementations
4. Service Layer - Business logic and API integration
5. Utility Layer - Logging and error handling

## Troubleshooting

### "GEMINI_API_KEY environment variable not set"

Check your Claude Desktop configuration includes the API key in the `env` section.

### Server Not Appearing in Claude Desktop

1. Restart Claude Desktop after configuration changes
2. Verify config file path:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Validate JSON syntax
4. Test your API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

### "Module not found" with npx

```bash
# Clear npx cache
npx --yes @houtini/gemini-mcp

# Or install globally
npm install -g @houtini/gemini-mcp
```

### Node.js Version Issues

```bash
# Check version
node --version

# Should be v18.0.0 or higher
# Update from https://nodejs.org
```

### Debug Mode

Enable detailed logging:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["@houtini/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Log Files

Logs are written to:
- Console output (Claude Desktop developer tools)
- `logs/combined.log` - All levels
- `logs/error.log` - Errors only

### Testing Your Setup

Test with these queries:
1. "Can you list the available Gemini models?"
2. "Use Gemini to explain photosynthesis."
3. "Use Gemini 1.5 Pro with temperature 0.9 to write a creative poem about coding."

### Performance Tuning

For better performance:

- Adjust token limits based on your use case
- Use appropriate models (Flash for speed, Pro for complexity)
- Monitor logs for rate limiting issues
- Set temperature values appropriately (0.7 balanced, 0.3 focused, 0.9 creative)

## Contributing

Contributions welcome. Follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Lint: `npm run lint:fix`
6. Build: `npm run build`
7. Commit: `git commit -m 'Add amazing feature'`
8. Push: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation
- Use conventional commit messages
- Maintain backwards compatibility

## Technical Details

### Migration to MCP SDK 1.25.3

This server has been migrated to the latest MCP SDK (1.25.3) with ES modules support. Key technical changes:

**SDK Updates:**
- Migrated from `Server` class to `McpServer` API
- Tool registration uses `registerTool` with Zod validation
- ES modules throughout (`"type": "module"`)
- TypeScript configured for `nodenext` module resolution

**Compatibility:**
- Node.js 18+ (changed from 24+ for broader compatibility)
- All imports use `.js` extensions for ES module compliance
- Zod schemas for runtime type validation
- Modern MCP protocol implementation

**Build System:**
- TypeScript compiles to ES2022 modules
- Clean separation between business logic and MCP interface
- Preserved all Gemini API client functionality

What this means practically: the server now follows modern Node.js and MCP standards, which should prevent compatibility issues with future Claude Desktop updates whilst maintaining all existing functionality.

## Licence

This project is licensed under the Apache 2.0 Licence - see the [LICENSE](LICENSE) file for details.

## Disclaimer

**Use at Your Own Risk**: This software is provided "as is" without warranty. The authors accept no responsibility for damages, data loss, or other issues arising from use.

**Content Safety**: This server interfaces with Google's Gemini AI models. Whilst content safety settings are implemented, AI-generated content quality cannot be guaranteed. Users are responsible for reviewing AI output before use and ensuring compliance with applicable laws.

**API Key Security**: Your Google Gemini API key is sensitive. Keep it confidential, don't commit it to version control, rotate if exposed, and manage API usage costs.

**Data Privacy**: This server processes data through the Model Context Protocol. Avoid sending sensitive or confidential information. Review Google's privacy policy and implement appropriate data handling.

**Production Use**: Users deploying in production should conduct security audits, implement monitoring, have incident response procedures, and regularly update dependencies.

**Third-Party Services**: This software relies on external services (Google Gemini API, npm packages). Service availability, pricing, and functionality may change.

**No Professional Advice**: AI-generated content should not be considered professional advice (legal, medical, financial) without verification by qualified professionals.

By using this software, you acknowledge these terms and agree to use at your own risk.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/houtini-ai/gemini-mcp/issues)
- **GitHub Discussions**: [Ask questions or share ideas](https://github.com/houtini-ai/gemini-mcp/discussions)

## Changelog

### v1.3.2 - Node.js 18+ Compatibility & Modern SDK

**Breaking Changes:** None (all tool interfaces preserved)

**Technical Updates:**
- Updated to MCP SDK 1.25.3 (from 1.19.1)
- Migrated to ES modules (`"type": "module"`)
- Changed Node.js requirement to >=18.0.0 (from >=24.0.0) for broader compatibility
- Migrated from `Server` to `McpServer` API
- Implemented Zod schema validation for all tools
- Updated TypeScript config to `nodenext` module resolution

**Fixes:**
- Resolved Node.js v24 ERR_MODULE_NOT_FOUND errors
- Fixed TypeScript compilation with DOM types for fetch API
- All imports now use `.js` extensions for ES module compliance

**What This Means:**
The server now works reliably with Node.js 18, 20, 22, and 24. All existing functionality preserved - this is purely a technical infrastructure update for better compatibility.

### v1.1.0 - Deep Research & Enhanced Discovery

**New Features:**
- Added deep research capability for iterative analysis
- Enhanced model discovery with better filtering
- Improved default model selection logic
- Better handling of experimental vs stable models

### v1.0.4 - Security & Dependencies

**Updates:**
- Updated @google/generative-ai to v0.24.1
- Updated @modelcontextprotocol/sdk to v1.19.1
- Changed safety settings to BLOCK_MEDIUM_AND_ABOVE
- Added comprehensive disclaimer
- Zero vulnerabilities in dependencies

### v1.0.3 - Enhanced Grounding

**Improvements:**
- Fixed grounding metadata field names
- Enhanced source citation processing
- Improved grounding reliability
- Better error handling for grounding

### v1.0.2 - Google Search Grounding

**New Features:**
- Added Google Search grounding (enabled by default)
- Real-time web search integration
- Source citations in responses
- Configurable grounding parameter

### v1.0.0 - Initial Release

**Core Features:**
- Complete TypeScript rewrite
- Professional modular architecture
- Comprehensive error handling
- Full MCP protocol compliance
- Multiple Gemini model support
- NPM package distribution
- Production-ready build system

---

**Built for the Model Context Protocol community**

For more about MCP, visit [modelcontextprotocol.io](https://modelcontextprotocol.io)