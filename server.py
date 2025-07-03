#!/usr/bin/env python3
"""
Gemini MCP Server - Bridge to Google's Gemini AI models
"""

import sys
print("Starting Gemini MCP server module...", file=sys.stderr)

try:
    from fastmcp import FastMCP
    print("FastMCP imported successfully", file=sys.stderr)
except ImportError as e:
    print(f"Failed to import FastMCP: {e}", file=sys.stderr)
    print(f"Python path: {sys.path}", file=sys.stderr)
    raise

import os
import json
import logging
from typing import Optional, List, Dict, Any
import requests
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MCP server
mcp = FastMCP("gemini-mcp", version="0.1.0")
mcp.description = "MCP server for Google Gemini AI models"

# Configuration
GEMINI_API_BASE = "https://generativelanguage.googleapis.com"
API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    logger.error("GEMINI_API_KEY environment variable not set!")

# Available models
MODELS = {
    "gemini-2.5-flash": "Latest and most advanced flash model",
    "gemini-2.0-flash": "Fast model with improved capabilities",
    "gemini-1.5-flash": "Fast and versatile model",
    "gemini-1.5-pro": "Most capable model for complex tasks",
    "gemini-pro": "Legacy model for text generation",
    "gemini-pro-vision": "Legacy multimodal model"
}

@mcp.tool()
async def gemini_chat(
    message: str,
    model: str = "gemini-2.5-flash",
    temperature: float = 0.7,
    max_tokens: int = 2048,
    system_prompt: Optional[str] = None
) -> str:
    """
    Chat with Google Gemini models.
    
    Args:
        message: The message to send to Gemini
        model: Model to use (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, etc.)
        temperature: Controls randomness (0.0 to 1.0)
        max_tokens: Maximum tokens in response
        system_prompt: Optional system instruction
    
    Returns:
        The model's response
    """
    if not API_KEY:
        return "Error: GEMINI_API_KEY not configured"
    
    if model not in MODELS:
        return f"Error: Invalid model '{model}'. Available models: {', '.join(MODELS.keys())}"
    
    try:
        # Prepare the request
        url = f"{GEMINI_API_BASE}/v1beta/models/{model}:generateContent"
        
        # Build the content
        contents = []
        
        # Add system prompt if provided
        if system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System: {system_prompt}"}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I'll follow these instructions."}]
            })
        
        # Add user message
        contents.append({
            "role": "user",
            "parts": [{"text": message}]
        })
        
        # Prepare request body
        body = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "topP": 0.95,
                "topK": 40
            }
        }
        
        # Make the request
        logger.info(f"Calling Gemini {model} with message: {message[:100]}...")
        response = requests.post(
            url,
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-goog-api-key": API_KEY
            }
        )
        
        if response.status_code != 200:
            error_msg = f"Gemini API error ({response.status_code}): {response.text}"
            logger.error(error_msg)
            return error_msg
        
        # Extract the response
        result = response.json()
        
        if "candidates" in result and len(result["candidates"]) > 0:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                text_parts = [part["text"] for part in candidate["content"]["parts"] if "text" in part]
                return "\n".join(text_parts)
        
        return "Error: No response generated"
        
    except Exception as e:
        error_msg = f"Error calling Gemini: {str(e)}"
        logger.error(error_msg)
        return error_msg

@mcp.tool()
async def gemini_analyze_image(
    image_url: str,
    prompt: str = "What's in this image?",
    model: str = "gemini-2.5-flash"
) -> str:
    """
    Analyze an image using Gemini's vision capabilities.
    
    Args:
        image_url: URL of the image to analyze
        prompt: Question or instruction about the image
        model: Model to use (must support vision)
    
    Returns:
        The model's analysis of the image
    """
    if not API_KEY:
        return "Error: GEMINI_API_KEY not configured"
    
    # Check if model supports vision
    vision_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"]
    if model not in vision_models:
        return f"Error: Model '{model}' doesn't support image analysis. Use one of: {', '.join(vision_models)}"
    
    try:
        # Download the image
        logger.info(f"Downloading image from {image_url}")
        image_response = requests.get(image_url)
        
        if image_response.status_code != 200:
            return f"Error downloading image: {image_response.status_code}"
        
        # Convert to base64
        import base64
        image_base64 = base64.b64encode(image_response.content).decode('utf-8')
        
        # Determine MIME type
        content_type = image_response.headers.get('content-type', 'image/jpeg')
        
        # Prepare the request
        url = f"{GEMINI_API_BASE}/v1beta/models/{model}:generateContent"
        
        body = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": content_type,
                            "data": image_base64
                        }
                    }
                ]
            }]
        }
        
        # Make the request
        logger.info(f"Analyzing image with prompt: {prompt}")
        response = requests.post(
            url,
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-goog-api-key": API_KEY
            }
        )
        
        if response.status_code != 200:
            error_msg = f"Gemini API error ({response.status_code}): {response.text}"
            logger.error(error_msg)
            return error_msg
        
        # Extract the response
        result = response.json()
        
        if "candidates" in result and len(result["candidates"]) > 0:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                text_parts = [part["text"] for part in candidate["content"]["parts"] if "text" in part]
                return "\n".join(text_parts)
        
        return "Error: No response generated"
        
    except Exception as e:
        error_msg = f"Error analyzing image: {str(e)}"
        logger.error(error_msg)
        return error_msg

