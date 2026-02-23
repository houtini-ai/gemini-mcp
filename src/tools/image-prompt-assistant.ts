import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { enhanceChartPrompt, getChartColorPalette, validateChartPrompt } from './prompt-library/index.js';

/**
 * Build the guide text for the "template" request type.
 */
function templateGuide(use_case?: string): string {
  let useCaseBlock = '';

  if (use_case === 'portrait') {
    useCaseBlock = `
### Portrait Photography Template

**Structure:**
"[Shot type] portrait of [subject description], [location/environment], lighting is [lighting type], shot on [camera/film], [aperture], [color grade]"

**Example:**
"A close-up portrait of an elderly fisherman with a weathered face and thick grey beard, wearing a yellow raincoat. Standing on a rainy dock in Norway. Lighting is soft overcast diffused light. Shot on Kodak Portra 400, 85mm lens, f/1.8 aperture for blurry ocean background. Desaturated with cool blue tones."

**Key Variables:**
• **Shot Types:** Close-up, medium, wide, extreme close-up, environmental
• **Lighting:** Golden hour, rim lighting, chiaroscuro, soft diffused, dramatic
• **Lenses:** 50mm (natural), 85mm (flattering), 100mm (compressed)
• **Aperture:** f/1.2-2.8 (bokeh), f/5.6-8 (balanced), f/11+ (sharp background)
• **Film Stock:** Kodak Portra 400 (warm skin), Fuji Pro 400H (cool), Ilford HP5 (B&W)

**Common Mistakes to Avoid:**
✗ "Beautiful person" → ✓ "Person with defined cheekbones and expressive eyes"
✗ "Good lighting" → ✓ "Soft window light from camera left creating gentle shadows"
✗ "Professional photo" → ✓ "Shot on medium format digital, 80mm lens, f/2.8"
`;
  } else if (use_case === 'product') {
    useCaseBlock = `
### Product Photography Template

**Structure:**
"[Product] placed on [surface], surrounded by [props], lighting is [studio setup], [camera angle], [resolution focus]"

**Example:**
"A luxury perfume bottle made of amber glass placed on rough dark slate rock. Surrounded by splashes of water and white jasmine flowers. Lighting is dramatic rim lighting to highlight glass contours, with soft fill light from front. Macro photography, f/2.8, extremely sharp focus on brand label, 8k resolution textures."

**Key Variables:**
• **Surfaces:** Slate, marble, wood grain, brushed metal, white seamless
• **Props:** Seasonal elements, brand-relevant items, texture contrast
• **Lighting:** Rim (outline), backlighting (glow), soft diffused (flattering)
• **Angles:** 45° (dynamic), straight-on (editorial), overhead flat lay
• **Focus:** Macro (extreme detail), selective focus (depth), full sharp

**Composition Rules:**
• Rule of thirds for dynamic placement
• Negative space for luxury/minimalism
• Depth layers (foreground, product, background)
• Color harmony (complementary or analogous)
`;
  } else if (use_case === 'cinematic') {
    useCaseBlock = `
### Cinematic Concept Art Template

**Structure:**
"[View type] of [environment] featuring [key element], style is [art style], lighting is [atmospheric], [color palette], [render engine]"

**Example:**
"Wide establishing shot of futuristic cyberpunk favela built vertically into massive canyon. Neon signs in Japanese illuminate fog. Lone cyborg figure on ledge in foreground looking down. Cinematic concept art, matte painting style. Volumetric blue and pink neon mixed with deep shadows. Unreal Engine 5 render, hyper-detailed, dystopian atmosphere."

**Key Variables:**
• **Views:** Establishing wide, dramatic low angle, hero shot, aerial
• **Atmosphere:** Volumetric fog, god rays, dust particles, haze
• **Time:** Golden hour, blue hour, midday harsh, night illuminated
• **Color Theory:** Teal/orange (blockbuster), monochrome, desaturated, neon
• **Render:** Unreal Engine 5, Octane, Blender Cycles, photorealistic

**Mood Keywords:**
• Epic: "Towering," "vast," "monumental," "awe-inspiring"
• Dystopian: "Gritty," "abandoned," "decay," "harsh lighting"
• Fantasy: "Ethereal," "magical," "mysterious," "enchanted"
`;
  }

  if (!use_case) {
    useCaseBlock = `
### Universal Template (All Use Cases)

**Basic Structure:**
"[Medium] showing [subject] [action] in [environment], [lighting description], [technical camera specs], [style/aesthetic]"

**Example Breakdown:**

1. **Medium:** Photography, oil painting, 3D render, watercolor, vector art
2. **Subject:** Be specific - age, clothing texture, expression
3. **Action:** Active verbs - "sipping," "gazing," "running through"
4. **Environment:** Specific location with texture details
5. **Lighting:** See lighting_guide for full options
6. **Technical:** Camera, lens, aperture, film stock
7. **Style:** Film noir, cyberpunk, minimalist, vintage

**Quick Reference:**
• More words = More control (but diminishing returns after ~75 words)
• Natural sentences > keyword lists
• Specific nouns > vague adjectives
• Technical terms signal photorealism intent
`;
  }

  return `# Image Generation Template Builder

${use_case ? `## Specialized Template: ${use_case.toUpperCase()}` : '## Universal Template Structure'}

**Framework:** [Medium] + [Subject/Action] + [Environment] + [Lighting] + [Camera/Technical] + [Style/Aesthetic]

${useCaseBlock}

**Next Steps:**
• Use \`gemini_prompt_assistant request_type="lighting_guide"\` for lighting options
• Use \`gemini_prompt_assistant request_type="optimize_prompt"\` with your draft
• Use \`gemini_prompt_assistant request_type="troubleshoot"\` if results aren't matching`;
}

