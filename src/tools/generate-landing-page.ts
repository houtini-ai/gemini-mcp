import { GeminiService } from '../services/gemini/index.js';
import { GeminiError } from '../utils/error-handler.js';
import logger from '../utils/logger.js';

export interface LandingPageRequest {
  brief: string;
  companyName?: string;
  primaryColour?: string;
  style?: 'minimal' | 'bold' | 'corporate' | 'startup';
  sections?: string[];
  model?: string;
}

const SYSTEM_PROMPT = `You are an expert front-end developer specialising in high-converting landing pages.
Generate complete, self-contained HTML with inline CSS and vanilla JavaScript.

Requirements:
- Single HTML file, no external dependencies
- Responsive mobile-first design
- Modern CSS (flexbox/grid, CSS variables for theming)
- Smooth scroll, subtle animations where appropriate
- Semantic HTML5 elements
- Accessible (ARIA labels, contrast ratios)
- No placeholder images — use CSS gradients or SVG shapes instead

Output ONLY the raw HTML. No markdown fences, no explanations.`;

export class GenerateLandingPageTool {
  constructor(private geminiService: GeminiService) {}

  async execute(request: LandingPageRequest): Promise<string> {
    const style = request.style || 'startup';
    const sections = request.sections?.length
      ? request.sections.join(', ')
      : 'hero, features, social proof, call-to-action';

    const prompt = `
Create a landing page for the following brief:

${request.brief}

${request.companyName ? `Company/Product name: ${request.companyName}` : ''}
${request.primaryColour ? `Primary brand colour: ${request.primaryColour}` : ''}
Design style: ${style}
Sections to include: ${sections}

Generate a complete, production-ready single-file HTML landing page.
`.trim();

    logger.info('Generating landing page', {
      style,
      briefLength: request.brief.length,
      model: request.model,
    });

    let response: string;
    try {
      const result = await this.geminiService.chat({
        message: prompt,
        systemPrompt: SYSTEM_PROMPT,
        model: request.model,
        maxTokens: 16384,
        grounding: false,
      });
      response = result.content;
    } catch (error) {
      throw new GeminiError(`Landing page generation failed: ${(error as Error).message}`);
    }

    // Strip markdown fences if model includes them despite instructions
    const fenceMatch = response.match(/```(?:html)?\s*([\s\S]+?)```/i);
    const html = fenceMatch ? fenceMatch[1].trim() : response.trim();

    if (!html.toLowerCase().includes('<!doctype') && !html.toLowerCase().includes('<html')) {
      throw new GeminiError('Model did not return valid HTML. Try again or adjust the brief.');
    }

    return html;
  }
}
