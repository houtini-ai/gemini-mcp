/**
 * Professional Chart & Data Visualization Design System
 * 
 * Based on research from Observable, D3.js, Information is Beautiful,
 * and modern dashboard design systems.
 * 
 * Purpose: Enhance prompts with professional design principles to avoid
 * generic AI-generated aesthetics.
 */

export interface ChartStyleOptions {
  colorScheme?: 'professional' | 'editorial' | 'scientific' | 'minimal' | 'dark';
  chartType?: 'line' | 'bar' | 'scatter' | 'area' | 'pie' | 'network' | 'heatmap' | 'treemap';
  emphasis?: 'data-ink' | 'storytelling' | 'exploration' | 'presentation';
}

/**
 * Professional color palettes based on industry standards
 */
const COLOR_SYSTEMS = {
  professional: {
    primary: ['#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#ca8a04'],
    neutral: ['#0f172a', '#475569', '#94a3b8', '#cbd5e1', '#f1f5f9'],
    accent: ['#06b6d4', '#10b981', '#f59e0b'],
    description: 'IBM Carbon, Tailwind-inspired professional palette'
  },
  editorial: {
    primary: ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'],
    neutral: ['#2b2d42', '#8d99ae', '#edf2f4'],
    accent: ['#ff6b6b', '#4ecdc4'],
    description: 'FiveThirtyEight, Economist-inspired editorial colours'
  },
  scientific: {
    primary: ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'],
    neutral: ['#1a1a1a', '#4a4a4a', '#8a8a8a', '#cacaca', '#f0f0f0'],
    accent: ['#00d9ff', '#7209b7'],
    description: 'Nature, Science journal-inspired academic palette'
  },
  minimal: {
    primary: ['#000000', '#404040', '#737373', '#a6a6a6', '#d9d9d9'],
    neutral: ['#fafafa', '#f5f5f5', '#e5e5e5'],
    accent: ['#2563eb', '#dc2626'],
    description: 'Edward Tufte-inspired minimal data-ink approach'
  },
  dark: {
    primary: ['#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#fbbf24'],
    neutral: ['#0a0a0a', '#1f1f1f', '#404040', '#737373', '#a6a6a6'],
    accent: ['#22d3ee', '#34d399'],
    description: 'Observable dark mode, GitHub dark-inspired'
  }
};

/**
 * Typography systems based on research findings
 */
const TYPOGRAPHY_SYSTEMS = {
  professional: {
    title: 'Inter or SF Pro (system-ui fallback)',
    labels: 'Inter or Roboto',
    data: 'JetBrains Mono or SF Mono (monospace)',
    sizes: {
      title: '18-24px',
      subtitle: '14-16px',
      labels: '11-13px',
      annotations: '10-12px'
    }
  },
  editorial: {
    title: 'Playfair Display or Georgia',
    labels: 'Inter or Franklin Gothic',
    data: 'Courier New or monospace',
    sizes: {
      title: '24-32px',
      subtitle: '16-20px', 
      labels: '12-14px',
      annotations: '11-13px'
    }
  },
  scientific: {
    title: 'Arial or Helvetica',
    labels: 'Arial or Helvetica',
    data: 'Monaco or Consolas',
    sizes: {
      title: '16-20px',
      subtitle: '13-15px',
      labels: '10-12px',
      annotations: '9-11px'
    }
  }
};

/**
 * Design principles based on best practices
 */
const DESIGN_PRINCIPLES = {
  'data-ink': `
    • Maximize data-ink ratio (Tufte principle)
    • Remove chartjunk and unnecessary decoration
    • Use subtle gridlines (1px, 10-15% opacity)
    • Direct labeling instead of legends when possible
    • Minimal borders and backgrounds
  `,
  'storytelling': `
    • Clear visual hierarchy with focal points
    • Progressive disclosure of complexity
    • Annotations and callouts for key insights
    • Contextual reference lines or benchmarks
    • Narrative flow through chart elements
  `,
  'exploration': `
    • Rich interactive affordances suggested visually
    • Tooltip regions clearly defined
    • Hover states indicated subtly
    • Multiple layers of detail accessibility
    • Clear filtering and selection states
  `,
  'presentation': `
    • High contrast for projector/screen visibility
    • Large, readable text (minimum 12px)
    • Strong visual anchors and structure
    • Balanced whitespace and breathing room
    • Professional polish without decoration
  `
};

/**
 * Chart-specific best practices
 */
