import { getAIConfig } from '@/lib/ai/config';
import { generateJsonGemini } from '@/lib/ai/providers/gemini';
import { generateJsonGroq } from '@/lib/ai/providers/groq';
import type { AnalyzeErrorCode } from '@/types';

/** Failure that already carries a safe, user-facing classification. */
export class AIError extends Error {
  readonly code: AnalyzeErrorCode;

  constructor(code: AnalyzeErrorCode, message: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

export interface GenerateJsonOptions {
  systemInstruction: string;
  userContent: string;
  /** OpenAPI-subset schema the provider decodes into. */
  responseSchema: unknown;
  /** Optional name for Groq strict JSON schema mode. */
  schemaName?: string;
  /** Low by default: this is extraction, not creative writing. */
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Determines whether an AI error represents a transient provider issue
 * (timeout, rate limit, provider unavailability, 5xx) that should trigger fallback.
 */
function isTransientProviderError(error: unknown): boolean {
  if (error instanceof AIError) {
    return (
      error.code === 'AI_TIMEOUT' ||
      error.code === 'AI_RATE_LIMITED' ||
      error.code === 'AI_UNAVAILABLE'
    );
  }
  return false;
}

/**
 * Asks the AI provider for a JSON string, trying the primary provider (Groq) first.
 * If the primary provider experiences a transient failure (429/timeout/5xx/unreachable)
 * and a fallback provider (Gemini) is configured, it falls back ONCE to Gemini.
 */
export async function generateJson(options: GenerateJsonOptions): Promise<string> {
  const config = getAIConfig();

  if (!config) {
    throw new AIError('AI_UNAVAILABLE', 'AI analysis is not configured on this server.');
  }

  const { primaryProvider, groq, gemini } = config;

  if (primaryProvider === 'groq' && groq) {
    try {
      return await generateJsonGroq(groq, options);
    } catch (primaryError) {
      if (gemini && isTransientProviderError(primaryError)) {
        console.warn(
          `[ai] Primary provider (Groq) failed with transient error (${
            primaryError instanceof AIError ? primaryError.code : 'unknown'
          }), falling back to Gemini.`
        );
        return await generateJsonGemini(gemini, options);
      }
      throw primaryError;
    }
  }

  if (gemini) {
    try {
      return await generateJsonGemini(gemini, options);
    } catch (primaryError) {
      if (groq && isTransientProviderError(primaryError)) {
        console.warn(
          `[ai] Primary provider (Gemini) failed with transient error (${
            primaryError instanceof AIError ? primaryError.code : 'unknown'
          }), falling back to Groq.`
        );
        return await generateJsonGroq(groq, options);
      }
      throw primaryError;
    }
  }

  throw new AIError('AI_UNAVAILABLE', 'No configured AI provider was able to process the request.');
}
