/**
 * Chart & Data Visualization Prompt Enhancement v2.0
 * 
 * Expanded design systems based on influential data visualization pioneers:
 * - Edward Tufte (minimal data-ink)
 * - Cole Nussbaumer Knaflic (strategic highlighting)
 * - Observable/D3.js (interactive exploration)
 * - FiveThirtyEight/The Economist (editorial storytelling)
 * - Financial Times (elegant journalism)
 * - Nature/Science journals (academic rigor)
 * - Bloomberg/Fintech (high-density terminals)
 * - W.E.B. Du Bois (modernist geometry)
 * - IBM Carbon/Tailwind (enterprise UI)
 * 
 * Usage:
 *   const enhanced = enhanceChartPrompt(basePrompt, { 
 *     colorScheme: 'storytelling', 
 *     chartType: 'bar' 
 *   });
 */

export interface ChartEnhancementOptions {
  colorScheme?: 'professional' | 'editorial' | 'scientific' | 'minimal' | 'dark' | 'storytelling' | 'financial' | 'terminal' | 'modernist';
  chartType?: 'line' | 'bar' | 'scatter' | 'area' | 'pie' | 'network' | 'heatmap' | 'treemap';
  emphasis?: 'data-ink' | 'storytelling' | 'exploration' | 'presentation';
}

const COLOR_SYSTEMS = {
  professional: {
    background: '#ffffff',
    primary: ['#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#ca8a04'],
    neutral: ['#0f172a', '#475569', '#94a3b8', '#cbd5e1', '#f1f5f9'],
    accent: ['#06b6d4', '#10b981', '#f59e0b'],
    text: '#0f172a',
    gridlines: '#e5e7eb',
    axis: '#6b7280',
    description: 'IBM Carbon, Tailwind-inspired professional palette'
  },
  editorial: {
    background: '#ffffff',
    primary: ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'],
    neutral: ['#2b2d42', '#8d99ae', '#edf2f4'],
    accent: ['#ff6b6b', '#4ecdc4'],
    text: '#2b2d42',
    gridlines: '#edf2f4',
    axis: '#8d99ae',
    description: 'FiveThirtyEight, Economist-inspired editorial colours'
  },
  scientific: {
    background: '#ffffff',
    primary: ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'],
    neutral: ['#1a1a1a', '#4a4a4a', '#8a8a8a', '#cacaca', '#f0f0f0'],
    accent: ['#00d9ff', '#7209b7'],
    text: '#1a1a1a',
    gridlines: '#e5e5e5',
    axis: '#4a4a4a',
    description: 'Nature, Science journal-inspired academic palette'
  },
  minimal: {
    background: '#fafafa',
    primary: ['#000000', '#404040', '#737373', '#a6a6a6', '#d9d9d9'],
    neutral: ['#fafafa', '#f5f5f5', '#e5e5e5'],
    accent: ['#2563eb', '#dc2626'],
    text: '#000000',
    gridlines: '#f5f5f5',
    axis: '#737373',
    description: 'Edward Tufte-inspired minimal data-ink approach'
  },
  dark: {
    background: '#0a0a0a',
    primary: ['#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#fbbf24'],
    neutral: ['#0a0a0a', '#1f1f1f', '#404040', '#737373', '#a6a6a6'],
    accent: ['#22d3ee', '#34d399'],
    text: '#ffffff',
    gridlines: '#1f1f1f',
    axis: '#737373',
    description: 'Observable dark mode, GitHub dark-inspired'
  },
  storytelling: {
    background: '#ffffff',
    primary: ['#bfbfbf', '#999999', '#737373'],  // Base data (muted)
    neutral: ['#595959', '#d9d9d9', '#f2f2f2'],
    accent: ['#005a9c', '#f26c23', '#c00000'],  // Highlight colors (pick one)
    text: '#262626',
    gridlines: '#f2f2f2',
    axis: '#d9d9d9',
    description: 'Cole Nussbaumer Knaflic - strategic highlighting with pre-attentive processing'
  },
  financial: {
    background: '#fff1e5',  // Famous FT Pink
    primary: ['#0f5499', '#0d7680', '#cc0000', '#5a298c', '#d9a300'],
    neutral: ['#33302e', '#e9decf'],
    accent: ['#0f5499', '#cc0000'],
    text: '#33302e',
    gridlines: '#ffffff',  // White gridlines on pink background
    axis: '#33302e',
    description: 'Financial Times - elegant editorial with signature salmon background'
  },
  terminal: {
    background: '#000000',
    primary: ['#00e3d1', '#34e05b', '#ff2b6d', '#ff8e15', '#fdee00'],  // Electric/neon
    neutral: ['#111111', '#2a2a2a', '#333333'],
    accent: ['#00e3d1', '#ff2b6d'],
    text: '#ffffff',
    gridlines: '#2a2a2a',
    axis: '#aaaaaa',
    description: 'Bloomberg/Fintech - high-density terminal with electric neon accents'
  },
  modernist: {
    background: '#e5ded0',  // Modern parchment/manila
    primary: ['#dc143c', '#009b77', '#ffd700', '#000080', '#654321'],  // Bold primary colors
    neutral: ['#1a1a1a', '#e5ded0'],
    accent: ['#dc143c', '#009b77'],
    text: '#1a1a1a',
    gridlines: 'transparent',  // No gridlines in modernist
    axis: '#1a1a1a',
    description: 'W.E.B. Du Bois - bold geometric modernism with stark contrasts'
  }
} as const;

