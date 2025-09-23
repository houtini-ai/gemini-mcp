# Gemini MCP Server

[![npm version](https://badge.fury.io/js/@houtini/gemini-mcp.svg)](https://badge.fury.io/js/@houtini/gemini-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)

A professional, production-ready Model Context Protocol (MCP) server that provides seamless integration with Google's Gemini AI models. Built with TypeScript and designed for enterprise use, this package offers robust error handling, comprehensive logging, and easy deployment.

## 🚀 Quick Start

The easiest way to get started is using `npx` - no installation required:

```bash
# Get your API key from Google AI Studio
# https://makersuite.google.com/app/apikey

# Test the server (optional)
npx @houtini/gemini-mcp

# Add to Claude Desktop (see configuration below)
```

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [API Reference](#-api-reference)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## ✨ Features

### Core Functionality
- **🤖 Multi-Model Support** - Access to 6 Gemini models including the latest Gemini 2.5 Flash
- **💬 Chat Interface** - Advanced chat functionality with customisable parameters
- **🌐 Google Search Grounding** - Real-time web search integration enabled by default for current information
- **📊 Model Information** - Detailed model capabilities and specifications
- **🎛️ Fine-Grained Control** - Temperature, token limits, and system prompts

### Enterprise Features
- **🏗️ Professional Architecture** - Modular services-based design
- **🛡️ Robust Error Handling** - Comprehensive error handling with detailed logging
- **📝 Winston Logging** - Production-ready logging with file rotation
- **🔒 Security Focused** - No hardcoded credentials, environment-based configuration
- **🏷️ Full TypeScript** - Complete type safety and IntelliSense support
- **⚡ High Performance** - Optimised for minimal latency and resource usage

## 📦 Installation

### Prerequisites

- **Node.js** v24.0.0
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

## ⚙️ Configuration

### Step 1: Get Your API Key

Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to create your free API key.

### Step 2: Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### ✅ Recommended Configuration (using npx)

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
- ✅ No global installation required
- ✅ Always uses the latest version
- ✅ Cleaner system (no global packages)
- ✅ Works out of the box

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

### Using .env File (Development)

For development or testing, create a `.env` file:

```env
# Google Gemini Configuration
GEMINI_API_KEY=your-api-key-here

# Logging Configuration (optional)
LOG_LEVEL=info
```

## 💡 Usage Examples

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

## 🌐 Google Search Grounding

This server includes **Google Search grounding** functionality powered by Google's real-time web search, providing Gemini models with access to current web information. This feature is **enabled by default** and significantly enhances response accuracy for questions requiring up-to-date information.

### ✨ Key Benefits

- **🔄 Real-time Information** - Access to current news, events, stock prices, weather, and developments
- **🎯 Factual Accuracy** - Reduces AI hallucinations by grounding responses in verified web sources
- **📚 Source Citations** - Automatic citation of sources with search queries used
- **⚡ Seamless Integration** - Works transparently without changing your existing workflow
- **🧠 Smart Search** - AI automatically determines when to search based on query content

### How Google Search Grounding Works

When you ask a question that benefits from current information, the system:

1. **Analyses your query** to determine if web search would improve the answer
2. **Generates relevant search queries** automatically based on your question  
3. **Performs Google searches** using multiple targeted queries
4. **Processes search results** and synthesises information from multiple sources
5. **Provides enhanced response** with inline citations and source links
6. **Shows search metadata** including the actual queries used for transparency

### 🎯 Perfect For These Use Cases

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

### 🎛️ Controlling Grounding Behaviour

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

### 📊 Understanding Grounded Responses

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

## 🔧 API Reference

### Available Tools

#### `gemini_chat`

Chat with Gemini models to generate text responses.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `message` | string | ✅ | - | The message to send to Gemini |
| `model` | string | ❌ | "gemini-2.5-flash" | Model to use |
| `temperature` | number | ❌ | 0.7 | Controls randomness (0.0-1.0) |
| `max_tokens` | integer | ❌ | 2048 | Maximum tokens in response (1-8192) |
| `system_prompt` | string | ❌ | - | System instruction to guide the model |
| `grounding` | boolean | ❌ | true | Enable Google Search grounding for real-time information |

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

Retrieve information about all available Gemini models.

**Parameters:** None required

**Example:**
```json
{}
```

**Response includes:**
- Model names and display names
- Descriptions of each model's strengths
- Recommended use cases

### Available Models

| Model | Best For | Description |
|-------|----------|-------------|
| **gemini-2.5-flash** | General use, latest features | Latest Gemini 2.5 Flash - Fast, versatile performance |
| **gemini-2.0-flash** | Speed-optimised tasks | Gemini 2.0 Flash - Fast, efficient model |
| **gemini-1.5-flash** | Quick responses | Gemini 1.5 Flash - Fast, efficient model |
| **gemini-1.5-pro** | Complex reasoning | Gemini 1.5 Pro - Advanced reasoning capabilities |
| **gemini-pro** | Balanced performance | Gemini Pro - Balanced performance for most tasks |
| **gemini-pro-vision** | Multimodal tasks | Gemini Pro Vision - Text and image understanding |

## 🛠️ Development

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
│   └── gemini-list-models.ts
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

## 🐛 Troubleshooting

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

## 🤝 Contributing

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

- **Follow TypeScript best practices**
- **Add tests for new functionality**
- **Update documentation as needed**
- **Use conventional commit messages**
- **Ensure backwards compatibility**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/houtini-ai/gemini-mcp/issues)
- **GitHub Discussions**: [Ask questions or share ideas](https://github.com/houtini-ai/gemini-mcp/discussions)

## 📈 Changelog

### v1.0.3 (Latest)

**Enhanced Google Search Grounding**
- 🔧 Fixed grounding metadata field name issues for improved reliability
- 🎯 Enhanced source citation processing and display
- ✅ Verified compatibility with latest Google Generative AI SDK (v0.21.0)
- 📝 Comprehensive grounding documentation and usage examples
- 🐛 Resolved field naming inconsistencies in grounding response handling
- ⚡ Improved grounding metadata debugging and error handling

### v1.0.2

**Google Search Grounding Introduction**
- ✨ Added Google Search grounding functionality enabled by default
- 🌐 Real-time web search integration for current information and facts
- 📊 Grounding metadata in responses with source citations
- 🎛️ Configurable grounding parameter in chat requests
- 🎯 Enhanced accuracy for current events, news, and factual queries

### v1.0.0

**Initial Release**
- Complete Node.js/TypeScript rewrite from Python
- Professional modular architecture with services pattern
- Comprehensive error handling and logging system
- Full MCP protocol compliance
- Support for 6 Gemini models
- NPM package distribution ready
- Enterprise-grade configuration management
- Production-ready build system

---

**Built with ❤️ for the Model Context Protocol community**

For more information about MCP, visit [modelcontextprotocol.io](https://modelcontextprotocol.io)
