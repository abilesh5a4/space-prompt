import { AI_REQUEST_TIMEOUT_MS, type GroqConfig } from '@/lib/ai/config';
import { AIError } from '@/lib/ai/provider';
import type { GenerateJsonOptions } from '@/lib/ai/provider';
import type { AnalyzeErrorCode } from '@/types';

interface GroqChoice {
  message?: {
    content?: string | null;
  };
  finish_reason?: string;
}

interface GroqChatCompletionResponse {
  choices?: GroqChoice[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

function logProviderFailure(reason: string, status?: number): void {
  console.error(`[groq] provider ${reason}${status ? ` (status ${status})` : ''}`);
}

function codeForStatus(status: number): AnalyzeErrorCode {
  if (status === 400) return 'INVALID_PROVIDER_REQUEST';
  if (status === 404) return 'AI_UNAVAILABLE';
  if (status === 401 || status === 403) return 'AI_UNAVAILABLE';
  if (status === 429) return 'AI_RATE_LIMITED';
  if (status >= 500) return 'AI_UNAVAILABLE';
  return 'ANALYSIS_FAILED';
}

export async function generateJsonGroq(
  config: GroqConfig,
  options: GenerateJsonOptions,
): Promise<string> {
  const { systemInstruction, userContent, responseSchema, schemaName = 'structured_output', temperature = 0.2, maxOutputTokens = 3072 } = options;
  const endpoint = `${config.baseUrl}/chat/completions`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxOutputTokens,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema: responseSchema,
          },
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
    if (response.status === 400) {
      try {
        const errPayload = (await response.clone().json()) as GroqChatCompletionResponse;
        if (errPayload?.error?.message) {
          console.error(`[groq] strict schema error (${schemaName}): ${errPayload.error.message}`);
        }
      } catch {
        // Ignore json parse error of error body
      }
    }
    logProviderFailure('returned an error', response.status);
    throw new AIError(codeForStatus(response.status), 'The AI provider rejected the request.');
  }

  let payload: GroqChatCompletionResponse;

  try {
    payload = (await response.json()) as GroqChatCompletionResponse;
  } catch {
    logProviderFailure('returned a body that was not JSON', response.status);
    throw new AIError('INVALID_AI_RESPONSE', 'The AI provider returned an unreadable response.');
  }

  if (payload.error) {
    logProviderFailure(`returned error payload: ${payload.error.type ?? 'unknown'}`);
    throw new AIError('ANALYSIS_FAILED', 'The AI provider declined to analyse this request.');
  }

  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    logProviderFailure(`returned no usable text (finish reason ${payload.choices?.[0]?.finish_reason ?? 'unknown'})`);
    throw new AIError('INVALID_AI_RESPONSE', 'The AI provider returned an empty response.');
  }

  return text;
}