const LIGHTING_GUIDE = `# Comprehensive Lighting Guide

## Decision Tree: Choose Lighting by Mood

**DRAMATIC/INTENSE** → Chiaroscuro, rim lighting, harsh directional
**ROMANTIC/WARM** → Golden hour, soft diffused, candlelight
**MYSTERIOUS/MOODY** → Low-key, volumetric fog, blue hour
**PROFESSIONAL/CLEAN** → Softbox studio, even lighting, no shadows
**EPIC/CINEMATIC** → God rays, volumetric, backlighting

## Complete Lighting Techniques

### Golden Hour
**Effect:** Warm, soft, low-angle sun, long shadows, romantic glow
**Best For:** Portraits, travel, outdoor scenes
**Keywords:** "Golden hour sunlight," "warm glow," "soft directional light"
**Technical:** Color temp 3000-4000K, shoot 1hr before sunset/after sunrise

### Blue Hour
**Effect:** Cool twilight, melancholic, serene, deep blue sky
**Best For:** Cityscapes, moody atmospheric shots
**Keywords:** "Blue hour twilight," "cool ambient light," "dusk atmosphere"

### Chiaroscuro (High Contrast)
**Effect:** Dramatic light/dark contrast, Renaissance painting style
**Best For:** Film noir, dramatic portraits, mystery
**Keywords:** "Chiaroscuro lighting," "high contrast shadows," "dramatic light"

### Rim Lighting (Backlit)
**Effect:** Light outline around subject, separates from background
**Best For:** Hero shots, silhouettes, atmospheric separation
**Keywords:** "Rim lit," "backlit," "edge lighting," "halo effect"

### Volumetric / God Rays
**Effect:** Visible light beams through fog/dust/smoke
**Best For:** Epic fantasy, forests, atmospheric drama
**Keywords:** "Volumetric lighting," "god rays," "light shafts," "beams cutting through mist"

### Softbox / Diffused Studio
**Effect:** Even, shadowless, flattering, professional
**Best For:** Headshots, beauty, product photography
**Keywords:** "Soft diffused studio lighting," "even illumination," "no harsh shadows"

### Hard / Harsh Light
**Effect:** Sharp shadows, high contrast, edgy
**Best For:** Fashion, street photography, graphic looks
**Keywords:** "Harsh direct sunlight," "hard shadows," "high noon light"

### Practical Lighting (In-Scene Sources)
**Effect:** Light from objects in frame (lamps, neon, screens)
**Best For:** Cinematic narrative, moody interiors
**Keywords:** "Lit by neon signs," "practical lamp lighting," "ambient screen glow"

### Candlelight / Warm Interior
**Effect:** Intimate, flickering, warm yellow glow
**Best For:** Romantic scenes, cozy atmosphere
**Keywords:** "Candlelit," "warm flickering light," "soft amber glow"

## Combination Techniques

**Three-Point Lighting (Studio Standard):**
"Studio three-point lighting with key light from camera left, fill light from right at half intensity, and rim light from behind"

**Natural + Fill:**
"Natural window light from left with subtle fill reflector to soften shadows"

**Mixed Temperatures:**
"Warm tungsten interior lights contrasting with cool blue exterior daylight through windows"

## Common Mistakes

✗ "Good lighting" → Too vague
✓ "Soft overhead diffused light creating gentle shadows under cheekbones"

✗ "Dramatic" → Subjective
✓ "Chiaroscuro lighting with single hard source from camera right"

✗ Conflicting lights → "Silhouette with front lighting"
✓ Pick one primary source direction`;

