# Gemini MCP Server

[![npm version](https://img.shields.io/npm/v/@houtini/gemini-mcp.svg)](https://www.npmjs.com/package/@houtini/gemini-mcp)
[![npm downloads](https://img.shields.io/npm/dt/@houtini/gemini-mcp.svg)](https://www.npmjs.com/package/@houtini/gemini-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)

A professional, production-ready Model Context Protocol (MCP) server that provides seamless integration with Google's Gemini AI models. Built with TypeScript and designed for enterprise use, this package offers robust error handling, comprehensive logging, and easy deployment.

## Quick Start

The easiest way to get started is using `npx` - no installation required:

```bash
# Get your API key from Google AI Studio
# https://makersuite.google.com/app/apikey

# Test the server (optional)
npx @houtini/gemini-mcp

# Add to Claude Desktop (see configuration below)
```

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Dynamic Model Discovery](#dynamic-model-discovery)
- [Experimental Models](#experimental-models)
- [Usage Examples](#usage-examples)
- [Prompting Guide](PROMPTING_GUIDE.md)
- [Google Search Grounding](#google-search-grounding)
- [Deep Research](#deep-research)
- [API Reference](#api-reference)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

### Core Functionality
- **Dynamic Model Discovery** - Automatically discovers and uses the latest Gemini models (transparent, zero configuration)
- **Chat Interface** - Advanced chat functionality with customisable parameters
- **Google Search Grounding** - Real-time web search integration enabled by default for current information
- **Deep Research** - Iterative multi-step research with comprehensive synthesis
- **Model Information** - Detailed model capabilities with accurate context window sizes directly from Google
- **Fine-Grained Control** - Temperature, token limits, and system prompts

### Enterprise Features
- **Professional Architecture** - Modular services-based design
- **Robust Error Handling** - Comprehensive error handling with detailed logging
- **Winston Logging** - Production-ready logging with file rotation
- **Security Focused** - No hardcoded credentials, environment-based configuration
- **Full TypeScript** - Complete type safety and IntelliSense support
- **High Performance** - Optimised for minimal latency and resource usage
- **Graceful Fallback** - Automatic fallback to proven models if discovery fails

## Installation

### Prerequisites

- **Node.js** v24.0.0 or higher
- **Google AI Studio API Key** ([Get your key here](https://makersuite.google.com/app/apikey))

### Recommended: No Installation Required

The simplest approach uses `npx` to run the latest version automatically:

```bash
# No installation needed - npx handles everything
npx @houtini/gemini-mcp
```

### Alternative Installation Methods

#### Global Installation
```bash
# Install once, use anywhere
npm install -g @houtini/gemini-mcp
gemini-mcp
```

#### Local Project Installation
```bash
# Install in your project
npm install @houtini/gemini-mcp

# Run with npx
npx @houtini/gemini-mcp
```

#### From Source (Developers)
```bash
git clone https://github.com/houtini-ai/gemini-mcp.git
cd gemini-mcp
npm install
npm run build
npm start
```

## Configuration

### Step 1: Get Your API Key

Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to create your free API key.

### Step 2: Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Recommended Configuration (using npx)

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

**Benefits of this approach:**
- No global installation required
- Always uses the latest version
- Cleaner system (no global packages)
- Works out of the box

#### Alternative: Global Installation

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

*Note: Requires `npm install -g @houtini/gemini-mcp` first*

#### Alternative: Local Installation

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

*Note: Only works if installed locally in the current directory*

### Step 3: Restart Claude Desktop

After updating the configuration file, restart Claude Desktop to load the new MCP server.

### Optional Configuration

You can add additional environment variables for more control:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["@houtini/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Available Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | *required* | Your Google AI Studio API key |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `GEMINI_ALLOW_EXPERIMENTAL` | `false` | Allow experimental/preview models as defaults (set to `true` to enable) |

## Dynamic Model Discovery

This server features **intelligent, transparent model discovery** that automatically keeps you up to date with the latest Gemini models—without any configuration needed.

### How It Works

The server uses **lazy initialisation** to discover models on your first request:

1. **Server Starts** - Instant startup with proven fallback models
2. **First Request** - Automatically queries Google's API for latest models
3. **Discovery Completes** - Updates to use the newest available models
4. **Subsequent Requests** - Use the discovered models (no delay)
5. **Graceful Fallback** - If API discovery fails, continues with reliable fallback models

### Key Benefits

- **Zero Configuration** - Works automatically, no setup required  
- **Always Current** - New models available as soon as Google releases them  
- **Transparent** - You don't need to know it exists  
- **Instant Startup** - No delay in server initialisation  
- **Smart Selection** - Automatically chooses the best default model  
- **Fail-Safe** - Gracefully handles API failures  

### What Models Are Discovered?

The system discovers all available Gemini models including:
- Latest stable releases
- Context window sizes - Accurate limits directly from Google
- Model capabilities - What each model supports
- Specialised models - Vision, audio, and other variants

By default, the server **filters to stable production models only**, ensuring reliable performance and avoiding quota limits on experimental models.

### Default Model Selection

The server intelligently selects the default model using these priorities:

1. **Stable models only** (filters out experimental/preview by default)
2. **Newest version** (2.5 > 2.0 > 1.5)
3. **Flash preference** (faster models prioritised)
4. **Capability matching** (must support text generation)

**Current expected default**: Latest stable Flash model (typically `gemini-2.5-flash`)

### Performance Impact

- **Startup Time**: 0ms - Server starts instantly
- **First Request**: +1-2 seconds (one-time model discovery)
- **Subsequent Requests**: 0ms overhead
- **Discovery Failure**: 0ms - Uses fallback models immediately

### For Advanced Users

If you want to see which models were discovered, check the server logs after your first request:

```
Models discovered from API (count: 38, defaultModel: gemini-2.5-flash)
```

## Experimental Models

By default, the server uses **stable production models** to ensure reliable performance and avoid rate limiting issues. However, you can optionally enable experimental and preview models if you want access to cutting-edge features.

### Stable vs Experimental Models

**Stable Models** (default):
- Production-ready and reliable
- Better rate limits and quotas
- Consistent performance
- Fully tested and supported
- Examples: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`

**Experimental Models** (opt-in):
- Latest features and capabilities
- Stricter rate limits
- May have unexpected behaviour
- Can be deprecated quickly
- Examples: `gemini-exp-1206`, `gemini-2.0-flash-thinking-exp`, preview releases

### Enabling Experimental Models

To include experimental and preview models in discovery and selection:

**In Claude Desktop Config:**
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

**Using .env file:**
```env
GEMINI_API_KEY=your-api-key-here
GEMINI_ALLOW_EXPERIMENTAL=true
```

### What Changes When Enabled?

With `GEMINI_ALLOW_EXPERIMENTAL=true`:
- Experimental models become available for selection
- Experimental models can be chosen as the default
- Preview and thinking models are included in model lists
- You gain access to latest features before stable release

**Note**: You can always explicitly specify any model (experimental or stable) in your requests, regardless of this setting. This flag only affects which models are used as defaults.

### Recommended Use Cases

**Keep Experimental Disabled (default) if:**
- You need reliable, consistent performance
- You're building production applications
- You want to avoid rate limit issues
- You prefer tested, stable features

**Enable Experimental if:**
- You want to test cutting-edge features
- You're doing research or experimentation
- You understand the trade-offs
- You can handle potential rate limits

### Using .env File (Development)

For development or testing, create a `.env` file:

```env
# Google Gemini Configuration
GEMINI_API_KEY=your-api-key-here

# Optional: Enable experimental models
GEMINI_ALLOW_EXPERIMENTAL=false

# Logging Configuration (optional)
LOG_LEVEL=info
```

## Usage Examples

### Basic Chat

Ask Claude to use Gemini:

```
Can you help me understand quantum computing using Gemini?
```

Claude will automatically use the `gemini_chat` tool to get a response from Gemini.

### Creative Writing

```
Use Gemini to write a short story about artificial intelligence discovering creativity.
```

### Technical Analysis

```
Can you use Gemini Pro to explain the differences between various machine learning algorithms?
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

Want to get the most out of Gemini MCP? Check out our **[Comprehensive Prompting Guide](PROMPTING_GUIDE.md)** for:

- Advanced prompting techniques
- Model selection strategies  
- Parameter tuning (temperature, tokens, system prompts)
- Leveraging Google Search grounding
- Creative workflows and use cases
- Best practices and tips
- Troubleshooting common issues

**[Read the Prompting Guide](PROMPTING_GUIDE.md)**

---

## Google Search Grounding

This server includes **Google Search grounding** functionality powered by Google's real-time web search, providing Gemini models with access to current web information. This feature is **enabled by default** and significantly enhances response accuracy for questions requiring up-to-date information.

### Key Benefits

- **Real-time Information** - Access to current news, events, stock prices, weather, and developments
- **Factual Accuracy** - Reduces AI hallucinations by grounding responses in verified web sources
- **Source Citations** - Automatic citation of sources with search queries used
- **Seamless Integration** - Works transparently without changing your existing workflow
- **Smart Search** - AI automatically determines when to search based on query content

### How Google Search Grounding Works

When you ask a question that benefits from current information, the system:

1. **Analyses your query** to determine if web search would improve the answer
2. **Generates relevant search queries** automatically based on your question  
3. **Performs Google searches** using multiple targeted queries
4. **Processes search results** and synthesises information from multiple sources
5. **Provides enhanced response** with inline citations and source links
6. **Shows search metadata** including the actual queries used for transparency

### Perfect For These Use Cases

**Current Events & News**
```
What are the latest developments in AI announced this month?
What's happening with the 2025 climate negotiations?
Recent breakthroughs in quantum computing research?
```

**Real-time Data**
```
Current stock prices for major tech companies
Today's weather forecast for London
Latest cryptocurrency market trends
```

**Recent Developments**
```
New software releases and updates this week
Recent scientific discoveries in medicine
Latest policy changes in renewable energy
```

**Fact Checking & Verification**
```
Verify recent statements about climate change
Check the latest statistics on global internet usage
Confirm recent merger and acquisition announcements
```

### Controlling Grounding Behaviour

**Default Behaviour**: Grounding is **enabled by default** for optimal results and accuracy.

**Disable for Creative Tasks**: When you want purely creative or hypothetical responses:
```
Use Gemini without web search to write a fictional story about dragons in space.
Write a creative poem about imaginary colours that don't exist.
```

**Technical Control**: When using the API directly, use the `grounding` parameter:

```json
{
  "message": "Write a creative story about time travel",
  "model": "gemini-2.5-flash",
  "grounding": false
}
```

```json
{
  "message": "What are the latest developments in renewable energy?",
  "model": "gemini-2.5-flash", 
  "grounding": true
}
```

### Understanding Grounded Responses

When grounding is active, responses include:

**Source Citations**: Links to the websites used for information
```
Sources: (https://example.com/article1) (https://example.com/article2)
```

**Search Transparency**: The actual search queries used
```
Search queries used: latest AI developments 2025, OpenAI GPT-5 release, Google Gemini updates
```

**Enhanced Accuracy**: Information synthesis from multiple authoritative sources rather than relying solely on training data

## Deep Research

The server includes a powerful **deep research** capability that performs iterative multi-step research on complex topics, synthesising comprehensive reports with proper source citations.

### How Deep Research Works

Deep research conducts multiple research iterations, each building on previous findings:

1. **Initial Research** - Broad exploration of the topic
2. **Gap Analysis** - Identifies what hasn't been covered
3. **Targeted Research** - Digs deeper into specific areas
4. **Synthesis** - Creates comprehensive report with citations
5. **Iteration** - Repeats until thorough coverage achieved

### Using Deep Research

```
Use Gemini deep research to investigate the impact of quantum computing on cybersecurity.
```

You can specify research parameters:
```
Use Gemini deep research with 7 iterations to create a comprehensive report on renewable energy trends, focusing on solar and wind power adoption rates.
```

### Research Parameters

- **max_iterations**: Number of research cycles (3-10, default 5)
- **focus_areas**: Specific aspects to emphasise
- **model**: Which Gemini model to use (defaults to latest stable)

### Best For

- Academic research and literature reviews
- Market analysis and competitive intelligence
- Technology trend analysis
- Policy research and impact assessments
- Multi-faceted business problems

### Configuring max_iterations for Different Environments

The `max_iterations` parameter controls how many research cycles are performed. Different AI environments have varying timeout tolerances, so it's important to configure appropriately:

**Claude Desktop (Recommended: 3-5 iterations)**
- **Timeout**: Approximately 4 minutes
- **Recommended Setting**: Use 3-4 iterations for most research tasks
- **Maximum Safe**: 5 iterations
- **Why**: Claude Desktop has a stricter timeout to ensure responsive UI

Example:
```
Use Gemini deep research with 3 iterations to analyse competitive landscape in renewable energy storage.
```

**Agent SDK / IDEs (VSCode, Cursor, Windsurf) (Recommended: 7-10 iterations)**
- **Timeout**: Much longer (typically 10+ minutes)
- **Recommended Setting**: Use 7-10 iterations for comprehensive research
- **Maximum**: 10 iterations
- **Why**: These environments have more generous timeouts and can handle longer-running processes

Example:
```
Use Gemini deep research with 8 iterations to create a comprehensive market analysis of AI chips in datacenter applications.
```

**AI Platforms (Cline, Roo-Cline) (Recommended: 7-10 iterations)**
- **Timeout**: Similar to Agent SDK environments
- **Recommended Setting**: Use 7-10 iterations
- **Maximum**: 10 iterations

**If You Hit Context/Thread Limits**

If you encounter timeout errors or thread limits:

1. **Reduce iterations**: Start with 3 iterations and gradually increase
2. **Narrow focus**: Use the `focus_areas` parameter to be more specific
3. **Split research**: Break complex topics into multiple smaller research tasks
4. **Check environment**: Verify which environment you're using and adjust accordingly

Example with focused research:
```
Use Gemini deep research with 3 iterations focusing on cost analysis and market adoption to examine solar panel technology trends.
```

**Note**: The server automatically manages context efficiently, so Claude Desktop users are unlikely to hit thread limits with recommended iteration counts. However, if you do encounter issues, simply reduce `max_iterations` to 3 or 4.

**Note**: Deep research takes several minutes as it performs multiple iterations. Perfect for when you need comprehensive, well-researched analysis rather than quick answers.

## Video Description for Accessibility

The server includes a specialized **video description tool** designed to generate detailed audio descriptions of YouTube video content for accessibility purposes. This tool analyzes visual content including actions, spatial relationships, text overlays, and provides time-stamped descriptions suitable for screen reader users.

### How Video Description Works

The tool uses Gemini's multimodal understanding capabilities to:

1. **Analyze Visual Content** - Processes the video frame by frame to understand what's happening
2. **Describe Actions** - Details all movements, gestures, and procedures shown
3. **Spatial Awareness** - Describes positions, movements, and relationships between elements
4. **Text Recognition** - Transcribes all on-screen text, captions, and overlays verbatim
5. **Structured Output** - Organizes information in screen reader-friendly formats

### Using Video Description

**Basic Usage:**
```
Describe this YouTube video for accessibility: https://www.youtube.com/watch?v=abc123
```

**With Specific Detail Level:**
```
Generate a comprehensive accessibility description for this video: https://www.youtube.com/watch?v=abc123
```

**Focus on Specific Aspects:**
```
Describe the actions shown in this instructional video: https://www.youtube.com/watch?v=abc123
```

### Description Parameters

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| `detail_level` | `brief`, `standard`, `comprehensive` | `standard` | Controls description depth |
| `accessibility_mode` | `true`, `false` | `true` | Includes spatial, color, and text details |
| `include_timestamps` | `true`, `false` | `true` | Adds timestamps to descriptions |
| `output_format` | `narrative`, `structured` | `structured` | Output as prose or JSON |
| `focus` | `actions`, `visual_elements`, `text_on_screen`, `all` | `all` | What to emphasize |

### Detail Levels Explained

**Brief** (2-3 paragraphs)
- High-level summary of video content
- Main actions and key points only
- Perfect for quick overview

**Standard** (5-8 scenes)
- Balanced description with key scenes
- Major actions and visual elements
- Recommended for most use cases

**Comprehensive** (10-15+ scenes)
- Extensive detail for every significant moment
- Complete coverage of all visual information
- Best for instructional or technical content

### Accessibility Mode Features

When enabled (default), includes:

- **Spatial Descriptions**: "on the left side of frame", "moving from right to left"
- **Color Information**: "red laser line", "blue indicator light"
- **Text Transcription**: All on-screen text verbatim
- **Facial Expressions**: When relevant to understanding
- **Sound Cues**: Visible audio indicators
- **Concrete Language**: Avoids vague references like "this" or "here"

### Output Formats

**Structured JSON** (default):
```json
{
  "video_title": "How to Install Picture Mounts",
  "duration": "4:32",
  "scene_count": 8,
  "scenes": [
    {
      "timestamp": "0:00-0:45",
      "description": "Close-up of hands positioning metal cleat on frame back",
      "actions": ["Marking screw holes", "Using pencil"],
      "tools_visible": ["Metal cleat", "Pencil"],
      "text_on_screen": null,
      "spatial_notes": "Cleat positioned horizontally on upper portion of frame",
      "colors": "Silver metal cleat against dark wood frame"
    }
  ],
  "key_techniques": ["Using laser level", "Locating wall studs"],
  "tools_list": ["Drill", "Laser level", "Stud finder"],
  "summary": "Demonstrates professional picture hanging using interlocking cleats"
}
```

**Narrative Prose**:
```
[0:00] The video opens with a close-up view of hands positioning a silver metal 
cleat horizontally on the back of a dark wooden picture frame...
```

### Perfect For

**Accessibility Needs**:
- Screen reader users
- Visually impaired individuals
- Audio description requirements
- WCAG compliance

**Content Analysis**:
- Tutorial documentation
- Training material transcription
- Video content indexing
- Instructional content breakdown

**Research & Education**:
- Video content study
- Procedural analysis
- Teaching material preparation

### Best Practices

1. **Choose appropriate detail level** - Brief for overviews, comprehensive for tutorials
2. **Enable accessibility mode** - Always on for screen reader users
3. **Use structured format** - Better for navigation with assistive technology
4. **Include timestamps** - Essential for sync with video playback
5. **Focus parameter** - Use when specific aspects are most important

### Technical Requirements

- **Supported Platforms**: YouTube videos only
- **Model Used**: Gemini 2.5 Flash (optimized for video understanding)
- **Response Time**: 30-60 seconds depending on detail level
- **Token Usage**: 8,000-16,000 tokens for comprehensive descriptions

### Example Use Cases

**Tutorial Documentation**:
```
Generate a comprehensive accessibility description focusing on actions for this DIY tutorial: 
https://www.youtube.com/watch?v=example
```

**Content Indexing**:
```
Create a brief structured description of this product demo: 
https://www.youtube.com/watch?v=example
```

**Training Materials**:
```
Describe the visual elements and text shown in this training video: 
https://www.youtube.com/watch?v=example
```

## API Reference

### Available Tools

#### `gemini_chat`

Chat with Gemini models to generate text responses.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `message` | string | Yes | - | The message to send to Gemini |
| `model` | string | No | *Latest stable* | Model to use (dynamically selected) |
| `temperature` | number | No | 0.7 | Controls randomness (0.0-1.0) |
| `max_tokens` | integer | No | 4096 | Maximum tokens in response (1-16384) |
| `system_prompt` | string | No | - | System instruction to guide the model |
| `grounding` | boolean | No | true | Enable Google Search grounding for real-time information |

**Example:**
```json
{
  "message": "What are the latest developments in quantum computing?",
  "model": "gemini-1.5-pro", 
  "temperature": 0.5,
  "max_tokens": 1000,
  "system_prompt": "You are a helpful technology expert. Provide current, factual information with sources where possible.",
  "grounding": true
}
```

#### `gemini_list_models`

Retrieve information about all discovered Gemini models.

**Parameters:** None required

**Example:**
```json
{}
```

**Response includes:**
- Model names and display names
- Descriptions of each model's strengths
- Context window sizes (directly from Google)
- Recommended use cases

#### `gemini_deep_research`

Conduct iterative multi-step research on complex topics.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `research_question` | string | Yes | - | The topic or question to research |
| `max_iterations` | integer | No | 5 | Number of research cycles (3-10) |
| `focus_areas` | array | No | - | Specific aspects to emphasise |
| `model` | string | No | *Latest stable* | Model to use for research |

**Example:**
```json
{
  "research_question": "Impact of AI on healthcare diagnostics",
  "max_iterations": 7,
  "focus_areas": ["accuracy improvements", "cost implications", "regulatory challenges"]
}
```

#### `gemini_describe_video`

Generate detailed audio descriptions of YouTube video content for accessibility.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | - | YouTube URL to analyze |
| `detail_level` | string | No | `standard` | Level of detail: `brief`, `standard`, `comprehensive` |
| `accessibility_mode` | boolean | No | `true` | Include spatial descriptions, colors, text overlays |
| `include_timestamps` | boolean | No | `true` | Add timestamps for all major actions |
| `output_format` | string | No | `structured` | Format: `narrative` (prose) or `structured` (JSON) |
| `focus` | string | No | `all` | Focus: `actions`, `visual_elements`, `text_on_screen`, `all` |

**Example:**
```json
{
  "url": "https://www.youtube.com/watch?v=abc123",
  "detail_level": "comprehensive",
  "accessibility_mode": true,
  "include_timestamps": true,
  "output_format": "structured",
  "focus": "all"
}
```

**Response Format (Structured)**:
```json
{
  "video_title": "How to Install Picture Mounts",
  "duration": "4:32",
  "scene_count": 8,
  "scenes": [
    {
      "timestamp": "0:00-0:45",
      "description": "Detailed scene description",
      "actions": ["action1", "action2"],
      "tools_visible": ["tool1", "tool2"],
      "text_on_screen": "Exact text or null",
      "spatial_notes": "Spatial relationships",
      "colors": "Color descriptions"
    }
  ],
  "key_techniques": ["technique1", "technique2"],
  "tools_list": ["all tools shown"],
  "materials_list": ["all materials"],
  "safety_notes": ["safety considerations"],
  "summary": "Overall summary"
}
```

### Available Models

Models are **dynamically discovered** from Google's API. The exact list may vary, but typically includes:

| Model Pattern | Best For | Description |
|---------------|----------|-------------|
| **gemini-2.5-flash** | General use, latest features | Latest Gemini 2.5 Flash - Fast, versatile performance |
| **gemini-2.5-pro** | Complex reasoning | Latest Gemini 2.5 Pro - Advanced reasoning capabilities |
| **gemini-2.0-flash** | Speed-optimised tasks | Gemini 2.0 Flash - Fast, efficient model |
| **gemini-1.5-flash** | Quick responses | Gemini 1.5 Flash - Fast, efficient model |
| **gemini-1.5-pro** | Large context | Gemini 1.5 Pro - 2M token context window |

**Note**: Use `gemini_list_models` to see the exact models available with current context window sizes.

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/houtini-ai/gemini-mcp.git
cd gemini-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Run in development mode with live reload |
| `npm start` | Run the compiled server |
| `npm test` | Run test suite |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Fix linting issues automatically |

### Project Structure

```
src/
├── config/           # Configuration management
│   ├── index.ts      # Main configuration
│   └── types.ts      # Configuration types
├── services/         # Core business logic
│   ├── base-service.ts
│   └── gemini/       # Gemini service implementation
│       ├── index.ts
│       └── types.ts
├── tools/            # MCP tool implementations
│   ├── gemini-chat.ts
│   ├── gemini-list-models.ts
│   └── gemini-deep-research.ts
├── utils/            # Utility functions
│   ├── logger.ts     # Winston logging setup
│   └── error-handler.ts
├── cli.ts            # CLI entry point
└── index.ts          # Main server implementation
```

### Architecture

The server follows a clean, layered architecture:

1. **CLI Layer** (`cli.ts`) - Command-line interface
2. **Server Layer** (`index.ts`) - MCP protocol handling
3. **Tools Layer** (`tools/`) - MCP tool implementations
4. **Service Layer** (`services/`) - Business logic and API integration
5. **Utility Layer** (`utils/`) - Cross-cutting concerns

## Troubleshooting

### Common Issues

#### "GEMINI_API_KEY environment variable not set"

**Solution:**
```bash
# Make sure your API key is set in the Claude Desktop configuration
# See the Configuration section above
```

#### Server not appearing in Claude Desktop

**Solutions:**
1. **Restart Claude Desktop** after updating configuration
2. **Check your configuration file path**:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. **Verify JSON syntax** - use a JSON validator if needed
4. **Ensure your API key is valid** - test at [Google AI Studio](https://makersuite.google.com/app/apikey)

#### "Module not found" errors with npx

**Solutions:**
```bash
# Clear npx cache and try again
npx --yes @houtini/gemini-mcp

# Or install globally if preferred
npm install -g @houtini/gemini-mcp
```

#### Node.js version issues

**Solution:**
```bash
# Check your Node.js version
node --version

# Should be v24.0.0 or higher
# Install latest Node.js from https://nodejs.org
```

### Debug Mode

Enable detailed logging by setting `LOG_LEVEL=debug` in your Claude Desktop configuration:

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
- **Console output** (visible in Claude Desktop developer tools)
- **`logs/combined.log`** - All log levels
- **`logs/error.log`** - Error logs only

### Testing Your Setup

Test the server with these Claude queries:

1. **Basic connectivity**: "Can you list the available Gemini models?"
2. **Simple chat**: "Use Gemini to explain photosynthesis."
3. **Advanced features**: "Use Gemini 1.5 Pro with temperature 0.9 to write a creative poem about coding."

### Performance Tuning

For better performance:

1. **Adjust token limits** based on your use case
2. **Use appropriate models** (Flash for speed, Pro for complex tasks)
3. **Monitor logs** for rate limiting or API issues
4. **Set reasonable temperature values** (0.7 for balanced, 0.3 for focused, 0.9 for creative)

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Ensure all tests pass**: `npm test`
5. **Lint your code**: `npm run lint:fix`
6. **Build the project**: `npm run build`
7. **Commit your changes**: `git commit -m 'Add amazing feature'`
8. **Push to the branch**: `git push origin feature/amazing-feature`
9. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation as needed
- Use conventional commit messages
- Ensure backwards compatibility

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer and Important Information

**Use at Your Own Risk**: This software is provided "as is" without warranty of any kind, express or implied. The authors and contributors accept no responsibility for any damages, data loss, security breaches, or other issues arising from the use of this software.

**Content Safety**: This MCP server interfaces with Google's Gemini AI models. Whilst the server implements content safety settings, the quality and appropriateness of AI-generated content cannot be guaranteed. Users are responsible for:
- Reviewing AI-generated content before use
- Ensuring compliance with applicable laws and regulations
- Implementing additional safety measures as needed for their use case

**API Key Security**: Your Google Gemini API key is sensitive credential information. Users are responsible for:
- Keeping API keys confidential and secure
- Not committing API keys to version control
- Rotating keys if exposure is suspected
- Managing API usage and associated costs

**Data Privacy**: This server processes data sent through the Model Context Protocol. Users should:
- Avoid sending sensitive, personal, or confidential information
- Review Google's privacy policy and terms of service
- Understand that data may be processed by Google's services
- Implement appropriate data handling policies

**Production Use**: Whilst designed with professional standards, users deploying this in production environments should:
- Conduct their own security audits
- Implement appropriate monitoring and logging
- Have incident response procedures
- Regularly update dependencies

**Third-Party Services**: This software relies on external services (Google Gemini API, npm packages). Service availability, pricing, and functionality may change without notice.

**No Professional Advice**: Content generated by AI models should not be considered professional advice (legal, medical, financial, etc.) without proper verification by qualified professionals.

By using this software, you acknowledge that you have read this disclaimer and agree to use the software at your own risk.

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/houtini-ai/gemini-mcp/issues)
- **GitHub Discussions**: [Ask questions or share ideas](https://github.com/houtini-ai/gemini-mcp/discussions)

## Changelog

### v1.3.0

**Accessibility Features**
- Added `gemini_describe_video` tool for YouTube video accessibility descriptions
- Comprehensive audio description generation with spatial awareness and text recognition
- Screen reader-friendly structured JSON output format
- Configurable detail levels (brief, standard, comprehensive)
- Time-stamped scene descriptions for video synchronization
- Focus parameters for emphasizing specific content aspects (actions, visual elements, text)
- Accessibility mode with spatial descriptions, colors, and text overlays
- Support for narrative prose and structured JSON output formats
- Optimized for Gemini 2.5 Flash's multimodal video understanding

### v1.0.4

**Security and Dependency Updates**
- Updated @google/generative-ai to v0.24.1 (from v0.21.0)
- Updated @modelcontextprotocol/sdk to v1.19.1 (from v1.18.1)
- Updated winston, typescript, and other development dependencies
- Changed default safety settings from BLOCK_NONE to BLOCK_MEDIUM_AND_ABOVE for better content safety
- Added comprehensive disclaimer section covering usage risks, API security, and data privacy
- All dependencies audited with zero vulnerabilities

### v1.1.0

**Deep Research & Enhanced Model Discovery**
- Added deep research capability for iterative multi-step analysis
- Enhanced model discovery with better filtering
- Improved default model selection logic
- Better handling of experimental vs stable models
- Documentation updates to reflect dynamic discovery

### v1.0.3

**Enhanced Google Search Grounding**
- Fixed grounding metadata field name issues for improved reliability
- Enhanced source citation processing and display
- Verified compatibility with latest Google Generative AI SDK (v0.21.0)
- Comprehensive grounding documentation and usage examples
- Resolved field naming inconsistencies in grounding response handling
- Improved grounding metadata debugging and error handling

### v1.0.2

**Google Search Grounding Introduction**
- Added Google Search grounding functionality enabled by default
- Real-time web search integration for current information and facts
- Grounding metadata in responses with source citations
- Configurable grounding parameter in chat requests
- Enhanced accuracy for current events, news, and factual queries

### v1.0.0

**Initial Release**
- Complete Node.js/TypeScript rewrite from Python
- Professional modular architecture with services pattern
- Comprehensive error handling and logging system
- Full MCP protocol compliance
- Support for multiple Gemini models
- NPM package distribution ready
- Enterprise-grade configuration management
- Production-ready build system

---

**Built with care for the Model Context Protocol community**

For more information about MCP, visit [modelcontextprotocol.io](https://modelcontextprotocol.io)