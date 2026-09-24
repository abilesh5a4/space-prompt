'use client';

import { Mic } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { Spinner } from '@/components/ui/loading';
import type { SpeechRecognitionError, SpeechStatus } from '@/types';

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

export function VoiceButton({ status, onToggle, className = '' }: VoiceButtonProps) {
  const isListening = status === 'listening';
  const isBusy = status === 'starting' || status === 'stopping';

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {isListening && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-ping rounded-xl bg-[#38BDF8]/20"
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
        className={isListening ? 'relative ring-2 ring-[#38BDF8]/50' : 'relative'}
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

const announcements: Partial<Record<SpeechStatus, string>> = {
  starting: 'Starting voice input.',
  listening: 'Listening. Speak now.',
  stopping: 'Finishing voice input.',
};

export interface VoiceStatusProps {
  status: SpeechStatus;
  interimTranscript: string;
  error: SpeechRecognitionError | null;
  idleHint?: string;
  className?: string;
}

export function VoiceStatus({
  status,
  interimTranscript,
  error,
  idleHint,
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

  if (!isActive && !idleHint) {
    return null;
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span role="status" aria-live="polite" className="sr-only">
        {announcements[status] ?? ''}
      </span>

      {isActive ? (
        <span aria-hidden="true" className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#38BDF8]">
            <span>{status === 'stopping' ? 'Finishing up' : 'Listening'}</span>
            <span className="flex items-end gap-0.5 pb-0.5">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1 w-1 animate-pulse rounded-full bg-[#38BDF8]"
                  style={{ animationDelay: `${dot * 180}ms` }}
                />
              ))}
            </span>
          </span>

          {interimTranscript && (
            <span className="min-w-0 truncate text-xs italic text-[#71717A]">
              {interimTranscript}
            </span>
          )}
        </span>
      ) : (
        idleHint ? (
          <p className="min-w-0 text-xs leading-relaxed text-[#71717A]">
            {idleHint}
          </p>
        ) : null
      )}
    </div>
  );
}
