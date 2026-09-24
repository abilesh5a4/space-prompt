'use client';

import { Mic } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { Spinner } from '@/components/ui/loading';
import type { SpeechRecognitionError, SpeechStatus } from '@/types';

/** Label doubles as the button's tooltip, so it has to read well on its own. */
const buttonLabels: Record<SpeechStatus, string> = {
  idle: 'Start voice input',
  starting: 'Starting voice input',
  listening: 'Stop voice input',
  stopping: 'Stopping voice input',
  unsupported: "Voice input isn't supported in this browser",
};

export interface VoiceButtonProps {
  status: SpeechStatus;
  onToggle: () => void;
  className?: string;
}

/**
 * Microphone control.
 *
 * Presentational on purpose: every Web Speech API detail lives in
 * `useSpeechRecognition`, so this can sit in any composer without dragging the
 * speech implementation into the surrounding markup.
 */
export function VoiceButton({ status, onToggle, className = '' }: VoiceButtonProps) {
  const isListening = status === 'listening';
  const isBusy = status === 'starting' || status === 'stopping';

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {/* Subtle ring instead of a waveform — enough to show the mic is live. */}
      {isListening && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-ping rounded-xl bg-emerald-500/20"
        />
      )}

      <IconButton
        type="button"
        label={buttonLabels[status]}
        variant={isListening ? 'primary' : 'secondary'}
        size="sm"
        onClick={onToggle}
        disabled={status === 'unsupported'}
        aria-pressed={isListening}
        className={isListening ? 'relative ring-2 ring-emerald-400/50' : 'relative'}
      >
        {isBusy ? (
          <Spinner className="h-4 w-4 text-current" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
      </IconButton>
    </span>
  );
}

/** Announced when the session state changes; empty while nothing is happening. */
const announcements: Partial<Record<SpeechStatus, string>> = {
  starting: 'Starting voice input.',
  listening: 'Listening. Speak now.',
  stopping: 'Finishing voice input.',
};

export interface VoiceStatusProps {
  status: SpeechStatus;
  interimTranscript: string;
  error: SpeechRecognitionError | null;
  /** Shown while idle — keep it short, it sits under the composer controls. */
  idleHint?: string;
  className?: string;
}

/**
 * The line beside the microphone: live state, speech errors, or the standing
 * helper note.
 *
 * All three occupy the same slot at the same size, so nothing shifts as the
 * state changes. Interim words are marked decorative — a screen reader gets the
 * status message and, once a phrase is finalised, the text itself in the
 * textarea, which is far more useful than a stream of revised guesses.
 */
export function VoiceStatus({
  status,
  interimTranscript,
  error,
  idleHint = "Voice is transcribed by your browser's speech-recognition service.",
  className = '',
}: VoiceStatusProps) {
  const isActive = status === 'starting' || status === 'listening' || status === 'stopping';

  if (error) {
    return (
      <p role="alert" className={`min-w-0 text-xs leading-relaxed text-red-400 ${className}`}>
        {error.message}
      </p>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span role="status" aria-live="polite" className="sr-only">
        {announcements[status] ?? ''}
      </span>

      {isActive ? (
        <span aria-hidden="true" className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400">
            <span>{status === 'stopping' ? 'Finishing up' : 'Listening'}</span>
            <span className="flex items-end gap-0.5 pb-0.5">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1 w-1 animate-pulse rounded-full bg-emerald-400"
                  style={{ animationDelay: `${dot * 180}ms` }}
                />
              ))}
            </span>
          </span>

          {interimTranscript && (
            <span className="min-w-0 truncate text-xs italic text-slate-500">
              {interimTranscript}
            </span>
          )}
        </span>
      ) : (
        <p className="min-w-0 text-xs leading-relaxed text-slate-600">
          {status === 'unsupported'
            ? "Voice input isn't supported in this browser. You can still type your idea."
            : idleHint}
        </p>
      )}
    </div>
  );
}