@mcp.tool()
async def gemini_list_models() -> str:
    """
    List available Gemini models and their capabilities.
    
    Returns:
        Information about available models
    """
    if not API_KEY:
        return "Error: GEMINI_API_KEY not configured"
    
    try:
        url = f"{GEMINI_API_BASE}/v1beta/models"
        response = requests.get(url, headers={"X-goog-api-key": API_KEY})
        
        if response.status_code != 200:
            return f"Error listing models: {response.text}"
        
        models = response.json().get("models", [])
        
        # Format the response
        result = "Available Gemini Models:\n\n"
        
        for model in models:
            name = model.get("name", "").replace("models/", "")
            display_name = model.get("displayName", name)
            description = model.get("description", "No description available")
            
            # Check supported methods
            methods = model.get("supportedGenerationMethods", [])
            
            result += f"**{display_name}** (`{name}`)\n"
            result += f"  Description: {description}\n"
            result += f"  Supported methods: {', '.join(methods)}\n"
            
            # Input token limit
            if "inputTokenLimit" in model:
                result += f"  Max input tokens: {model['inputTokenLimit']:,}\n"
            
            # Output token limit
            if "outputTokenLimit" in model:
                result += f"  Max output tokens: {model['outputTokenLimit']:,}\n"
            
            result += "\n"
        
        return result
        
    except Exception as e:
        return f"Error listing models: {str(e)}"

@mcp.tool()
async def gemini_count_tokens(
    text: str,
    model: str = "gemini-2.5-flash"
) -> str:
    """
    Count tokens for a given text using Gemini's tokenizer.
    
    Args:
        text: The text to count tokens for
        model: The model to use for tokenization
    
    Returns:
        Token count information
    """
    if not API_KEY:
        return "Error: GEMINI_API_KEY not configured"
    
    try:
        url = f"{GEMINI_API_BASE}/v1beta/models/{model}:countTokens"
        
        body = {
            "contents": [{
                "parts": [{"text": text}]
            }]
        }
        
        response = requests.post(
            url,
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-goog-api-key": API_KEY
            }
        )
        
        if response.status_code != 200:
            return f"Error counting tokens: {response.text}"
        
        result = response.json()
        token_count = result.get("totalTokens", 0)
        
        return f"Token count: {token_count:,} tokens"
        
    except Exception as e:
        return f"Error counting tokens: {str(e)}"

@mcp.tool()
async def gemini_generate_content(
    prompt: str,
    content_type: str = "story",
    model: str = "gemini-2.5-flash",
    temperature: float = 0.9,
    max_tokens: int = 4096
) -> str:
    """
    Generate creative content with Gemini.
    
    Args:
        prompt: The creative prompt
        content_type: Type of content (story, poem, code, article, etc.)
        model: Model to use
        temperature: Creativity level (0.0 to 1.0, higher = more creative)
        max_tokens: Maximum length of generated content
    
    Returns:
        Generated creative content
    """
    # Add content type context to the prompt
    enhanced_prompt = f"Please generate a {content_type} based on the following prompt:\n\n{prompt}"
    
    # Use higher temperature for creative content
    return await gemini_chat(
        message=enhanced_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )

# Run the server
if __name__ == "__main__":
    print(f"Starting Gemini MCP server...", file=sys.stderr)
    print(f"API Key configured: {'Yes' if API_KEY else 'No'}", file=sys.stderr)
    if API_KEY:
        print(f"API Key prefix: {API_KEY[:10]}...", file=sys.stderr)
    
    try:
        print("About to call mcp.run()...", file=sys.stderr)
        mcp.run()
    except Exception as e:
        print(f"Error running MCP server: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise
