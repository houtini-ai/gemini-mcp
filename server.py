#!/usr/bin/env python3
"""
Gemini MCP Server - Robust Version
A Model Context Protocol server for Google Gemini API with better error handling.
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
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
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

# Available models
AVAILABLE_MODELS = {
    "gemini-2.5-flash": "Latest Gemini 2.5 Flash - Fast, versatile performance",
    "gemini-2.0-flash": "Gemini 2.0 Flash - Fast, efficient model",
    "gemini-1.5-flash": "Gemini 1.5 Flash - Fast, efficient model",
    "gemini-1.5-pro": "Gemini 1.5 Pro - Advanced reasoning",
    "gemini-pro": "Gemini Pro - Balanced performance",
    "gemini-pro-vision": "Gemini Pro Vision - Multimodal understanding"
}

# Safety settings to minimize content blocking
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

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
                    "message": {
                        "type": "string",
                        "description": "The message to send"
                    },
                    "model": {
                        "type": "string",
                        "default": "gemini-2.5-flash",
                        "enum": list(AVAILABLE_MODELS.keys()),
                        "description": "Model to use"
                    },
                    "temperature": {
                        "type": "number",
                        "default": 0.7,
                        "minimum": 0.0,
                        "maximum": 1.0,
                        "description": "Controls randomness (0.0 to 1.0)"
                    },
                    "max_tokens": {
                        "type": "integer",
                        "default": 2048,
                        "minimum": 1,
                        "maximum": 8192,
                        "description": "Maximum tokens in response"
                    },
                    "system_prompt": {
                        "type": "string",
                        "description": "Optional system instruction"
                    }
                },
                "required": ["message"]
            }
        ),
        Tool(
            name="gemini_list_models",
            description="List available Gemini models and their descriptions",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent]:
    """Handle tool calls."""
    try:
        if name == "gemini_chat":
            message = arguments.get("message")
            if not message:
                raise ValueError("Message is required")
            
            model_name = arguments.get("model", "gemini-2.5-flash")
            temperature = arguments.get("temperature", 0.7)
            max_tokens = arguments.get("max_tokens", 2048)
            system_prompt = arguments.get("system_prompt", "")
            
            # Log the request
            logger.info(f"Calling Gemini {model_name} with message: {message[:100]}...")
            
            try:
                # Initialize the model
                model = genai.GenerativeModel(
                    model_name=model_name,
                    safety_settings=SAFETY_SETTINGS,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    }
                )
                
                # Prepare the prompt
                if system_prompt:
                    full_prompt = f"{system_prompt}\n\nUser: {message}\n\nAssistant:"
                else:
                    full_prompt = message
                
                # Generate response
                response = model.generate_content(full_prompt)
                
                # Check if response was blocked
                if response.prompt_feedback and hasattr(response.prompt_feedback, 'block_reason'):
                    block_reason = response.prompt_feedback.block_reason
                    if block_reason:
                        return [TextContent(
                            type="text",
                            text=f"Response was blocked by safety filters. Reason: {block_reason}. Try rephrasing your query or using different parameters."
                        )]
                
                # Extract text from response
                if hasattr(response, 'text'):
                    response_text = response.text
                elif hasattr(response, 'parts') and response.parts:
                    response_text = ''.join(part.text for part in response.parts if hasattr(part, 'text'))
                else:
                    # Handle the case where content was filtered
                    if hasattr(response, 'candidates') and response.candidates:
                        candidate = response.candidates[0]
                        if hasattr(candidate, 'finish_reason'):
                            finish_reason = candidate.finish_reason
                            reason_map = {
                                1: "STOP - Natural ending",
                                2: "SAFETY - Content was filtered",
                                3: "MAX_TOKENS - Hit token limit",
                                4: "UNSPECIFIED",
                                5: "OTHER"
                            }
                            reason = reason_map.get(finish_reason, f"Unknown reason: {finish_reason}")
                            return [TextContent(
                                type="text",
                                text=f"Response was filtered. Finish reason: {reason}\n\nTry:\n1. Rephrasing your query\n2. Using a different model\n3. Adjusting temperature settings"
                            )]
                    
                    return [TextContent(
                        type="text",
                        text="No text content in response. The model may have filtered the content."
                    )]
                
                return [TextContent(type="text", text=response_text)]
                
            except Exception as e:
                logger.error(f"Error calling Gemini: {str(e)}")
                return [TextContent(
                    type="text",
                    text=f"Error generating response: {str(e)}"
                )]
        
        elif name == "gemini_list_models":
            models_info = "Available Gemini Models:\n\n"
            for model_id, description in AVAILABLE_MODELS.items():
                models_info += f"• **{model_id}**: {description}\n"
            
            return [TextContent(type="text", text=models_info)]
        
        else:
            raise ValueError(f"Unknown tool: {name}")
            
    except Exception as e:
        logger.error(f"Error in tool execution: {str(e)}")
        return [TextContent(
            type="text",
            text=f"Error: {str(e)}"
        )]

async def main():
    """Run the server."""
    logger.info("Starting Gemini MCP server...")
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    anyio.run(main)
