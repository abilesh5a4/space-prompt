'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SpeechErrorCode, SpeechRecognitionError, SpeechStatus } from '@/types';

/* ------------------------------------------------------------------ *
 * Local typings
 * ------------------------------------------------------------------ *
 *
 * The installed TypeScript DOM library ships SpeechRecognitionResultList,
 * SpeechRecognitionResult and SpeechRecognitionAlternative, but not the
 * recognition object itself, its events, or the window constructors. Only those
 * missing pieces are declared here.
 *
 * They are module-scoped and deliberately named differently from the spec
 * interfaces (`SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`,
 * `SpeechRecognition`) so a future TypeScript release that adds them cannot
 * collide with this file. Nothing here uses `any`.
 */

interface SpeechRecognitionResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionFailureEvent extends Event {
  /** Vendor error identifier, e.g. "not-allowed". Mapped before display. */
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionFailureEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechCapableWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/** Standard name first, then the WebKit-prefixed one Chrome and Safari expose. */
function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as SpeechCapableWindow;
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

const DEFAULT_LANGUAGE = 'en-US';

/**
 * Follows the browser's own language so dictation matches how the user speaks,
 * falling back to en-US. No locale is hard-coded, and a language picker can be
 * layered on later by passing `lang`.
 */
function resolveLanguage(): string {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const tag = navigator.language;
  return tag && tag.trim().length > 1 ? tag.trim() : DEFAULT_LANGUAGE;
}

const errorMessages: Record<SpeechErrorCode, string> = {
  'not-supported': "Voice input isn't supported in this browser. You can still type your idea.",
  'not-allowed':
    'Microphone permission was denied. Allow microphone access in your browser settings, or keep typing.',
  'no-speech': "I couldn't hear anything. Try again.",
  'audio-capture': 'No microphone was found. Check your device and try again.',
  network: 'Voice transcription needs a network connection. Check your connection and try again.',
  aborted: 'Voice input stopped unexpectedly.',
  unknown: 'Voice input stopped unexpectedly.',
};

/** Maps vendor error identifiers onto the small set the UI knows how to explain. */
function toErrorCode(raw: string): SpeechErrorCode {
  switch (raw) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio-capture';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

function toError(code: SpeechErrorCode): SpeechRecognitionError {
  return { code, message: errorMessages[code] };
}

/* ------------------------------------------------------------------ *
 * Capability detection
 * ------------------------------------------------------------------ */

/** Support cannot change while the document lives, so there is nothing to watch. */
function subscribeToCapability(): () => void {
  return () => {};
}

function getCapabilitySnapshot(): boolean {
  return getRecognitionConstructor() !== null;
}

/**
 * `null` means "not determined yet" — the value used while rendering on the
 * server and during hydration. It matters: if the server assumed "unsupported",
 * every visitor would be shown the unsupported notice for a frame, including
 * the ones whose browser handles voice perfectly well.
 */
function getServerCapabilitySnapshot(): boolean | null {
  return null;
}

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */

export interface UseSpeechRecognitionOptions {
  /**
   * Called once per finalised phrase, with that phrase only. Interim
   * hypotheses never reach it, so committed text is never rewritten.
   */
  onResult?: (transcript: string) => void;
  /** BCP-47 tag. Defaults to the browser language, then en-US. */
  lang?: string;
}

export interface UseSpeechRecognitionResult {
  /** True only once the browser is known to support recognition. */
  supported: boolean;
  status: SpeechStatus;
  listening: boolean;
  /** Live, uncommitted hypothesis. Display only — it may change or vanish. */
  interimTranscript: string;
  error: SpeechRecognitionError | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetError: () => void;
}

/**
 * Browser speech-to-text for the studio composer.
 *
 * Nothing is requested on mount: the microphone permission prompt only appears
 * once `startListening` runs from a real user gesture. No audio is sent
 * anywhere by this app — transcription is whatever the browser's own service
 * does, which is why the UI says exactly that rather than promising privacy the
 * Web Speech API cannot guarantee.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const capability = useSyncExternalStore<boolean | null>(
    subscribeToCapability,
    getCapabilitySnapshot,
    getServerCapabilitySnapshot
  );

  const [sessionStatus, setSessionStatus] = useState<SpeechStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stoppingRef = useRef(false);
  const onResultRef = useRef(options.onResult);
  const langRef = useRef(options.lang);

  // Kept current through refs so a re-render never has to tear down and
  // recreate a live recognition session mid-sentence.
  useEffect(() => {
    onResultRef.current = options.onResult;
    langRef.current = options.lang;
  }, [options.onResult, options.lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;

    const RecognitionConstructor = getRecognitionConstructor();
    if (!RecognitionConstructor) {
      setError(toError('not-supported'));
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.lang = langRef.current ?? resolveLanguage();
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Lets someone speak several sentences without re-pressing the button.
    recognition.continuous = true;

    recognition.onstart = () => setSessionStatus('listening');

    recognition.onresult = (event) => {
      let finalised = '';
      let interim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const alternative = event.results[index]?.[0];
        if (!alternative) continue;

        if (event.results[index]?.isFinal) {
          finalised += alternative.transcript;
        } else {
          interim += alternative.transcript;
        }
      }

      setInterimTranscript(interim.trim());

      const committed = finalised.trim();
      if (committed) onResultRef.current?.(committed);
    };

    recognition.onerror = (event) => {
      // A deliberate stop surfaces as "aborted" in some browsers, and pausing
      // before speaking surfaces as "no-speech". Neither is worth alarming
      // someone who has already finished with the microphone.
      if (stoppingRef.current && (event.error === 'aborted' || event.error === 'no-speech')) {
        return;
      }
      setError(toError(toErrorCode(event.error)));
    };

    recognition.onend = () => {
      // No automatic restart. Browsers end sessions on their own schedule and
      // restarting from here is exactly how a microphone gets stuck open.
      recognitionRef.current = null;
      stoppingRef.current = false;
      setInterimTranscript('');
      setSessionStatus('idle');
    };

    recognitionRef.current = recognition;
    stoppingRef.current = false;
    setError(null);
    setInterimTranscript('');
    setSessionStatus('starting');

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setSessionStatus('idle');
      setError(toError('unknown'));
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    stoppingRef.current = true;
    setSessionStatus('stopping');

    try {
      // Flushes whatever was already recognised, then fires onend.
      recognition.stop();
    } catch {
      recognition.abort();
      recognitionRef.current = null;
      stoppingRef.current = false;
      setInterimTranscript('');
      setSessionStatus('idle');
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (recognitionRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const resetError = useCallback(() => setError(null), []);

  // Leaving the studio must not leave the microphone live.
  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;

      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;

      try {
        recognition.abort();
      } catch {
        // Already finished; nothing left to release.
      }
    };
  }, []);

  return {
    supported: capability === true,
    // While capability is still unknown the control behaves as idle, so the
    // "not supported" message is only ever shown once that is actually true.
    status: capability === false ? 'unsupported' : sessionStatus,
    listening: sessionStatus === 'listening',
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetError,
  };
}