const COLOR_GUIDE = `# Color Grading & Palette Guide

## Color Theory for AI Generation

### Popular Film Color Grades

**Teal and Orange (Hollywood Blockbuster)**
• Effect: Warm skin tones pop against cool backgrounds
• Use: Action, commercial, modern cinematic
• Keywords: "Teal and orange color grade," "orange skin tones with cyan background"

**Monochromatic**
• Effect: Variations of single hue, artistic unity
• Use: Conceptual art, editorial, moody pieces
• Keywords: "Monochromatic crimson palette," "variations of deep blue"

**Pastel / High-Key**
• Effect: Light, airy, low contrast, desaturated
• Use: Wes Anderson style, dreamy, vintage
• Keywords: "Pastel color palette," "high-key lighting," "soft muted tones"

**Desaturated / Muted**
• Effect: Gritty, realistic, subdued
• Use: War photography, documentary, somber moods
• Keywords: "Desaturated colors," "muted palette," "low saturation"

**Neon / Synthwave**
• Effect: High saturation purples, pinks, cyans
• Use: Cyberpunk, 80s retro, vaporwave
• Keywords: "Neon synthwave colors," "vibrant purple and cyan," "electric pink glow"

**Kodachrome Vintage**
• Effect: Rich reds and yellows, high contrast
• Use: 1950s-70s nostalgic look
• Keywords: "Kodachrome film colors," "vintage high contrast," "rich warm tones"

**Bleach Bypass**
• Effect: Reduced saturation, high contrast, gritty
• Use: Action, thriller, intense drama
• Keywords: "Bleach bypass look," "high contrast desaturated"

**Sepia / Vintage B&W Tones**
• Effect: Warm brown tones, historical feel
• Use: Nostalgia, historical, timeless
• Keywords: "Sepia tone," "warm vintage brown wash"

## Color Harmony Approaches

**Complementary** (Opposite on color wheel)
• Blue/Orange, Red/Green, Purple/Yellow
• Creates visual tension and balance

**Analogous** (Adjacent on wheel)
• Blue/Green/Teal, Red/Orange/Yellow
• Harmonious and soothing

**Triadic** (Three equally spaced)
• Red/Yellow/Blue, Purple/Orange/Green
• Vibrant but balanced

## Temperature Control

**Warm Palette:** Oranges, yellows, reds → Cozy, energetic, passionate
**Cool Palette:** Blues, greens, purples → Calm, professional, melancholic
**Neutral:** Greys, browns, beiges → Timeless, sophisticated, minimal

## Practical Examples

**Commercial Product:**
"Clean white background with subtle warm highlights, high-key exposure, minimal color grading"

**Film Noir:**
"Deep blacks and bright whites, high contrast black and white, dramatic shadows"

**Cyberpunk Scene:**
"Neon pink and electric cyan color grading with deep shadows, high saturation, teal and magenta split toning"

**Natural Documentary:**
"Neutral color temperature, accurate skin tones, slight contrast boost, no stylized grading"`;

