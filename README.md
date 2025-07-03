# Gemini MCP Server

An MCP (Model Context Protocol) server that provides seamless integration between Claude Desktop (or any MCP client) and Google's Gemini AI models.

## Features

- 🚀 **Fast & Efficient**: Uses the latest Gemini 2.5 Flash model by default
- 💬 **Text Generation**: Advanced conversational AI with system prompt support
- 🖼️ **Vision Capabilities**: Analyze images with Gemini's multimodal models
- 📊 **Token Management**: Count tokens before sending requests
- 🎨 **Creative Content**: Generate stories, poems, code, and more
- 🔍 **Model Discovery**: List all available Gemini models and their capabilities

## Available Tools

| Tool | Description |
|------|-------------|
| `gemini_chat` | Chat with Gemini models with customizable parameters |
| `gemini_analyze_image` | Analyze images using vision-capable models |
| `gemini_list_models` | List all available models and their specifications |
| `gemini_count_tokens` | Count tokens in text before sending |
| `gemini_generate_content` | Generate creative content with optimized settings |

## Prerequisites

- Python 3.7 or later
- [Claude Desktop](https://www.anthropic.com/claude) or another MCP client
- Google AI Studio API key ([Get one free](https://makersuite.google.com/app/apikey))

## Installation

1. **Clone this repository**:
   ```bash
   git clone https://github.com/richardbaxterseo/gemini-mcp.git
   cd gemini-mcp
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Get your API key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key

4. **Configure Claude Desktop**:
   
   Add to your Claude configuration file (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

   ```json
   {
     "mcpServers": {
       "gemini": {
         "command": "python",
         "args": ["path/to/gemini-mcp/server.py"],
         "env": {
           "GEMINI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

   For Windows users with Python path issues, use the wrapper script:
   ```json
   "args": ["path/to/gemini-mcp/run_server_wrapper.py"]
   ```

5. **Restart Claude Desktop**

## Usage Examples

### Basic Chat
```
Use Gemini to explain how neural networks work in simple terms
```

### Image Analysis
```
Ask Gemini to analyze this image and describe what it sees: [image URL]
```

### Creative Writing
```
Have Gemini write a short story about a robot learning to paint
```

### Model Information
```
Use Gemini to list available models and their capabilities
```

### Custom Parameters
```
Ask Gemini (using temperature 0.9 and max_tokens 1000) to write a creative poem about coding
```

## Supported Models

- **gemini-2.5-flash** (default) - Latest and most advanced flash model
- **gemini-2.0-flash** - Fast model with improved capabilities
- **gemini-1.5-flash** - Fast and versatile model
- **gemini-1.5-pro** - Most capable model for complex tasks
- **gemini-pro** - Legacy text generation model
- **gemini-pro-vision** - Legacy multimodal model

## Configuration Options

### Environment Variables
- `GEMINI_API_KEY` (required) - Your Google AI Studio API key

### Tool Parameters

#### gemini_chat
- `message` (required) - The message to send
- `model` - Model to use (default: gemini-2.5-flash)
- `temperature` - Creativity level 0.0-1.0 (default: 0.7)
- `max_tokens` - Maximum response length (default: 2048)
- `system_prompt` - Optional system instructions

#### gemini_analyze_image
- `image_url` (required) - URL of the image to analyze
- `prompt` - Analysis instruction (default: "What's in this image?")
- `model` - Vision-capable model (default: gemini-2.5-flash)

## API Limits

Free tier includes:
- 60 requests per minute
- Daily token limits
- Access to all Gemini models

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure the API key is in your Claude config
- Restart Claude after configuration changes

### "No module named 'fastmcp'"
- Run `pip install fastmcp requests`
- Check your Python installation

### Rate limit errors
- Free tier has request limits
- Wait a minute between requests or upgrade your plan

### Windows-specific issues
- Use the provided wrapper script for Python path issues
- Ensure paths use backslashes in the config file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [FastMCP](https://github.com/jlowin/fastmcp) framework
- Powered by [Google's Gemini AI](https://ai.google.dev/)
- Designed for [Anthropic's MCP](https://modelcontextprotocol.io/)

## Security

- Never commit API keys to version control
- Always use environment variables for sensitive data
- Keep your API keys secure and rotate them regularly

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [Google AI documentation](https://ai.google.dev/docs)
- Review the [MCP documentation](https://modelcontextprotocol.io/docs)