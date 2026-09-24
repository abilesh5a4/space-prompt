/**
 * AI provider configuration.
 *
 * Server-only. None of these variables carry the `NEXT_PUBLIC_` prefix, so Next
 * never inlines them into a browser bundle — the key exists on the server or
 * nowhere. Nothing in this file is ever returned to a client.
 *
 * Space Prompt uses exactly one provider: Google's Gemini API over REST. The
 * endpoint and model are configurable so a model rename does not need a code
 * change, but there is deliberately no second provider path.
 */



/**
 * Hard ceiling on a single analysis request. Long enough for a slow first token,
 * short enough that a stuck request fails while the user is still watching.
 */
export const AI_REQUEST_TIMEOUT_MS = 20_000;

export type ProviderName = 'groq' | 'gemini';

export interface GroqConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  thinkingLevel: 'off' | 'minimal' | 'low' | 'medium' | 'high';
}

export interface AIConfig {
  primaryProvider: ProviderName;
  groq: GroqConfig | null;
  gemini: GeminiConfig | null;
}

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function isGroqConfigured(): boolean {
  const key = readEnv('GROQ_API_KEY');
  return key.length > 0 && !key.toLowerCase().includes('your');
}

export function isGeminiConfigured(): boolean {
  const key = readEnv('GEMINI_API_KEY');
  return key.length > 0 && !key.toLowerCase().includes('your-');
}

export function isAIConfigured(): boolean {
  return isGroqConfigured() || isGeminiConfigured();
}

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_THINKING_LEVEL = 'low';
const THINKING_LEVELS = new Set(['off', 'minimal', 'low', 'medium', 'high']);

export function getAIConfig(): AIConfig | null {
  if (typeof window !== 'undefined') {
    throw new Error('AI provider configuration must not be read in the browser.');
  }

  const groqConfig: GroqConfig | null = isGroqConfigured()
    ? {
        apiKey: readEnv('GROQ_API_KEY'),
        model: readEnv('GROQ_MODEL') || DEFAULT_GROQ_MODEL,
        baseUrl: (readEnv('GROQ_API_BASE_URL') || DEFAULT_GROQ_BASE_URL).replace(/\/+$/, ''),
      }
    : null;

  const requestedThinking = readEnv('GEMINI_THINKING_LEVEL').toLowerCase();
  const thinkingLevel = THINKING_LEVELS.has(requestedThinking)
    ? requestedThinking
    : DEFAULT_GEMINI_THINKING_LEVEL;

  const geminiConfig: GeminiConfig | null = isGeminiConfigured()
    ? {
        apiKey: readEnv('GEMINI_API_KEY'),
        model: readEnv('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL,
        baseUrl: (readEnv('GEMINI_API_BASE_URL') || DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, ''),
        thinkingLevel: thinkingLevel as GeminiConfig['thinkingLevel'],
      }
    : null;

  if (!groqConfig && !geminiConfig) {
    return null;
  }

  const requestedProvider = readEnv('AI_PROVIDER').toLowerCase();
  let primaryProvider: ProviderName = 'groq';

  if (requestedProvider === 'gemini') {
    primaryProvider = geminiConfig ? 'gemini' : 'groq';
  } else {
    primaryProvider = groqConfig ? 'groq' : 'gemini';
  }

  return {
    primaryProvider,
    groq: groqConfig,
    gemini: geminiConfig,
  };
}
