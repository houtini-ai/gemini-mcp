/**
 * Prompt Assistant Tool - Modular Handler
 * 
 * Clean architecture for easy expansion:
 * 1. Domain modules live in ./prompt-library/
 * 2. Each domain exports enhance*, get*, validate* functions
 * 3. Add new domains by importing and adding cases
 */

import { enhanceChartPrompt, getChartColorPalette, validateChartPrompt } from './prompt-library/index.js';

export interface PromptAssistantArgs {
  request_type: 'chart_design' | 'optimize_chart' | 'validate_chart' | 'get_palette';
  // Chart-specific options
  color_scheme?: 'professional' | 'editorial' | 'scientific' | 'minimal' | 'dark';
  chart_type?: 'line' | 'bar' | 'scatter' | 'area' | 'pie' | 'network' | 'heatmap' | 'treemap';
  emphasis?: 'data-ink' | 'storytelling' | 'exploration' | 'presentation';
  // For optimization
  current_prompt?: string;
}

/**
 * Main handler - routes to appropriate domain module
 */
export async function handlePromptAssistant(args: PromptAssistantArgs): Promise<string> {
  const { request_type } = args;

  // CHART DESIGN ENHANCEMENT
  if (request_type === 'chart_design') {
    const basePrompt = args.current_prompt || 'Professional data visualization';
    const enhanced = enhanceChartPrompt(basePrompt, {
      colorScheme: args.color_scheme,
      chartType: args.chart_type,
      emphasis: args.emphasis
    });

    return `# Enhanced Chart Design Prompt

${enhanced}

---

**USAGE:**
\`\`\`javascript
Use gemini:generate_image with:
  prompt: "${enhanced.slice(0, 200)}..."
  aspectRatio: "16:9"
\`\`\`

**CUSTOMIZE:**
• Try different \`color_scheme\`: professional, editorial, scientific, minimal, dark
• Adjust \`chart_type\` for specifics: line, bar, scatter, pie, heatmap
• Set \`emphasis\` for audience: data-ink, storytelling, exploration, presentation`;
  }

  // OPTIMIZE EXISTING CHART PROMPT
  if (request_type === 'optimize_chart') {
    if (!args.current_prompt) {
      return 'Error: current_prompt required for optimization';
    }

    const validation = validateChartPrompt(args.current_prompt);
    const enhanced = enhanceChartPrompt(args.current_prompt, {
      colorScheme: args.color_scheme,
      chartType: args.chart_type,
      emphasis: args.emphasis
    });

    let response = `# Chart Prompt Optimization

**Original Prompt:**
${args.current_prompt}

`;

    if (validation.warnings.length > 0) {
      response += `**⚠️ Warnings:**\n`;
      validation.warnings.forEach(w => response += `• ${w}\n`);
      response += `\n`;
    }

    if (validation.suggestions.length > 0) {
      response += `**💡 Suggestions:**\n`;
      validation.suggestions.forEach(s => response += `• ${s}\n`);
      response += `\n`;
    }

    response += `**✨ Optimized Prompt:**\n${enhanced}`;
    
    return response;
  }

  // VALIDATE CHART PROMPT
  if (request_type === 'validate_chart') {
    if (!args.current_prompt) {
      return 'Error: current_prompt required for validation';
    }

    const validation = validateChartPrompt(args.current_prompt);

    let response = `# Chart Prompt Validation

**Prompt:** ${args.current_prompt}

**Status:** ${validation.valid ? '✅ Looks good' : '⚠️ Issues found'}

`;

    if (validation.warnings.length > 0) {
      response += `\n**Warnings:**\n`;
      validation.warnings.forEach(w => response += `• ${w}\n`);
    }

    if (validation.suggestions.length > 0) {
      response += `\n**Suggestions:**\n`;
      validation.suggestions.forEach(s => response += `• ${s}\n`);
    }

    return response;
  }

  // GET COLOR PALETTE
  if (request_type === 'get_palette') {
    const scheme = args.color_scheme || 'professional';
    const palette = getChartColorPalette(scheme);

    return `# ${scheme.charAt(0).toUpperCase() + scheme.slice(1)} Color Palette

**Description:** ${palette.description}

**Primary Colors:**
${palette.primary.map(c => `• ${c}`).join('\n')}

**Neutral Grays:**
${palette.neutral.map(c => `• ${c}`).join('\n')}

**Accent Colors:**
${palette.accent.map(c => `• ${c}`).join('\n')}

**Usage in Prompt:**
"Use professional colour palette: primary ${palette.primary.slice(0, 3).join(', ')}; neutral greys ${palette.neutral[0]} to ${palette.neutral[palette.neutral.length - 1]}"

**All Available Schemes:**
• professional - IBM Carbon, Tailwind-inspired
• editorial - FiveThirtyEight, Economist-inspired
• scientific - Nature, Science journal-inspired
• minimal - Edward Tufte data-ink approach
• dark - Observable, GitHub dark mode`;
  }

  return `Unknown request_type: ${request_type}

Available request types:
• chart_design - Get professional chart design system
• optimize_chart - Improve existing chart prompt
• validate_chart - Check prompt for anti-patterns
• get_palette - View color scheme details`;
}