const LENS_GUIDE = `# Camera Lens & Technical Specifications Guide

## Focal Length Decision Tree

**Want EXPANSIVE view with CONTEXT** → 16-35mm (wide angle)
**Want NATURAL human perspective** → 40-50mm (standard)
**Want FLATTERING portraits** → 85-135mm (portrait)
**Want COMPRESSED backgrounds** → 200mm+ (telephoto)

## Complete Focal Length Guide

### Ultra-Wide (16-24mm)
**Effect:** Expansive view, slight barrel distortion, exaggerated depth
**Best For:** Landscapes, architecture, dynamic action
**Keywords:** "Shot on 16mm ultra-wide lens," "expansive field of view"
**Characteristics:** Makes foreground huge, background tiny

### Wide Angle (28-35mm)
**Effect:** Broad view, natural slight distortion, documentary feel
**Best For:** Environmental portraits, street, reportage
**Keywords:** "35mm documentary lens," "wide environmental context"
**Characteristics:** Less distortion than ultra-wide but still spacious

### Standard (40-50mm)
**Effect:** Natural human eye perspective, no distortion
**Best For:** General photography, authentic representation
**Keywords:** "Shot on 50mm standard lens," "natural perspective"
**Characteristics:** "What you see is what you get"

### Portrait (85-100mm)
**Effect:** Flattering facial compression, beautiful bokeh
**Best For:** Headshots, beauty, character portraits
**Keywords:** "85mm portrait lens," "flattering facial compression"
**Characteristics:** Industry standard for portraits

### Telephoto (135-200mm)
**Effect:** Strong background compression, shallow DOF
**Best For:** Isolated subjects, wildlife, sports
**Keywords:** "200mm telephoto," "compressed background"
**Characteristics:** Makes background appear closer and larger

### Super Telephoto (300mm+)
**Effect:** Extreme compression, very shallow DOF, isolating
**Best For:** Wildlife, sports, distant subjects
**Keywords:** "600mm super telephoto," "extreme background blur"

## Aperture Guide (f-stop)

### Wide Open (f/1.2 - f/2.8)
**Effect:** Extremely shallow depth of field, creamy bokeh, low light capability
**Use:** Portraits, subject isolation, bokeh backgrounds
**Keywords:** "f/1.2 aperture," "shallow depth of field," "bokeh background"

### Medium (f/4 - f/5.6)
**Effect:** Moderate DOF, good sharpness, balanced
**Use:** General photography, lifestyle, travel
**Keywords:** "f/4 aperture," "balanced depth of field"

### Narrow (f/8 - f/16)
**Effect:** Deep depth of field, everything sharp, landscape mode
**Use:** Landscapes, architecture, group photos
**Keywords:** "f/11 aperture," "deep focus," "sharp throughout"

## Angle & Perspective

**Eye Level:** Neutral, relatable, documentary
**Low Angle:** Subject appears powerful, dominant, heroic
**High Angle:** Subject appears vulnerable, small, submissive
**Bird's Eye:** Overhead, pattern-revealing, graphic
**Dutch Angle:** Tilted horizon, creates tension, disorientation

## Film Emulation Types

**Kodak Portra 400:** Gold standard for portraits, excellent skin, fine grain, warm
**Fujifilm Velvia 50:** High saturation, high contrast, landscapes
**Ilford HP5 Plus:** Classic B&W, gritty grain, journalism look
**CineStill 800T:** Tungsten balanced, distinct "halation" glow around lights
**Polaroid SX-70:** Soft focus, vintage borders, washed colors

## Example Combinations

**Cinematic Portrait:**
"Shot on 85mm lens, f/1.4 aperture creating shallow depth of field with creamy bokeh, Kodak Portra 400 film emulation"

**Epic Landscape:**
"Captured on 24mm wide-angle lens, f/11 aperture for front-to-back sharpness, Fujifilm Velvia 50 film stock"

**Street Photography:**
"Shot on 35mm lens at f/5.6, Ilford HP5 Plus black and white film, natural perspective"`;

