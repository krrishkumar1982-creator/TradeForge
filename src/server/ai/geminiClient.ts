import { GoogleGenAI } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    (typeof globalThis !== 'undefined' ? (globalThis as any).__GEMINI_API_KEY__ : undefined)
  );
}

export function getGeminiModel(): string {
  const rawModel = process.env.GEMINI_MODEL || process.env.MODEL;
  if (typeof rawModel !== 'string' || rawModel.trim() === '') {
    return 'gemini-3.8-flash';
  }

  // Strip wrapping quotes and whitespace
  let model = rawModel.trim().replace(/^["']|["']$/g, '');

  // Strip any 'models/' prefix (e.g. 'models/gemini-3.8-flash' -> 'gemini-3.8-flash')
  while (model.startsWith('models/')) {
    model = model.slice(7).trim();
  }

  // Detect if the string is a random token or key instead of a model name (e.g. contains dots/underscores or doesn't start with gemini-)
  // Valid models strictly start with 'gemini-'
  if (!model.startsWith('gemini-') && !model.startsWith('veo-') && !model.startsWith('lyria-')) {
    return 'gemini-3.8-flash';
  }

  // Handle deprecated or unavailable legacy models
  if (
    model.includes('1.5') ||
    model.includes('2.0') ||
    model.includes('2.5') ||
    model === 'gemini-pro' ||
    model === 'gemini-flash'
  ) {
    return 'gemini-3.8-flash';
  }

  return model;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return cachedClient;
}
