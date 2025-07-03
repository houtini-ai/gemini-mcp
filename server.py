#!/usr/bin/env python3
"""
Gemini MCP Server
A Model Context Protocol server for Google Gemini API.

This server provides tools to interact with Google's Gemini AI models
through the MCP (Model Context Protocol).
"""

import os
import sys
import logging
from typing import Any, Sequence

# Ensure user packages are accessible
import site
user_site = os.path.expanduser(os.path.join("~", "AppData", "Roaming", "Python", f"Python{sys.version_info.major}{sys.version_info.minor}", "site-packages"))
if os.path.exists(user_site):
    site.addsitedir(user_site)

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent, Tool, INVALID_PARAMS, INTERNAL_ERROR
    import anyio
except ImportError:
    print("Error: mcp package not installed. Please run: pip install mcp", file=sys.stderr)
    sys.exit(1)

try:
    import google.generativeai as genai
except ImportError:
    print("Error: google-generativeai package not installed. Please run: pip install google-generativeai", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure API key
API_KEY = os.getenv('GEMINI_API_KEY')
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set", file=sys.stderr)
    print("Please set your Gemini API key: set GEMINI_API_KEY=your-api-key-here", file=sys.stderr)
    sys.exit(1)

genai.configure(api_key=API_KEY)

# Create server instance
server = Server("gemini-mcp")

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="gemini_chat",
            description="Chat with Google Gemini models",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "The message to send"},
                    "model": {"type": "string", "default": "gemini-2.5-flash", 
                             "description": "Model to use (e.g., gemini-2.5-flash, gemini-1.5-pro)"},
                    "temperature": {"type": "number", "default": 0.7, "minimum": 0, "maximum": 2,
                                   "description": "Controls randomness (0-2)"},
                    "max_tokens": {"type": "integer", "default": 2048, "minimum": 1, "maximum": 8192,
                                  "description": "Maximum tokens in response"},
                    "system_prompt": {"type": "string", "description": "Optional system instruction"}
                },
                "required": ["message"]
            }
        ),
        Tool(
            name="gemini_list_models",
            description="List available Gemini models and their capabilities",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="gemini_analyze_image",
            description="Analyze an image using Gemini's vision capabilities",
            inputSchema={
                "type": "object",
                "properties": {
                    "image_url": {"type": "string", "description": "URL of the image to analyze"},
                    "prompt": {"type": "string", "default": "What's in this image?",
                              "description": "Question or instruction about the image"},
                    "model": {"type": "string", "default": "gemini-2.5-flash",
                             "description": "Model to use (must support vision)"}
                },
                "required": ["image_url"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> Sequence[TextContent]:
    """Handle tool calls."""
    
    if name == "gemini_chat":
        try:
            message = arguments.get("message")
            if not message:
                raise ValueError("Message is required")
            
            model_name = arguments.get("model", "gemini-2.5-flash")
            temperature = arguments.get("temperature", 0.7)
            max_tokens = arguments.get("max_tokens", 2048)
            system_prompt = arguments.get("system_prompt")
            
            logger.info(f"Calling Gemini {model_name} with message: {message[:100]}...")
            
            # Create the model
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
            )
            
            # Build the prompt
            prompt = message
            if system_prompt:
                prompt = f"{system_prompt}\n\nUser: {message}"
            
            # Generate response
            response = model.generate_content(prompt)
            
            return [TextContent(
                type="text",
                text=response.text
            )]
            
        except Exception as e:
            logger.error(f"Error in gemini_chat: {str(e)}")
            return [TextContent(
                type="text",
                text=f"Error: {str(e)}"
            )]
    
    elif name == "gemini_list_models":
        try:
            models_info = []
            models_info.append("Available Gemini models:\n")
            
            for model in genai.list_models():
                if 'generateContent' in model.supported_generation_methods:
                    models_info.append(f"\n📝 {model.name}")
                    models_info.append(f"   Display name: {model.display_name}")
                    models_info.append(f"   Description: {model.description}")
                    
                    if hasattr(model, 'input_token_limit'):
                        models_info.append(f"   Input token limit: {model.input_token_limit:,}")
                    if hasattr(model, 'output_token_limit'):
                        models_info.append(f"   Output token limit: {model.output_token_limit:,}")
                    
                    models_info.append(f"   Supported methods: {', '.join(model.supported_generation_methods)}")
            
            return [TextContent(
                type="text",
                text="\n".join(models_info)
            )]
            
        except Exception as e:
            logger.error(f"Error listing models: {str(e)}")
            return [TextContent(
                type="text",
                text=f"Error listing models: {str(e)}"
            )]
    
    elif name == "gemini_analyze_image":
        try:
            import requests
            from PIL import Image
            from io import BytesIO
            
            image_url = arguments.get("image_url")
            if not image_url:
                raise ValueError("Image URL is required")
            
            prompt = arguments.get("prompt", "What's in this image?")
            model_name = arguments.get("model", "gemini-2.5-flash")
            
            logger.info(f"Analyzing image from {image_url}")
            
            # Download the image
            response = requests.get(image_url)
            response.raise_for_status()
            
            # Open image with PIL
            img = Image.open(BytesIO(response.content))
            
            # Create model and analyze
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([prompt, img])
            
            return [TextContent(
                type="text",
                text=response.text
            )]
            
        except Exception as e:
            logger.error(f"Error analyzing image: {str(e)}")
            return [TextContent(
                type="text",
                text=f"Error analyzing image: {str(e)}"
            )]
    
    else:
        raise ValueError(f"Unknown tool: {name}")

async def run():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    logger.info("Starting Gemini MCP server...")
    anyio.run(run)
