import { TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from '../services/gemini';
import { createToolResult, McpError } from '../utils/error-handler';
import logger from '../utils/logger';

export interface VideoDescriptionRequest {
  url: string;
  detail_level?: 'brief' | 'standard' | 'comprehensive';
  accessibility_mode?: boolean;
  include_timestamps?: boolean;
  output_format?: 'narrative' | 'structured';
  focus?: 'actions' | 'visual_elements' | 'text_on_screen' | 'all';
}

export interface VideoScene {
  timestamp: string;
  description: string;
  actions?: string[];
  tools_visible?: string[];
  text_on_screen?: string | null;
  spatial_notes?: string;
  colors?: string;
}

export interface StructuredVideoDescription {
  video_title?: string;
  duration?: string;
  scene_count: number;
  scenes: VideoScene[];
  key_techniques?: string[];
  tools_list?: string[];
  materials_list?: string[];
  safety_notes?: string[];
  summary: string;
}

export class GeminiDescribeVideoTool {
  constructor(private geminiService: GeminiService) {}

  getDefinition(): Tool {
    return {
      name: 'gemini_describe_video',
      description: 'Generate detailed audio description of YouTube video content for accessibility. Analyzes visual content including actions, spatial relationships, text overlays, and provides time-stamped descriptions.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'YouTube URL to analyze'
          },
          detail_level: {
            type: 'string',
            enum: ['brief', 'standard', 'comprehensive'],
            default: 'standard',
            description: 'Level of detail in descriptions: brief (high-level summary), standard (balanced), comprehensive (extensive detail)'
          },
          accessibility_mode: {
            type: 'boolean',
            default: true,
            description: 'Include spatial descriptions, colors, text overlays, and other visual details important for accessibility'
          },
          include_timestamps: {
            type: 'boolean',
            default: true,
            description: 'Include timestamps for all major actions and scene changes'
          },
          output_format: {
            type: 'string',
            enum: ['narrative', 'structured'],
            default: 'structured',
            description: 'Output format: narrative (prose description) or structured (JSON with sections for easy navigation)'
          },
          focus: {
            type: 'string',
            enum: ['actions', 'visual_elements', 'text_on_screen', 'all'],
            default: 'all',
            description: 'What aspects to focus on: actions (what people do), visual_elements (objects, colors, composition), text_on_screen (captions, overlays), or all'
          }
        },
        required: ['url']
      }
    };
  }

  private buildAccessibilityPrompt(request: VideoDescriptionRequest): string {
    const detailLevelInstructions = {
      brief: 'Provide a concise 2-3 paragraph summary of the video content.',
      standard: 'Provide a balanced description with key scenes and actions, approximately 5-8 scenes.',
      comprehensive: 'Provide extensive detail for every significant action and visual element, breaking the video into 10-15+ distinct scenes.'
    };

    const focusInstructions = {
      actions: 'Focus primarily on what people are doing - movements, gestures, tool usage, and procedures.',
      visual_elements: 'Focus on visual composition - objects, colors, spatial relationships, and visual design.',
      text_on_screen: 'Focus on any text, captions, overlays, or written information visible in the video.',
      all: 'Provide comprehensive coverage of actions, visual elements, and text equally.'
    };

    const accessibilityInstructions = request.accessibility_mode ? `
ACCESSIBILITY MODE REQUIREMENTS:
- Describe spatial relationships explicitly (e.g., "on the left side of the frame", "in the upper right corner", "moving from left to right")
- Include colors where relevant to understanding (e.g., "red laser line", "blue button")
- Transcribe ALL text overlays, captions, and on-screen text verbatim
- Describe facial expressions and body language when relevant
- Note sound cues if visible (e.g., "person speaking", "tool making noise", "music playing")
- Use clear, concrete language - avoid "this", "that", "here", "there" without context
- Describe what IS happening, not what viewers should do
- For tools and objects, describe them before using pronouns
` : '';

    const timestampInstructions = request.include_timestamps ? `
- Include precise timestamps for every scene or major action (format: MM:SS or H:MM:SS)
- Mark when new scenes begin, when actions change, when new tools appear
` : '';

    const outputFormatInstructions = request.output_format === 'structured' ? `
OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "video_title": "Brief title if discernible",
  "duration": "Total video length (MM:SS format)",
  "scene_count": number,
  "scenes": [
    {
      "timestamp": "0:00-0:45",
      "description": "Detailed description of what's happening",
      "actions": ["action 1", "action 2"],
      "tools_visible": ["tool 1", "tool 2"],
      "text_on_screen": "Exact text shown, or null",
      "spatial_notes": "Spatial relationships if relevant",
      "colors": "Color descriptions if relevant"
    }
  ],
  "key_techniques": ["technique 1", "technique 2"],
  "tools_list": ["complete list of all tools shown"],
  "materials_list": ["all materials used"],
  "safety_notes": ["any safety considerations visible"],
  "summary": "2-3 sentence overall summary"
}

CRITICAL: Return ONLY valid JSON. Do not include any text before or after the JSON object.
` : `
OUTPUT FORMAT: Return a narrative prose description with clear paragraphs.
${request.include_timestamps ? 'Start each major section with timestamps in [MM:SS] format.' : ''}
`;

    return `You are analyzing a YouTube video to create an audio description for accessibility purposes.

VIDEO URL: ${request.url}

DETAIL LEVEL: ${request.detail_level || 'standard'}
${detailLevelInstructions[request.detail_level || 'standard']}

FOCUS: ${request.focus || 'all'}
${focusInstructions[request.focus || 'all']}

${accessibilityInstructions}
${timestampInstructions}
${outputFormatInstructions}

Analyze the video and provide the description according to these requirements.`;
  }

  async execute(args: any): Promise<TextContent[]> {
    try {
      logger.info('Executing gemini_describe_video tool', { 
        url: args.url,
        detail_level: args.detail_level,
        accessibility_mode: args.accessibility_mode,
        output_format: args.output_format
      });

      if (!args.url) {
        throw new McpError('URL is required', 'INVALID_PARAMS');
      }

      // Validate YouTube URL
      if (!args.url.includes('youtube.com') && !args.url.includes('youtu.be')) {
        throw new McpError('Only YouTube URLs are supported', 'INVALID_PARAMS');
      }

      const request: VideoDescriptionRequest = {
        url: args.url,
        detail_level: args.detail_level || 'standard',
        accessibility_mode: args.accessibility_mode !== false, // Default true
        include_timestamps: args.include_timestamps !== false, // Default true
        output_format: args.output_format || 'structured',
        focus: args.focus || 'all'
      };

      const prompt = this.buildAccessibilityPrompt(request);

      // Use Gemini 2.5 Flash for video understanding (best model for this task)
      const response = await this.geminiService.chat({
        message: prompt,
        model: 'gemini-2.5-flash',
        temperature: 0.3, // Lower temperature for more consistent, factual descriptions
        maxTokens: 16000, // Comprehensive descriptions may be lengthy
        grounding: false // Don't use web search for video analysis
      });

      // If structured output requested, try to parse and validate JSON
      if (request.output_format === 'structured') {
        try {
          // Remove markdown code blocks if present
          let cleanedContent = response.content.trim();
          cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          
          const parsed = JSON.parse(cleanedContent);
          
          // Validate basic structure
          if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
            logger.warn('Structured output missing scenes array, returning raw response');
            return createToolResult(true, response.content);
          }

          // Return formatted JSON
          return createToolResult(true, JSON.stringify(parsed, null, 2));
          
        } catch (parseError) {
          logger.warn('Failed to parse structured output as JSON, returning raw response', { 
            error: (parseError as Error).message 
          });
          return createToolResult(true, response.content);
        }
      }

      return createToolResult(true, response.content);

    } catch (error) {
      logger.error('gemini_describe_video tool execution failed', { error });
      
      if (error instanceof McpError) {
        return createToolResult(false, error.message, error);
      }
      
      return createToolResult(false, `Unexpected error: ${(error as Error).message}`, error as Error);
    }
  }
}