const TYPOGRAPHY_SYSTEMS = {
  professional: {
    title: 'Inter or SF Pro',
    labels: 'Inter or Roboto',
    data: 'JetBrains Mono',
    sizes: { title: '18-24px', subtitle: '14-16px', labels: '11-13px', annotations: '10-12px' },
    weights: { title: 600, labels: 500, data: 400 }
  },
  editorial: {
    title: 'Playfair Display',
    labels: 'Franklin Gothic',
    data: 'Courier New',
    sizes: { title: '24-32px', subtitle: '16-20px', labels: '12-14px', annotations: '11-13px' },
    weights: { title: 700, labels: 400, data: 400 }
  },
  scientific: {
    title: 'Arial',
    labels: 'Arial',
    data: 'Monaco',
    sizes: { title: '16-20px', subtitle: '13-15px', labels: '10-12px', annotations: '9-11px' },
    weights: { title: 600, labels: 400, data: 400 }
  },
  storytelling: {
    title: 'Inter or Helvetica Neue',
    labels: 'Inter or Arial',
    data: 'Inter',
    sizes: { title: '20-26px', subtitle: '14-16px', labels: '11-13px', annotations: '10-12px' },
    weights: { title: 700, labels: 400, data: 700 }  // Bold for highlighted data
  },
  financial: {
    title: 'Merriweather or Playfair Display',  // Serif for narrative
    labels: 'Open Sans or Fira Sans',  // Sans for data
    data: 'Open Sans',
    sizes: { title: '22-28px', subtitle: '14-18px', labels: '11-13px', annotations: '10-12px' },
    weights: { title: 600, labels: 400, data: 400 }
  },
  terminal: {
    title: 'Inter',
    labels: 'Roboto Mono or IBM Plex Mono',  // Monospace for precision
    data: 'JetBrains Mono',
    sizes: { title: '16-22px', subtitle: '13-16px', labels: '10-12px', annotations: '9-11px' },
    weights: { title: 700, labels: 400, data: 400 }
  },
  modernist: {
    title: 'Jost or Futura',  // Geometric sans
    labels: 'Jost or Public Sans',
    data: 'Jost',
    sizes: { title: '24-32px', subtitle: '16-20px', labels: '12-14px', annotations: '11-13px' },
    weights: { title: 700, labels: 600, data: 700 }
  }
} as const;

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
} as const;

const SCHEME_SPECIFIC_RULES = {
  storytelling: `
STORYTELLING-SPECIFIC RULES (Cole Nussbaumer Knaflic):
• NO LEGENDS: Direct label lines/bars at endpoints using same colour as data
• ACTIONABLE TITLES: Title must be a sentence explaining the takeaway (e.g., "Sales dipped in Q3")
  - Highlight key words (e.g., "dipped") in the accent colour
• Y-AXIS: Remove Y-axis line completely; keep solid X-axis line only
• GRIDLINES: No vertical gridlines; horizontal gridlines extremely faint (#f2f2f2) or removed
• COLOUR STRATEGY: Everything defaults to muted grey (#bfbfbf, #999999)
  - Only ONE data series/point highlighted in bold accent (#005a9c, #f26c23, or #c00000)
• PRE-ATTENTIVE PROCESSING: Design so viewer knows where to look instantly
  `,
  financial: `
FINANCIAL-SPECIFIC RULES (Financial Times):
• TOP BORDER: Include solid 2px border at top of chart (#33302e)
• GRIDLINES: Thin horizontal lines in WHITE (#ffffff) or darker pink (#e9decf) behind data
• AXIS LINES: Remove Y and X axis bounding lines; let gridlines define space
• TITLE PLACEMENT: Top-left aligned; large serif title + sans-serif subtitle
• BACKGROUND: Always use FT Pink (#fff1e5) - reduces glare, distinctive editorial feel
  `,
  terminal: `
TERMINAL-SPECIFIC RULES (Bloomberg/Fintech):
• ZERO FILL: Avoid filled areas unless 10-15% opacity; use crisp 2px neon lines
• AXIS PLACEMENT: Y-axis labels on RIGHT side (closer to recent data in time-series)
• CROSSHAIRS: Include subtle crosshairs/vertical tooltip line (#444444 dashed)
• BORDERS: Thin 1px solid border (#333333) around entire chart area
• HIGH CONTRAST: Electric neon colours on absolute black for OLED screens
  `,
  modernist: `
MODERNIST-SPECIFIC RULES (W.E.B. Du Bois):
• OUTLINES: Every shape has crisp 1-2px solid #1a1a1a stroke
• NO GRADIENTS/OPACITY: Colours must be 100% solid and opaque
• NO GRIDLINES: Use direct data labels on shapes instead
• TITLES: Centered, all-caps, generous letter-spacing (0.05em)
• GEOMETRIC: Bold, poster-like blocks; flat high-contrast colours
  `
} as const;

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
  area: `
    • Stack order matters (most important on bottom)
    • 60-80% opacity to show overlaps
    • Clear boundaries between areas
    • Consider streamgraph for organic feel
  `,
  heatmap: `
    • Sequential colour scale for continuous data
    • Diverging scale for data with meaningful midpoint
    • Include colour legend with numerical scale
    • Cell annotations for key values
  `,
  network: `
    • Node size represents importance
    • Edge weight shows relationship strength
    • Use force-directed or hierarchical layout
    • Label key nodes only to avoid clutter
  `,
  treemap: `
    • Colour encodes category or metric
    • Size encodes primary value
    • Border weight shows hierarchy level
    • Include parent labels for context
  `
} as const;

