# Gemini MCP Server

[![npm version](https://badge.fury.io/js/@houtini/gemini-mcp.svg)](https://badge.fury.io/js/@houtini/gemini-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)

A professional, production-ready Model Context Protocol (MCP) server that provides seamless integration with Google's Gemini AI models. Built with TypeScript and designed for enterprise use, this package offers robust error handling, comprehensive logging, and easy deployment.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @houtini/gemini-mcp

# Or install locally
npm install @houtini/gemini-mcp

# Set your API key
export GEMINI_API_KEY="your-api-key-here"

# Run the server
gemini-mcp
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

- **Node.js** 18.0.0 or higher (you're running v24.6.0 ✅)
- **Google AI Studio API Key** ([Get your key here](https://makersuite.google.com/app/apikey))

### Global Installation (Recommended)

```bash
npm install -g @houtini/gemini-mcp
```

### Local Installation

```bash
npm install @houtini/gemini-mcp
```

### From Source

```bash
git clone https://github.com/houtini-ai/gemini-mcp.git
cd gemini-mcp
npm install
npm run build
```

## ⚙️ Configuration

### Environment Variables

The simplest way to configure the server is through environment variables:

```bash
# Required
export GEMINI_API_KEY="your-api-key-here"

# Optional
export LOG_LEVEL="info"  # debug, info, warn, error
```

### Using .env File

Create a `.env` file in your project directory:

```env
# Google Gemini Configuration
GEMINI_API_KEY=your-api-key-here

# Logging Configuration
LOG_LEVEL=info

# Optional server configuration
SERVER_NAME=gemini-mcp
SERVER_VERSION=1.0.0
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### For Global Installation:
```json
{
  "mcpServers": {
    "gemini": {
      "command": "gemini-mcp",
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### For Local Installation:
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

#### For Development:
```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["C:\\path\\to\\gemini-mcp\\dist\\index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
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

**Example:**
```json
{
  "message": "Explain machine learning in simple terms",
  "model": "gemini-1.5-pro",
  "temperature": 0.5,
  "max_tokens": 1000,
  "system_prompt": "You are a helpful teaching assistant. Explain concepts clearly and use analogies where appropriate."
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
export GEMINI_API_KEY="your-actual-api-key"
```

Or create a `.env` file with your API key.

#### Server not appearing in Claude Desktop

**Solutions:**
1. Restart Claude Desktop after updating configuration
2. Check that the path in your configuration is correct
3. Ensure the built files exist in the `dist` directory
4. Verify your API key is valid

#### "Module not found" errors

**Solutions:**
```bash
# Reinstall dependencies
npm install

# Rebuild the project
npm run build

# Check Node.js version (requires 18.0.0+)
node --version
```

#### TypeScript compilation errors

**Solution:**
```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### Debug Mode

Enable detailed logging:

```bash
export LOG_LEVEL=debug
npm start
```

### Log Files

Logs are written to:
- **Console output** (stdout/stderr)
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