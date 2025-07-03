# Gemini MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with Google's Gemini AI models. This server allows AI assistants like Claude to interact with Gemini models for text generation, image analysis, and more.

## Features

- 💬 **Chat with Gemini Models** - Send messages to various Gemini models with customizable parameters
- 📝 **List Available Models** - Get detailed information about all available Gemini models
- 🖼️ **Image Analysis** - Analyze images using Gemini's vision capabilities
- 🔧 **Configurable Parameters** - Control temperature, max tokens, and system prompts
- 🚀 **Easy Setup** - Simple installation and configuration process

## Installation

### Prerequisites

- Python 3.7 or higher
- A Google AI Studio API key ([Get one here](https://makersuite.google.com/app/apikey))

### Setup

1. Clone the repository:
```bash
git clone https://github.com/richardbaxterseo/gemini-mcp.git
cd gemini-mcp
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up your API key:
```bash
# Windows
set GEMINI_API_KEY=your-api-key-here

# macOS/Linux
export GEMINI_API_KEY=your-api-key-here
```

## Configuration

### For Claude Desktop

Add the following to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gemini": {
      "command": "python",
      "args": ["C:\\path\\to\\gemini-mcp\\server.py"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### gemini_chat
Chat with Gemini models to generate text responses.

**Parameters:**
- `message` (required): The message to send to Gemini
- `model` (optional): Model to use (default: "gemini-2.5-flash")
- `temperature` (optional): Controls randomness 0-2 (default: 0.7)
- `max_tokens` (optional): Maximum tokens in response (default: 2048)
- `system_prompt` (optional): System instruction to guide the model

**Example:**
```
"Can you explain quantum computing in simple terms?"
```

### gemini_list_models
List all available Gemini models and their capabilities.

**Example:**
```
"Show me all available Gemini models"
```

### gemini_analyze_image
Analyze images using Gemini's vision capabilities.

**Parameters:**
- `image_url` (required): URL of the image to analyze
- `prompt` (optional): Question about the image (default: "What's in this image?")
- `model` (optional): Model to use (default: "gemini-2.5-flash")

**Example:**
```
"Analyze this image: https://example.com/image.jpg"
```

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable not set"**
   - Make sure you've set your API key in the environment or in the Claude configuration

2. **"No module named 'mcp'"**
   - Run `pip install -r requirements.txt` to install all dependencies

3. **Server not appearing in Claude**
   - Restart Claude Desktop after updating the configuration
   - Check that the path in your configuration is correct
   - Ensure Python is in your system PATH

### Debug Mode

To see detailed logs, you can run the server manually:
```bash
set GEMINI_API_KEY=your-api-key-here
python server.py
```

## Development

To contribute or modify the server:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Uses Google's [Gemini API](https://ai.google.dev/)
- Inspired by the MCP ecosystem

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing issues for solutions
- Contribute improvements via pull requests