const STYLE_GUIDE = `# Style & Aesthetic Reference Guide

## Major Aesthetic Categories

### Film Noir (1940s-50s)
**Visual DNA:** High contrast B&W, dramatic shadows, chiaroscuro, cigarette smoke
**Lighting:** Hard single source, venetian blind shadows, rain-wet streets
**Keywords:** "Film noir aesthetic," "1940s detective style," "high contrast black and white"
**Mood:** Mystery, danger, sophistication

### Cyberpunk / Neon Noir
**Visual DNA:** Neon pink/cyan, wet reflective streets, high-tech low-life, rain
**Lighting:** Practical neon signs, volumetric fog, colored gels
**Keywords:** "Cyberpunk aesthetic," "neon-soaked streets," "dystopian future"
**Mood:** Tech dystopia, noir updated for 2050

### Vintage Americana (1950s-70s)
**Visual DNA:** Kodachrome colors, diners, vintage cars, optimistic
**Lighting:** Bright, saturated, sunny, nostalgic
**Keywords:** "1960s Kodachrome aesthetic," "vintage Americana," "mid-century modern"
**Mood:** Nostalgia, innocence, golden age

### Minimalist / Scandinavian
**Visual DNA:** Clean lines, negative space, neutral palette, functional beauty
**Lighting:** Even, soft, natural window light
**Keywords:** "Minimalist composition," "Scandinavian design," "clean simple aesthetic"
**Mood:** Calm, sophisticated, timeless

### Wes Anderson Symmetry
**Visual DNA:** Perfect symmetry, pastel palette, quirky details, flat frontal compositions
**Lighting:** Even, soft, pastel-colored
**Keywords:** "Wes Anderson style," "perfectly symmetrical composition," "pastel color palette"
**Mood:** Whimsical, nostalgic, meticulous

### Moody Editorial
**Visual DNA:** Desaturated, dramatic lighting, fashion-forward, artistic
**Lighting:** Dramatic single source, shadows emphasized
**Keywords:** "Editorial fashion lighting," "moody desaturated tones," "artistic composition"
**Mood:** Sophisticated, high-fashion, artistic

### Natural Documentary
**Visual DNA:** Candid, authentic, unposed, real moments
**Lighting:** Available light, no styling, pure observation
**Keywords:** "Documentary photography," "candid moment," "natural light"
**Mood:** Authentic, truthful, unmanipulated

### Surreal / Dreamlike
**Visual DNA:** Impossible scenarios, ethereal, soft focus, floating elements
**Lighting:** Soft diffused, magical hour, otherworldly
**Keywords:** "Surreal dreamlike atmosphere," "ethereal quality," "magical realism"
**Mood:** Fantasy, subconscious, impossible

### Gritty Realism
**Visual DNA:** Desaturated, high grain, harsh reality, unflinching
**Lighting:** Harsh natural light, no flattery, documentary style
**Keywords:** "Gritty realistic aesthetic," "high film grain," "raw unfiltered"
**Mood:** Truth, hardship, reality

## Combining Styles

You can mix aesthetics for unique results:

**"Cyberpunk + Wes Anderson":**
"Symmetrical composition of a neon-lit futuristic street in pastel pink and mint green, perfectly centered character, whimsical retrofuturism"

**"Film Noir + Colorized":**
"1940s detective aesthetic with dramatic chiaroscuro lighting but rendered in desaturated color with teal and orange tones"

**"Minimalist + Volumetric":**
"Clean Scandinavian interior with single subject, but dramatic god rays cutting through window creating volumetric atmosphere"`;

