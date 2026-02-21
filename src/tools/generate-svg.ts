import { GeminiService } from '../services/gemini/index.js';
import { GeminiError } from '../utils/error-handler.js';
import logger from '../utils/logger.js';

export interface GenerateSVGRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: 'technical' | 'artistic' | 'minimal' | 'data-viz';
  model?: string;
}

const SYSTEM_PROMPT = `You are an expert SVG developer specializing in creating clean, SIMPLE, scalable vector graphics.
Generate complete, valid SVG code that is self-contained and production-ready.

CRITICAL CONSTRAINTS - MUST FOLLOW:
- Maximum 150 lines of SVG code total
- Prefer simple shapes (rect, circle, ellipse, line, polygon) over complex paths
- Use <text> elements for labels - NEVER attempt to draw text with paths
- Maximum 20 distinct elements (shapes, paths, groups combined)
- Each <path> should have maximum 10 commands (M, L, C, Q, etc.)
- For icons/logos: Use 3-5 simple shapes maximum
- For diagrams: Use rectangles and lines with <text> labels
- For illustrations: Combine 10-15 basic shapes creatively

Technical Requirements:
- Valid SVG with proper viewBox and namespace declaration
- Clean, readable code with proper formatting and indentation
- Use semantic groups (<g>) for logical organization
- Include <title> and <desc> for accessibility
- Use inline CSS within <style> tags when needed
- No external dependencies - all fonts, gradients, patterns inline
- Prefer solid fills over complex gradients
- Use appropriate SVG elements (rect, circle, path, polygon, text, etc.)

EFFICIENCY RULES:
- ONE rectangle is better than a path with 4 lines
- ONE circle is better than a path with arc commands
- ONE <text> element is better than trying to draw letters
- Simple gradients (2-3 stops) are acceptable, complex ones are not
- Reuse elements with <use> and <defs> when possible

CRITICAL OUTPUT FORMAT:
Return ONLY the raw, valid SVG code. Do not wrap it in markdown backticks. Do not include any explanations or conversational text before or after the SVG.`;

export class GenerateSVGTool {
  constructor(private geminiService: GeminiService) {}

  async execute(request: GenerateSVGRequest): Promise<string> {
    const width = request.width || 800;
    const height = request.height || 600;
    const style = request.style || 'technical';

    const styleGuides: Record<string, string> = {
      technical: 'Clean technical diagram style with clear labels, grid-aligned elements, and professional color scheme (blues, greys). Suitable for architecture diagrams, flowcharts, system designs.',
      artistic: 'Creative, visually striking design with gradients, interesting compositions, and artistic flair. Suitable for logos, illustrations, decorative graphics.',
      minimal: 'Minimalist design with simple shapes, limited color palette (2-3 colors max), and plenty of whitespace. Clean, modern aesthetic.',
      'data-viz': 'Data visualization style with clear axes, legends, labels, and appropriate chart types. Professional presentation quality.'
    };

    const prompt = `
Create a SIMPLE, ELEGANT SVG graphic for the following request:

${request.prompt}

Dimensions: ${width}x${height}
Style: ${style} - ${styleGuides[style]}

STRICT CONSTRAINTS:
- Maximum 150 lines of code total
- Maximum 20 elements (shapes + paths + groups)
- Use basic shapes (rect, circle, line) - avoid complex paths
- Use <text> elements for any text - NEVER draw letters with paths
- Each path maximum 10 commands

Generate a complete, production-ready SVG with viewBox="0 0 ${width} ${height}".

Remember: Elegant simplicity beats complex over-engineering. Fewer elements, clearer result.
`.trim();

    logger.info('Generating SVG', {
      style,
      dimensions: `${width}x${height}`,
      model: request.model,
    });

    let response: string;
    try {
      const result = await this.geminiService.chat({
        message: prompt,
        systemPrompt: SYSTEM_PROMPT,
        model: request.model || 'gemini-3-flash-preview',
        maxTokens: 8192,
        grounding: false,
      });
      response = result.content;
    } catch (error) {
      throw new GeminiError(`SVG generation failed: ${(error as Error).message}`);
    }

    // Strip markdown fences and any extra whitespace/text
    let svg = response.trim();
    
    // Remove markdown code blocks
    svg = svg.replace(/^```(?:xml|svg|html)?\n/i, '').replace(/\n```$/i, '');
    
    // If there's still a markdown fence, try more aggressive matching
    const fenceMatch = svg.match(/```(?:svg|xml|html)?\s*([\s\S]+?)```/i);
    if (fenceMatch) {
      svg = fenceMatch[1].trim();
    }
    
    // Remove any leading/trailing whitespace
    svg = svg.trim();

    // Validate SVG
    if (!svg.toLowerCase().includes('<svg') || !svg.toLowerCase().includes('</svg>')) {
      throw new GeminiError('Model did not return valid SVG. Try again or adjust the prompt.');
    }

    return svg;
  }
}
