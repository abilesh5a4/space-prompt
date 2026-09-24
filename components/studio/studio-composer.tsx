'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import { VoiceButton, VoiceStatus } from '@/components/studio/voice-button';
import { StudioResult } from '@/components/studio/studio-result';
import { StudioError } from '@/components/studio/studio-error';
import { SpaceOrbitAnimation } from '@/components/ui/space-orbit-animation';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { requestIntentAnalysis, type AnalyzeFailure } from '@/lib/analyze-client';
import { requestClarifications } from '@/lib/clarify-client';
import { buildPromptContext } from '@/lib/context/build-prompt-context';
import { requestPromptGeneration } from '@/lib/generate-client';
import { fadeUp, fadeIn } from '@/lib/motion';
import {
  appendTranscript,
  clampIdea,
  createPromptSession,
  isBlankIdea,
  STUDIO_EMPTY_INPUT_MESSAGE,
  STUDIO_INPUT_MAX_LENGTH,
} from '@/lib/studio';
import type { ClarificationAnswer, ClarificationQuestion, PromptSession } from '@/types';

import { StarField } from '@/components/ui/star-field';

export interface StudioComposerProps {
  initialIdea?: string;
  templateId?: string | null;
  categorySlug?: string | null;
}

function ThinkingIndicator({
  phases = ['Thinking...', 'Analyzing your idea...', 'Building prompt context...'],
}: {
  phases?: string[];
}) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [phases.length]);

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#262626] text-[#38BDF8]">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl bg-[#141414] border border-[#262626] px-4 py-3 text-xs text-[#8E8E93] flex items-center gap-2.5 shadow-sm">
        <span className="flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse [animation-delay:0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse [animation-delay:0.4s]" />
        </span>
        <span className="text-xs font-medium text-[#F2F2F2] transition-all duration-300">
          {phases[phaseIndex]}
        </span>
      </div>
    </div>
  );
}