const CHART_SPECIFICS = {
  line: `
    • Line weight: 2-3px for primary, 1-2px for secondary
    • Point markers only at data points, not everywhere
    • Differentiate series with both colour AND line style
    • Y-axis starts at 0 unless justified otherwise
  `,
  bar: `
    • Bar spacing: 10-30% of bar width
    • Sorted by value unless categorical order matters
    • Horizontal bars for long labels
    • Subtle rounded corners (2-4px) for modern feel
  `,
  scatter: `
    • Point size: 4-8px diameter
    • 30-50% opacity for overlapping points
    • Trend lines should be subtle (dashed, lighter colour)
    • Legend shows both shape AND colour
  `,
  pie: `
    • Maximum 5-7 slices (combine small values into "Other")
    • Start at 12 o'clock, arrange clockwise by size
    • Consider donut chart (60-70% inner radius)
    • Direct slice labeling with values
  `,
  heatmap: `
    • Sequential colour scale for continuous data
    • Diverging scale for data with meaningful midpoint
    • Include colour legend with numerical scale
    • Cell annotations for key values
  `
};

/**
 * Generate professional design prompt enhancement
 */
export function enhanceChartPrompt(
  basePrompt: string,
  options: ChartStyleOptions = {}
): string {
  const {
    colorScheme = 'professional',
    chartType = 'bar',
    emphasis = 'data-ink'
  } = options;

  const colors = COLOR_SYSTEMS[colorScheme];
  const typography = TYPOGRAPHY_SYSTEMS[
    colorScheme === 'editorial' ? 'editorial' :
    colorScheme === 'scientific' ? 'scientific' : 'professional'
  ];
  const principles = DESIGN_PRINCIPLES[emphasis];
  const specifics = CHART_SPECIFICS[chartType] || '';

  return `${basePrompt}

PROFESSIONAL DESIGN SYSTEM:
Style: ${colors.description}

COLOUR PALETTE:
Primary: ${colors.primary.join(', ')}
Neutral greys: ${colors.neutral.join(', ')}  
Accent: ${colors.accent.join(', ')}

TYPOGRAPHY:
• Titles: ${typography.title} at ${typography.sizes.title}, font-weight 600
• Axis labels: ${typography.labels} at ${typography.sizes.labels}, font-weight 500
• Data labels: ${typography.data} at ${typography.sizes.labels}
• Annotations: ${typography.labels} at ${typography.sizes.annotations}, font-weight 400

DESIGN PRINCIPLES:${principles}

CHART-SPECIFIC GUIDELINES:${specifics}

LAYOUT & SPACING:
• Margins: 40-60px (top/bottom), 50-80px (left/right) for axis labels
• Title placement: top-left or centered, 20-30px from chart area
• Legend: top-right or bottom, with 16px item spacing
• Grid: subtle (1px, #000 at 8-12% opacity), aligned to data ticks

AVOID:
❌ 3D effects, shadows, or gradients on data elements
❌ Decorative borders, backgrounds, or textures
❌ Bright, saturated neon colours
❌ Comic Sans, Papyrus, or novelty fonts
❌ Unnecessary chart elements (chartjunk)
❌ Default chart library aesthetics (Excel, Google Sheets look)

ACHIEVE:
✓ Clean, confident, professional presentation
✓ Accessibility (WCAG AA contrast ratios minimum)
✓ Print-ready quality (300 DPI equivalent)
✓ Timeless design that won't look dated
✓ Focus on data clarity and insight`;
}

/**
 * Get color palette for a specific scheme
 */
export function getColorPalette(scheme: keyof typeof COLOR_SYSTEMS) {
  return COLOR_SYSTEMS[scheme];
}

/**
 * Validate chart design prompt for common issues
 */
export function validateChartPrompt(prompt: string): {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for anti-patterns
  if (prompt.toLowerCase().includes('3d') || prompt.toLowerCase().includes('shadow')) {
    warnings.push('3D effects and shadows reduce data clarity');
    suggestions.push('Use flat design with subtle depth cues instead');
  }

  if (prompt.toLowerCase().includes('gradient') && prompt.includes('data')) {
    warnings.push('Gradients on data elements can be distracting');
    suggestions.push('Reserve gradients for backgrounds only, if at all');
  }

  if (!prompt.toLowerCase().includes('color') && !prompt.toLowerCase().includes('colour')) {
    suggestions.push('Consider specifying a professional colour palette');
  }

  if (!prompt.toLowerCase().includes('font') && !prompt.toLowerCase().includes('typography')) {
    suggestions.push('Specify typography for more professional results');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    suggestions
  };
}