function optimizePromptGuide(current_prompt?: string): string {
  if (!current_prompt) {
    return `## How to Use Prompt Optimization

**Include your current prompt:**
\`\`\`
gemini_prompt_assistant(
  request_type="optimize_prompt",
  current_prompt="Your current image prompt here",
  desired_outcome="What you're trying to achieve"
)
\`\`\`

**I will analyze and provide:**
• Structural improvements
• Specificity suggestions
• Technical additions
• Enhanced rewritten version
• Alternative approaches`;
  }

  const hasTechnical = /\b(f\/\d\.?\d?|mm\s|lens|aperture|lighting|shot on)\b/gi.test(current_prompt);
  const isDetailed = current_prompt.length > 50;
  const hasMood = /\b(cinematic|dramatic|moody|atmospheric)\b/gi.test(current_prompt);
  const hasVague = /\b(beautiful|nice|good|amazing)\b/gi.test(current_prompt);
  const noCamera = !/\b(f\/\d|mm|aperture)\b/gi.test(current_prompt);
  const noLighting = !/\b(lighting|lit|illuminated|shadow)\b/gi.test(current_prompt);

  return `## Your Current Prompt
\`\`\`
${current_prompt}
\`\`\`

## Analysis & Optimization

**Strengths Detected:**
${hasTechnical ? '✓ Contains technical camera specifications - good for photorealism' : '⚠ Missing technical specifications'}
${isDetailed ? '✓ Detailed prompt with good length' : '⚠ Prompt might be too brief for complex results'}
${hasMood ? '✓ Includes mood/aesthetic keywords' : '⚠ Could benefit from mood descriptors'}

**Optimization Suggestions:**

1. **Structure:** Convert to framework format:
   - Medium/Format (what kind of image)
   - Subject + Action (who/what doing what)
   - Environment (where)
   - Lighting (how lit)
   - Technical (camera/lens)
   - Style (aesthetic mood)

2. **Specificity Upgrades:**
${hasVague ? '   • Replace vague adjectives ("beautiful") with specific descriptors' : ''}
${noCamera ? '   • Add camera specs: lens focal length, aperture value' : ''}
${noLighting ? '   • Specify lighting type and direction' : ''}

3. **Enhanced Version:**
\`\`\`
[I can provide an optimized version - would you like me to rewrite it?]
\`\`\`

4. **Alternative Approaches:**
   • If aiming for photorealism → Add film stock, camera model
   • If aiming for illustration → Specify art medium, artist style
   • If aiming for cinematic → Add color grade, aspect ratio

**Next Steps:**
• Use \`gemini_prompt_assistant request_type="template"\` for structure
• Use \`desired_outcome="[specific goal]"\` for targeted improvements`;
}

function troubleshootGuide(current_prompt?: string, desired_outcome?: string): string {
  if (!current_prompt || !desired_outcome) {
    return `## How to Use Troubleshooting

**Describe what's going wrong:**
\`\`\`
gemini_prompt_assistant(
  request_type="troubleshoot",
  current_prompt="Your prompt that's not working",
  desired_outcome="What you want instead"
)
\`\`\`

**I will diagnose and suggest:**
• Root cause of the problem
• Specific prompt modifications
• Alternative approaches
• Test variations to try`;
  }

  return `## Analyzing Your Issue

**Your Prompt:** ${current_prompt}
**Desired Outcome:** ${desired_outcome}

## Common Problems & Solutions

**PROBLEM: Hands look distorted or have wrong number of fingers**
• Solution: Keep hands in simple, visible poses
• Avoid: Intertwined fingers, hidden hands, complex gestures
• Try: "Hands resting naturally at sides" or "Single hand visible holding object"

**PROBLEM: Face doesn't look realistic**
• Solution: Add specific facial feature details
• Avoid: Generic "beautiful face"
• Try: "Defined cheekbones, expressive brown eyes, subtle smile lines"

**PROBLEM: Lighting looks flat or wrong**
• Solution: Specify light source direction and quality
• Avoid: "Good lighting" or "well-lit"
• Try: "Soft window light from camera left creating gentle shadows on right side of face"

**PROBLEM: Colors look oversaturated or wrong**
• Solution: Specify color grade or film stock
• Avoid: "Vibrant colors" without context
• Try: "Muted desaturated palette" or "Kodak Portra 400 natural skin tones"

**PROBLEM: Composition is boring or generic**
• Solution: Specify angle, framing, rule of thirds
• Avoid: "Take a photo of"
• Try: "Low angle shot looking up at subject, rule of thirds composition"

**PROBLEM: Background is distracting or wrong**
• Solution: Control depth of field and background description
• Avoid: Not mentioning background
• Try: "Shot at f/1.8 creating blurry bokeh background" or "Against seamless white background"

**PROBLEM: Style is inconsistent or unexpected**
• Solution: Pick ONE clear style reference
• Avoid: Mixing too many styles
• Try: Choose either "film noir" OR "pastel Wes Anderson" not both

**PROBLEM: Text in image has typos or errors**
• Solution: Keep text short, use simple fonts, specify clearly
• Avoid: Long paragraphs of text
• Try: "Sign with text: 'OPEN' in bold red letters"

**PROBLEM: Getting illustration when you want photo**
• Solution: Add photorealistic keywords and camera specs
• Avoid: Art style keywords
• Try: "Hyper-realistic photography, shot on 85mm lens, Canon 5D"

**PROBLEM: Getting photo when you want illustration**
• Solution: Remove camera specs, add art medium
• Avoid: Technical photo terms
• Try: "Oil painting on canvas" or "Digital illustration, Procreate style"

## Your Specific Recommendations:

[Based on your inputs, I would provide targeted advice here]`;
}

