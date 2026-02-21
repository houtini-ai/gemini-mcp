import { GeminiService } from './dist/services/gemini/index.js';

const svc = new GeminiService({
  apiKey: process.env.GEMINI_API_KEY,
  safetySettings: [],
  defaultModel: 'gemini-2.0-flash',
  maxTokens: 512,
  temperature: 0.7,
  defaultGrounding: false,
  allowExperimentalModels: false
});

try {
  const r = await svc.chat({ message: 'say hi', grounding: false });
  console.log('OK:', r.content.slice(0, 200));
} catch (e) {
  console.error('FAIL:', e.message);
}
