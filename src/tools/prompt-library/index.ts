/**
 * Prompt Library - Modular Prompt Enhancement System
 * 
 * Architecture: Each domain (charts, photography, etc.) is a separate module
 * that exports enhancement functions. Easy to add new domains.
 */

export { enhanceChartPrompt, getChartColorPalette, validateChartPrompt } from './charts.js';
// Future: export { enhancePhotographyPrompt, ... } from './photography.js';
// Future: export { enhanceCinematicPrompt, ... } from './cinematic.js';