export function StudioComposer({
  initialIdea = '',
  templateId = null,
  categorySlug = null,
}: StudioComposerProps) {
  const [ideaInput, setIdeaInput] = useState(() => clampIdea(initialIdea));
  const [session, setSession] = useState<PromptSession | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [failure, setFailure] = useState<AnalyzeFailure | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const { status: speechStatus, interimTranscript, error: speechError, toggleListening } =
    useSpeechRecognition({
      onResult: (chunk) => setIdeaInput((prev) => appendTranscript(prev, chunk)),
    });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session, currentQuestionIndex]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /**
   * Pipeline executor to start a prompt session
   */
  const handleStartNewSession = useCallback(
    async (userInputText: string) => {
      if (inFlightRef.current) return;

      const trimmed = userInputText.trim();
      if (!trimmed) {
        setValidationError(STUDIO_EMPTY_INPUT_MESSAGE);
        return;
      }

      setValidationError(null);
      setFailure(null);
      setIdeaInput('');

      const newSession = createPromptSession({
        originalInput: trimmed,
        templateId,
        categorySlug,
        status: 'analyzing',
      });

      setSession(newSession);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      inFlightRef.current = true;

      // 1. Analyze Intent
      const analyzeResult = await requestIntentAnalysis(
        {
          input: trimmed,
          categoryHint: categorySlug ?? null,
          templateId: templateId ?? null,
        },
        controller.signal,
      );

      if (controller.signal.aborted) {
        inFlightRef.current = false;
        return;
      }

      if (!analyzeResult.ok) {
        inFlightRef.current = false;
        setFailure(analyzeResult.error);
        setSession((curr) => (curr ? { ...curr, status: 'error' } : null));
        return;
      }

      const analyzedSession: PromptSession = {
        ...newSession,
        category: analyzeResult.analysis.category,
        analysis: analyzeResult.analysis,
      };

      // 2. Request Clarifications (keep status as 'analyzing' until clarifications arrive to avoid blank gap)
      const clarifyResult = await requestClarifications(
        {
          input: trimmed,
          analysis: analyzeResult.analysis,
          categoryHint: categorySlug ?? null,
          templateId: templateId ?? null,
        },
        controller.signal,
      );

      if (controller.signal.aborted) {
        inFlightRef.current = false;
        return;
      }

      if (!clarifyResult.ok) {
        inFlightRef.current = false;
        setFailure(clarifyResult.error);
        setSession((curr) => (curr ? { ...curr, status: 'error' } : null));
        return;
      }

      if (clarifyResult.clarifications && clarifyResult.clarifications.length > 0) {
        setSession({
          ...analyzedSession,
          status: 'clarifying',
          clarifications: clarifyResult.clarifications,
          clarificationAnswers: {},
        });
        setCurrentQuestionIndex(0);
        inFlightRef.current = false;
      } else {
        // No clarification needed: generate prompt directly
        const builtContext = buildPromptContext({
          originalInput: trimmed,
          analysis: analyzeResult.analysis,
          clarifications: [],
          clarificationAnswers: {},
          templateId: templateId ?? undefined,
          categoryHint: categorySlug ?? undefined,
        });

        const contextSession: PromptSession = {
          ...analyzedSession,
          status: 'generating',
          context: builtContext,
        };
        setSession(contextSession);

        const genResult = await requestPromptGeneration(
          { context: builtContext },
          controller.signal,
        );

        inFlightRef.current = false;
        if (controller.signal.aborted) return;

        if (genResult.ok) {
          setSession({
            ...contextSession,
            status: 'complete',
            title: genResult.title,
            variants: genResult.variants,
          });
        } else {
          setFailure(genResult.error);
          setSession((curr) => (curr ? { ...curr, status: 'error' } : null));
        }
      }
    },
    [categorySlug, templateId],
  );

  // Auto-start if initialIdea was provided via query param
  useEffect(() => {
    if (initialIdea && !session && !inFlightRef.current) {
      handleStartNewSession(initialIdea);
    }
  }, [initialIdea, session, handleStartNewSession]);

  /**
   * User selects an option chip or types an answer to a clarification question
   */
  const handleAnswerQuestion = useCallback(
    async (answer: ClarificationAnswer) => {
      if (!session || !session.clarifications || inFlightRef.current) return;

      const updatedAnswers = {
        ...(session.clarificationAnswers ?? {}),
        [answer.questionId]: answer,
      };

      const totalQ = session.clarifications.length;

      if (currentQuestionIndex < totalQ - 1) {
        setSession({
          ...session,
          clarificationAnswers: updatedAnswers,
        });
        setCurrentQuestionIndex((prev) => prev + 1);
        setIdeaInput('');
      } else {
        // All questions answered: build context and generate prompt
        inFlightRef.current = true;
        setIdeaInput('');

        const finalSession: PromptSession = {
          ...session,
          status: 'generating',
          clarificationAnswers: updatedAnswers,
        };

        if (!session.analysis) return;

        const builtContext = buildPromptContext({
          originalInput: session.originalInput,
          analysis: session.analysis,
          clarifications: session.clarifications,
          clarificationAnswers: updatedAnswers,
          templateId: session.templateId,
          categoryHint: session.categorySlug,
        });

        const generatingSession: PromptSession = {
          ...finalSession,
          status: 'generating',
          context: builtContext,
        };

        setSession(generatingSession);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const genResult = await requestPromptGeneration(
          { context: builtContext },
          controller.signal,
        );

        inFlightRef.current = false;
        if (controller.signal.aborted) return;

        if (genResult.ok) {
          setSession({
            ...generatingSession,
            status: 'complete',
            title: genResult.title,
            variants: genResult.variants,
          });
        } else {
          setFailure(genResult.error);
          setSession((curr) => (curr ? { ...curr, status: 'error' } : null));
        }
      }
    },
    [currentQuestionIndex, session],
  );

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBlankIdea(ideaInput)) return;

    if (!session || session.status === 'error' || session.status === 'complete') {
      void handleStartNewSession(ideaInput);
    } else if (session.status === 'clarifying' && session.clarifications) {
      const activeQ = session.clarifications[currentQuestionIndex];
      if (activeQ) {
        const answer: ClarificationAnswer = {
          questionId: activeQ.id,
          value: ideaInput.trim(),
          custom: true,
          delegatedToAI: false,
        };
        void handleAnswerQuestion(answer);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  const currentQuestions = session?.clarifications ?? [];
  const activeQuestion: ClarificationQuestion | undefined = currentQuestions[currentQuestionIndex];

  return (
    <div className="relative flex flex-col min-h-full max-w-3xl mx-auto px-4 pt-14 lg:pt-6 pb-32">
      <StarField />
      {/* Messages Stream */}
      <div className="flex-1 space-y-6">
        {/* Minimal Initial Empty Welcome State with Horizontal Astronomical Animation & Signature Text */}
        {!session && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 pt-20 sm:pt-32">
            {/* Left Side: Large Astronomical Orbit Animation */}
            <div className="shrink-0 flex items-center justify-center">
              <SpaceOrbitAnimation size="xl" />
            </div>

            {/* Right Side: Signature Typography */}
            <div className="flex flex-col text-center sm:text-left space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F2F2F2] leading-[0.92]">
                <span className="block">Space</span>
                <span className="block text-[#38BDF8]">Prompt.</span>
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#8E8E93] pt-1">
                Turn ideas into better prompts.
              </p>
            </div>
          </div>
        )}

        {/* Active Conversation Messages */}
        {session && (
          <div className="space-y-6">
            {/* User Initial Input Message */}
            <div className="flex items-start gap-3 justify-end">
              <div className="max-w-xl rounded-2xl bg-[#1A1A1A] border border-[#262626] px-4 py-3 text-sm text-[#F2F2F2]">
                <p className="whitespace-pre-wrap leading-relaxed">{session.originalInput}</p>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#242424] text-[#8E8E93] text-xs">
                <User className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Assistant Analyzing Message */}
            {session.status === 'analyzing' && (
              <motion.div variants={fadeIn} initial="hidden" animate="visible">
                <ThinkingIndicator
                  phases={[
                    'Thinking...',
                    'Analyzing intent & domain...',
                    'Formulating smart clarification questions...',
                  ]}
                />
              </motion.div>
            )}

            {/* Assistant Clarification Flow (One Question at a time with option chips) */}
            {session.status === 'clarifying' && (
              <div className="space-y-4">
                {/* Answered Clarifications History */}
                {session.clarifications &&
                  session.clarifications.slice(0, currentQuestionIndex).map((q) => {
                    const ans = session.clarificationAnswers?.[q.id];
                    return (
                      <div key={q.id} className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#262626] text-[#38BDF8]">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                          <div className="rounded-2xl bg-[#141414] border border-[#262626] px-4 py-3 text-sm text-[#F2F2F2]">
                            <p>{q.question}</p>
                          </div>
                        </div>

                        {ans && (
                          <div className="flex items-start gap-3 justify-end">
                            <div className="rounded-2xl bg-[#1A1A1A] border border-[#262626] px-4 py-2.5 text-sm text-[#F2F2F2]">
                              <span>{ans.value}</span>
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#242424] text-[#8E8E93] text-xs">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Active Question Message + Option Chips */}
                {activeQuestion ? (
                  <motion.div
                    key={activeQuestion.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#262626] text-[#38BDF8] mt-1">
                      <Bot className="h-3.5 w-3.5" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="rounded-2xl bg-[#141414] border border-[#262626] p-4 text-sm text-[#F2F2F2] space-y-1">
                        <p className="font-medium">{activeQuestion.question}</p>
                        {activeQuestion.description && (
                          <p className="text-xs text-[#8E8E93]">{activeQuestion.description}</p>
                        )}
                      </div>

                      {/* Selectable Option Chips under Assistant Message */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {activeQuestion.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleAnswerQuestion({
                                questionId: activeQuestion.id,
                                selectedOptionId: opt.id,
                                value: opt.value,
                                custom: opt.type === 'custom',
                                delegatedToAI: opt.type === 'ai-recommend',
                              })
                            }
                            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[#262626] bg-[#1A1A1A] text-[#F2F2F2] hover:border-[#38BDF8] hover:bg-[#242424] transition-all text-left"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div variants={fadeIn} initial="hidden" animate="visible">
                    <ThinkingIndicator
                      phases={['Thinking...', 'Loading questions...']}
                    />
                  </motion.div>
                )}
              </div>
            )}

            {/* Assistant Generating Message */}
            {session.status === 'generating' && (
              <motion.div variants={fadeIn} initial="hidden" animate="visible">
                <ThinkingIndicator
                  phases={[
                    'Thinking...',
                    'Synthesizing requirements into prompt context...',
                    'Building Balanced, Detailed & Expert variants...',
                  ]}
                />
              </motion.div>
            )}

            {/* Assistant Final Generated Prompt Result */}
            {session.status === 'complete' && session.variants && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#262626] text-[#38BDF8] mt-1">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <StudioResult
                    session={session}
                    variants={session.variants}
                    onRegenerate={() => handleStartNewSession(session.originalInput)}
                    onBackToContext={() => {}}
                    onStartOver={() => setSession(null)}
                  />
                </div>
              </motion.div>
            )}

            {/* Error message */}
            {session.status === 'error' && failure && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <StudioError
                  failure={failure}
                  onRetry={() => handleStartNewSession(session.originalInput)}
                  onEdit={() => setSession(null)}
                />
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Centered Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] p-3 sm:p-4 bg-[#0D0D0D] pointer-events-none z-30">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <form
            onSubmit={handleFormSubmit}
            className="relative rounded-2xl border border-[#262626] bg-[#1A1A1A] p-3 space-y-2 focus-within:border-[#38BDF8]/60 transition-colors shadow-lg"
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={ideaInput}
              onChange={(e) => {
                setIdeaInput(clampIdea(e.target.value));
                setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              maxLength={STUDIO_INPUT_MAX_LENGTH}
              placeholder={
                session?.status === 'clarifying'
                  ? 'Type custom response or select an option above...'
                  : 'Start with a rough idea...'
              }
              className="w-full resize-none bg-transparent text-sm text-[#F2F2F2] placeholder-[#8E8E93] focus:outline-none px-1"
            />

            {validationError && (
              <p className="text-xs text-red-400 px-1 font-medium">{validationError}</p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
              <div className="flex items-center gap-2">
                <VoiceStatus
                  status={speechStatus}
                  interimTranscript={interimTranscript}
                  error={speechError}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#636366] hidden sm:inline">
                  Enter to send
                </span>
                <VoiceButton status={speechStatus} onToggle={toggleListening} />
                <button
                  type="submit"
                  disabled={isBlankIdea(ideaInput) || session?.status === 'analyzing' || session?.status === 'generating'}
                  className="h-8 w-8 flex items-center justify-center rounded-xl bg-[#38BDF8] text-slate-950 hover:bg-[#0284C7] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
