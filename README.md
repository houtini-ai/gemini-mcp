# Gemini MCP Server (Node.js)

A Model Context Protocol (MCP) server that provides seamless integration with Google's Gemini AI models. This Node.js/TypeScript implementation offers a robust, modular architecture with enhanced error handling and easy debugging capabilities.

## Features

- 💬 **Chat with Gemini Models** - Send messages to various Gemini models with customizable parameters
- 📝 **List Available Models** - Get detailed information about all available Gemini models
- 🔧 **Configurable Parameters** - Control temperature, max tokens, and system prompts
- 🛡️ **Enhanced Error Handling** - Comprehensive error handling with detailed logging
- 📦 **NPM Distribution** - Easy installation and distribution via NPM
- 🏗️ **Modular Architecture** - Services-based design for easy debugging and extension
- 📘 **TypeScript Support** - Full type safety and IntelliSense support
- 🚀 **Easy Setup** - Simple installation and configuration process

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- A Google AI Studio API key ([Get one here](https://makersuite.google.com/app/apikey))

### Install via NPM

```bash
npm install -g @mcp/gemini
```

### Install from Source

```bash
git clone https://github.com/your-username/gemini-mcp.git
cd gemini-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

Set your API key as an environment variable:

```bash
# Windows
set GEMINI_API_KEY=your-api-key-here

# macOS/Linux
export GEMINI_API_KEY=your-api-key-here
```

Or create a `.env` file in your project directory:

```env
GEMINI_API_KEY=your-api-key-here
LOG_LEVEL=info
```

### For Claude Desktop

Add the following to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

### Using the Global NPM Installation

If installed globally via NPM:

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

## Usage

### Running the Server

```bash
# If installed globally
gemini-mcp

# If running from source
npm run dev

# If built and running locally
npm start
```

### Available Tools

#### gemini_chat
Chat with Gemini models to generate text responses.

**Parameters:**
- `message` (required): The message to send to Gemini
- `model` (optional): Model to use (default: "gemini-2.5-flash")
- `temperature` (optional): Controls randomness 0.0-1.0 (default: 0.7)
- `max_tokens` (optional): Maximum tokens in response (default: 2048)
- `system_prompt` (optional): System instruction to guide the model

**Example:**
```javascript
{
  "message": "Explain quantum computing in simple terms",
  "model": "gemini-2.5-flash",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

#### gemini_list_models
List all available Gemini models and their capabilities.

**Example:**
```javascript
{} // No parameters required
```

## Available Models

- **gemini-2.5-flash** - Latest Gemini 2.5 Flash - Fast, versatile performance
- **gemini-2.0-flash** - Gemini 2.0 Flash - Fast, efficient model
- **gemini-1.5-flash** - Gemini 1.5 Flash - Fast, efficient model
- **gemini-1.5-pro** - Gemini 1.5 Pro - Advanced reasoning
- **gemini-pro** - Gemini Pro - Balanced performance
- **gemini-pro-vision** - Gemini Pro Vision - Multimodal understanding

## Architecture

The server is built with a modular, services-based architecture:

```
src/
├── config/          # Configuration management
├── services/        # Core services (Gemini integration)
├── tools/           # MCP tool implementations
├── utils/           # Utilities (logging, error handling)
└── types/           # TypeScript type definitions
```

### Services

- **GeminiService**: Handles all Google Gemini API interactions
- **BaseService**: Abstract base class providing common functionality

### Tools

- **GeminiChatTool**: Implements the gemini_chat functionality
- **GeminiListModelsTool**: Implements the gemini_list_models functionality

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Testing

```bash
npm test
```

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable not set"**
   - Make sure you've set your API key in the environment or .env file

2. **"Module not found" errors**
   - Run `npm install` to install all dependencies
   - Ensure Node.js version is 18.0.0 or higher

3. **Server not appearing in Claude**
   - Restart Claude Desktop after updating the configuration
   - Check that the path in your configuration is correct
   - Ensure the built files exist in the `dist` directory

4. **TypeScript compilation errors**
   - Run `npm run build` to compile TypeScript to JavaScript
   - Check for any TypeScript errors in the output

### Debug Mode

To see detailed logs, set the LOG_LEVEL environment variable:

```bash
export LOG_LEVEL=debug
npm start
```

Logs are written to:
- Console output
- `logs/combined.log` (all logs)
- `logs/error.log` (error logs only)

### Testing the Server

Test the server manually using the MCP protocol or through Claude Desktop with these queries:

1. **List models**: "Show me all available Gemini models"
2. **Basic chat**: "What is machine learning?"
3. **Complex query**: "Explain the differences between transformer and LSTM architectures"
4. **Creative writing**: "Write a short story about a robot learning to paint"

## API Reference

### GeminiService Methods

```typescript
class GeminiService {
  async chat(request: ChatRequest): Promise<ChatResponse>
  async listModels(): Promise<ListModelsResponse>
  async validateConfig(): Promise<boolean>
  getAvailableModels(): string[]
}
```

### Configuration Types

```typescript
interface GeminiConfig {
  apiKey?: string;
  safetySettings: SafetySetting[];
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the linter: `npm run lint`
6. Build the project: `npm run build`
7. Test your changes
8. Commit your changes: `git commit -am 'Add new feature'`
9. Push to the branch: `git push origin feature/new-feature`
10. Submit a pull request

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0
- Initial Node.js/TypeScript implementation
- Modular services-based architecture
- Enhanced error handling and logging
- NPM package distribution
- Full TypeScript support
- Improved debugging capabilities

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing issues for solutions
- Contribute improvements via pull requests

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Uses Google's [Gemini API](https://ai.google.dev/)
- Inspired by the MCP ecosystem
- Migrated from Python implementation to Node.js for better NPM distribution