/**
 * Enhance a chart prompt with professional design system
 */
export function enhanceChartPrompt(
  basePrompt: string,
  options: ChartEnhancementOptions = {}
): string {
  const {
    colorScheme = 'professional',
    chartType = 'bar',
    emphasis = 'data-ink'
  } = options;

  const colors = COLOR_SYSTEMS[colorScheme];
  
  // Map color scheme to typography system
  const typographyKey = (['storytelling', 'financial', 'terminal', 'modernist'].includes(colorScheme))
    ? colorScheme as keyof typeof TYPOGRAPHY_SYSTEMS
    : (colorScheme === 'editorial' ? 'editorial' :
       colorScheme === 'scientific' ? 'scientific' : 'professional');
  
  const typography = TYPOGRAPHY_SYSTEMS[typographyKey];
  const principles = DESIGN_PRINCIPLES[emphasis];
  const specifics = CHART_SPECIFICS[chartType] || '';
  
  // Include scheme-specific rules if available
  const schemeRules = SCHEME_SPECIFIC_RULES[colorScheme as keyof typeof SCHEME_SPECIFIC_RULES] || '';

  return `${basePrompt}

PROFESSIONAL DESIGN SYSTEM:
Style: ${colors.description}

COLOUR PALETTE:
Background: ${colors.background}
Primary data: ${colors.primary.join(', ')}
Neutral/greys: ${colors.neutral.join(', ')}  
Accent highlights: ${colors.accent.join(', ')}
Text: ${colors.text}
Gridlines: ${colors.gridlines}
Axis: ${colors.axis}

TYPOGRAPHY:
• Titles: ${typography.title} at ${typography.sizes.title}, font-weight ${typography.weights.title}
• Axis labels: ${typography.labels} at ${typography.sizes.labels}, font-weight ${typography.weights.labels}
• Data labels: ${typography.data} at ${typography.sizes.labels}, font-weight ${typography.weights.data}
• Annotations: ${typography.labels} at ${typography.sizes.annotations}, font-weight 400

DESIGN PRINCIPLES:${principles}
${schemeRules}
CHART-SPECIFIC GUIDELINES:${specifics}

LAYOUT & SPACING:
• Margins: 40-60px (top/bottom), 50-80px (left/right) for axis labels
• Title placement: top-left or centered, 20-30px from chart area
• Legend: top-right or bottom, with 16px item spacing (if legends are used)
• Grid alignment: aligned to data ticks

AVOID:
❌ 3D effects, shadows, or gradients on data elements (unless modernist scheme)
❌ Decorative borders, backgrounds, or textures
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
export function getChartColorPalette(scheme: keyof typeof COLOR_SYSTEMS) {
  return COLOR_SYSTEMS[scheme];
}

/**
 * Get typography system for a specific scheme
 */
export function getChartTypography(scheme: keyof typeof COLOR_SYSTEMS) {
  const typographyKey = (['storytelling', 'financial', 'terminal', 'modernist'].includes(scheme))
    ? scheme as keyof typeof TYPOGRAPHY_SYSTEMS
    : (scheme === 'editorial' ? 'editorial' :
       scheme === 'scientific' ? 'scientific' : 'professional');
  return TYPOGRAPHY_SYSTEMS[typographyKey];
}

/**
 * Validate chart prompt for common anti-patterns
 */
export function validateChartPrompt(prompt: string): {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const lower = prompt.toLowerCase();

  if (lower.includes('3d') || lower.includes('shadow')) {
    warnings.push('3D effects and shadows reduce data clarity');
    suggestions.push('Use flat design with subtle depth cues instead');
  }

  if (lower.includes('gradient') && lower.includes('data')) {
    warnings.push('Gradients on data elements can be distracting');
    suggestions.push('Reserve gradients for backgrounds only, if at all');
  }

  if (!lower.includes('color') && !lower.includes('colour')) {
    suggestions.push('Consider specifying a professional colour palette');
  }

  if (!lower.includes('font') && !lower.includes('typography')) {
    suggestions.push('Specify typography for more professional results');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    suggestions
  };
}