import { AI_REQUEST_TIMEOUT_MS, type GeminiConfig } from '@/lib/ai/config';
import { AIError } from '@/lib/ai/provider';
import type { GenerateJsonOptions } from '@/lib/ai/provider';
import type { AnalyzeErrorCode } from '@/types';

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

function logProviderFailure(reason: string, status?: number): void {
  console.error(`[gemini] provider ${reason}${status ? ` (status ${status})` : ''}`);
}

function codeForStatus(status: number): AnalyzeErrorCode {
  if (status === 400 || status === 404) return 'AI_UNAVAILABLE';
  if (status === 401 || status === 403) return 'AI_UNAVAILABLE';
  if (status === 429) return 'AI_RATE_LIMITED';
  if (status >= 500) return 'AI_UNAVAILABLE';
  return 'ANALYSIS_FAILED';
}

function readText(payload: GeminiResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  return parts
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

export async function generateJsonGemini(
  config: GeminiConfig,
  options: GenerateJsonOptions,
): Promise<string> {
  const { systemInstruction, userContent, responseSchema, temperature = 0.2, maxOutputTokens = 3072 } = options;
  const endpoint = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature,
          maxOutputTokens,
          ...(config.thinkingLevel === 'off'
            ? {}
            : { thinkingConfig: { thinkingLevel: config.thinkingLevel } }),
        },
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      logProviderFailure('request timed out');
      throw new AIError('AI_TIMEOUT', 'The AI provider did not respond in time.');
    }

    logProviderFailure('request could not be completed');
    throw new AIError('AI_UNAVAILABLE', 'The AI provider could not be reached.');
  }

  if (!response.ok) {
    logProviderFailure('returned an error', response.status);
    throw new AIError(codeForStatus(response.status), 'The AI provider rejected the request.');
  }

  let payload: GeminiResponse;

  try {
    payload = (await response.json()) as GeminiResponse;
  } catch {
    logProviderFailure('returned a body that was not JSON', response.status);
    throw new AIError('INVALID_AI_RESPONSE', 'The AI provider returned an unreadable response.');
  }

  if (payload.promptFeedback?.blockReason) {
    logProviderFailure('blocked the request');
    throw new AIError('ANALYSIS_FAILED', 'The AI provider declined to analyse this request.');
  }

  const text = readText(payload);

  if (!text) {
    logProviderFailure(`returned no usable text (finish reason ${payload.candidates?.[0]?.finishReason ?? 'unknown'})`);
    throw new AIError('INVALID_AI_RESPONSE', 'The AI provider returned an empty response.');
  }

  return text;
}