/**
 * Handle chart-specific request types using the prompt library.
 */
function handleChartRequest(
  request_type: string,
  current_prompt?: string,
  color_scheme?: string,
  chart_type?: string,
  emphasis?: string
): string {
  if (request_type === 'chart_design') {
    const basePrompt = current_prompt || 'Professional data visualization';
    const enhanced = enhanceChartPrompt(basePrompt, {
      colorScheme: (color_scheme || 'professional') as any,
      chartType: (chart_type || 'bar') as any,
      emphasis: (emphasis || 'data-ink') as any
    });

    return `# Enhanced Chart Design Prompt

${enhanced}

---

**USAGE:**
Pass the enhanced prompt above to \`generate_image\` with \`aspectRatio: "16:9"\`.

**CUSTOMISE:**
• \`color_scheme\`: professional, editorial, scientific, minimal, dark, storytelling, financial, terminal, modernist
• \`chart_type\`: line, bar, scatter, pie, area, heatmap, network, treemap
• \`emphasis\`: data-ink, storytelling, exploration, presentation`;
  }

  if (request_type === 'optimize_chart') {
    if (!current_prompt) {
      return `## How to Use Chart Optimization

Provide your current chart prompt:
\`\`\`
gemini_prompt_assistant(
  request_type="optimize_chart",
  current_prompt="Your chart generation prompt here",
  color_scheme="storytelling"
)
\`\`\``;
    }

    const validation = validateChartPrompt(current_prompt);
    const enhanced = enhanceChartPrompt(current_prompt, {
      colorScheme: (color_scheme || 'professional') as any,
      chartType: (chart_type || 'bar') as any,
      emphasis: (emphasis || 'data-ink') as any
    });

    let response = `# Chart Prompt Optimization

**Original Prompt:**
${current_prompt}

`;

    if (validation.warnings.length > 0) {
      response += `**Warnings:**\n`;
      validation.warnings.forEach(w => response += `• ${w}\n`);
      response += `\n`;
    }

    if (validation.suggestions.length > 0) {
      response += `**Suggestions:**\n`;
      validation.suggestions.forEach(s => response += `• ${s}\n`);
      response += `\n`;
    }

    response += `**Optimised Prompt:**\n${enhanced}`;
    return response;
  }

  if (request_type === 'validate_chart') {
    if (!current_prompt) {
      return 'Error: current_prompt required for validation. Pass your chart generation prompt to check for anti-patterns.';
    }

    const validation = validateChartPrompt(current_prompt);

    let response = `# Chart Prompt Validation

**Prompt:** ${current_prompt}

**Status:** ${validation.valid ? 'Looks good' : 'Issues found'}

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

  if (request_type === 'get_palette') {
    const scheme = (color_scheme || 'professional') as keyof ReturnType<typeof getChartColorPalette> extends never ? never : any;
    const palette = getChartColorPalette(scheme);

    return `# ${(color_scheme || 'professional').charAt(0).toUpperCase() + (color_scheme || 'professional').slice(1)} Colour Palette

**Description:** ${palette.description}

**Primary Colours:**
${palette.primary.map((c: string) => `• ${c}`).join('\n')}

**Neutral Greys:**
${palette.neutral.map((c: string) => `• ${c}`).join('\n')}

**Accent Colours:**
${palette.accent.map((c: string) => `• ${c}`).join('\n')}

**Usage in Prompt:**
"Use ${color_scheme || 'professional'} colour palette: primary ${palette.primary.slice(0, 3).join(', ')}; neutral greys ${palette.neutral[0]} to ${palette.neutral[palette.neutral.length - 1]}"

**All Available Schemes:**
• professional — IBM Carbon, Tailwind-inspired
• editorial — FiveThirtyEight, Economist-inspired
• scientific — Nature, Science journal-inspired
• minimal — Edward Tufte data-ink approach
• dark — Observable, GitHub dark mode
• storytelling — Cole Nussbaumer Knaflic strategic highlighting
• financial — Financial Times editorial
• terminal — Bloomberg/Fintech high-density
• modernist — W.E.B. Du Bois bold geometric`;
  }

  return `Unknown chart request type: ${request_type}`;
}

export function registerPromptAssistant(server: McpServer): void {
  server.registerTool(
    'gemini_prompt_assistant',
    {
      title: 'Image & Chart Prompt Assistant',
      description:
        'Get expert prompt templates and guidance for Gemini image generation. ' +
        'Covers photography (portraits, products, cinematic), chart/diagram design ' +
        '(9 professional design systems including FT, Bloomberg, Tufte, Du Bois), ' +
        'lighting, colour grading, lens simulation, and style aesthetics. ' +
        'For charts: use chart_design with a color_scheme to get a full professional design system prompt.',
      inputSchema: {
        request_type: z
          .enum([
            'template',
            'lighting_guide',
            'color_guide',
            'lens_guide',
            'style_guide',
            'optimize_prompt',
            'troubleshoot',
            'chart_design',
            'optimize_chart',
            'validate_chart',
            'get_palette',
          ])
          .describe('Type of assistance needed'),
        use_case: z
          .enum([
            'portrait',
            'product',
            'landscape',
            'cinematic',
            'editorial',
            'abstract',
            'architecture',
            'food',
            'fashion',
          ])
          .optional()
          .describe('Specific use case for template (photography request types)'),
        current_prompt: z.string().optional().describe('Current prompt to optimize or troubleshoot'),
        desired_outcome: z.string().optional().describe('Description of what you want to achieve'),
        color_scheme: z
          .enum([
            'professional',
            'editorial',
            'scientific',
            'minimal',
            'dark',
            'storytelling',
            'financial',
            'terminal',
            'modernist',
          ])
          .optional()
          .describe('Chart colour scheme / design system (for chart_design, optimize_chart, get_palette)'),
        chart_type: z
          .enum(['line', 'bar', 'scatter', 'area', 'pie', 'network', 'heatmap', 'treemap'])
          .optional()
          .describe('Chart type for chart-specific guidelines'),
        emphasis: z
          .enum(['data-ink', 'storytelling', 'exploration', 'presentation'])
          .optional()
          .describe('Design emphasis / audience priority'),
      },
    },
    async ({ request_type, use_case, current_prompt, desired_outcome, color_scheme, chart_type, emphasis }) => {
      // Chart request types — route to prompt library
      const chartTypes = ['chart_design', 'optimize_chart', 'validate_chart', 'get_palette'];
      if (chartTypes.includes(request_type)) {
        const content = handleChartRequest(request_type, current_prompt, color_scheme, chart_type, emphasis);
        return { content: [{ type: 'text' as const, text: content }] };
      }

      // Photography/image request types — existing static guides
      const guides: Record<string, string> = {
        template: templateGuide(use_case),
        lighting_guide: LIGHTING_GUIDE,
        color_guide: COLOR_GUIDE,
        lens_guide: LENS_GUIDE,
        style_guide: STYLE_GUIDE,
        optimize_prompt: `# Prompt Optimization Analysis\n\n${optimizePromptGuide(current_prompt)}`,
        troubleshoot: `# Troubleshooting Image Generation Issues\n\n${troubleshootGuide(current_prompt, desired_outcome)}`,
      };

      const content = guides[request_type];
      if (!content) {
        return {
          content: [{
            type: 'text' as const,
            text: `Unknown request type: ${request_type}\n\nAvailable:\n` +
              `Photography: template, lighting_guide, color_guide, lens_guide, style_guide, optimize_prompt, troubleshoot\n` +
              `Charts: chart_design, optimize_chart, validate_chart, get_palette`,
          }],
        };
      }

      return { content: [{ type: 'text' as const, text: content }] };
    }
  );
}
