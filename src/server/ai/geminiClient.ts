import { GoogleGenAI } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    (typeof globalThis !== 'undefined' ? (globalThis as any).__GEMINI_API_KEY__ : undefined)
  );
}

export function getGeminiModel(requestedModel?: string): string {
  if (requestedModel && typeof requestedModel === 'string') {
    let clean = requestedModel.trim().replace(/^["']|["']$/g, '');
    while (clean.startsWith('models/')) {
      clean = clean.slice(7).trim();
    }
    const validModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest',
    ];
    if (validModels.includes(clean)) {
      return clean;
    }
  }

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

/**
 * Executes a Gemini generateContent request with automatic fallback resilience
 * when a model encounters a temporary 503 (high demand) or 429 (rate limit).
 */
export async function generateContentWithResilience(
  gemini: GoogleGenAI,
  primaryModel: string,
  params: {
    contents: any;
    config?: any;
  }
) {
  // Ordered sequence of fallback models to try if the requested model experiences a high-demand spike
  const fallbackCandidates = [
    primaryModel,
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: any = null;

  for (const modelToTry of fallbackCandidates) {
    try {
      const response = await gemini.models.generateContent({
        ...params,
        model: modelToTry,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.error?.code;
      const msg = String(err?.message || err?.error?.message || err || '');
      const isCapacityIssue =
        status === 503 ||
        status === 429 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED');

      if (isCapacityIssue) {
        console.warn(
          `[Gemini Resilience] Model ${modelToTry} is currently experiencing high demand (503/429). Attempting fallback...`
        );
        // Brief jitter pause before trying next candidate
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }

      // If it's another error, also try the next candidate once in case the error is model-specific
      console.warn(`[Gemini Resilience] Model ${modelToTry} call encountered error: ${msg}. Trying alternative...`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw lastError;
}
