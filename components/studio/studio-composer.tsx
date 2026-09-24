'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, User } from 'lucide-react';
import { VoiceButton, VoiceStatus } from '@/components/studio/voice-button';
import { StudioResult } from '@/components/studio/studio-result';
import { AssistantMark } from '@/components/ui/assistant-mark';
import { SpaceOrbitAnimation } from '@/components/ui/space-orbit-animation';
import { StarField } from '@/components/ui/star-field';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { requestIntentAnalysis } from '@/lib/analyze-client';
import { requestClarifications } from '@/lib/clarify-client';
import { buildPromptContext } from '@/lib/context/build-prompt-context';
import { requestPromptGeneration } from '@/lib/generate-client';
import { requestPromptRefinement } from '@/lib/refine-client';
import { requestSavePrompt, requestFetchPromptById } from '@/lib/prompts-client';
import { fadeUp } from '@/lib/motion';
import {
  appendTranscript,
  clampIdea,
  createPromptSession,
  isBlankIdea,
  STUDIO_EMPTY_INPUT_MESSAGE,
  STUDIO_INPUT_MAX_LENGTH,
} from '@/lib/studio';
import type { ClarificationAnswer, ClarificationQuestion, PromptSession } from '@/types';

export interface StudioComposerProps {
  initialIdea?: string;
  templateId?: string | null;
  categorySlug?: string | null;
  promptId?: string | null;
}

export type ChatMessage =
  | { id: string; role: 'user'; type: 'user'; content: string }
  | { id: string; role: 'assistant'; type: 'thinking'; content: string }
  | {
      id: string;
      role: 'assistant';
      type: 'clarification';
      question: ClarificationQuestion;
      questionIndex: number;
      isAnswered: boolean;
      selectedAnswer?: string;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'prompt';
      promptText: string;
      title: string;
      savedPromptId?: string;
      isLatestPrompt: boolean;
    }
  | { id: string; role: 'assistant'; type: 'error'; content: string };

function ThinkingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <AssistantMark size="md" />
      <div className="flex items-center gap-2 text-[14px] font-medium text-[#A1A1AA]">
        <span>{label}</span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse [animation-delay:0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse [animation-delay:0.4s]" />
        </span>
      </div>
    </div>
  );
}

export function StudioComposer({
  initialIdea = '',
  templateId = null,
  categorySlug = null,
  promptId = null,
}: StudioComposerProps) {
  const [ideaInput, setIdeaInput] = useState(() => clampIdea(initialIdea));
  const [session, setSession] = useState<PromptSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Load existing prompt by promptId if provided
  useEffect(() => {
    if (promptId && messages.length === 0 && !inFlightRef.current) {
      void (async () => {
        setIsProcessing(true);
        const res = await requestFetchPromptById(promptId);
        setIsProcessing(false);
        if (res.ok) {
          const loadedSession = createPromptSession({
            originalInput: res.prompt.originalInput,
            status: 'complete',
          });
          setSession({
            ...loadedSession,
            savedPromptId: res.prompt.id,
            title: res.prompt.title,
            context: res.prompt.context,
          });

          setMessages([
            {
              id: `user-saved-${res.prompt.id}`,
              role: 'user',
              type: 'user',
              content: res.prompt.originalInput,
            },
            {
              id: `prompt-saved-${res.prompt.id}`,
              role: 'assistant',
              type: 'prompt',
              promptText: res.prompt.balancedPrompt,
              title: res.prompt.title,
              savedPromptId: res.prompt.id,
              isLatestPrompt: true,
            },
          ]);
        }
      })();
    }
  }, [promptId, messages.length]);

  /**
   * Start a new chat session from user initial input
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
      setIdeaInput('');
      setIsProcessing(true);

      const userMsg: ChatMessage = {
        id: `user-init-${Date.now()}`,
        role: 'user',
        type: 'user',
        content: trimmed,
      };

      const thinkingMsg: ChatMessage = {
        id: `thinking-init-${Date.now()}`,
        role: 'assistant',
        type: 'thinking',
        content: 'Thinking',
      };

      setMessages([userMsg, thinkingMsg]);

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
        setIsProcessing(false);
        return;
      }

      if (!analyzeResult.ok) {
        inFlightRef.current = false;
        setIsProcessing(false);
        setMessages((prev) =>
          prev
            .filter((m) => m.type !== 'thinking')
            .concat({
              id: `err-${Date.now()}`,
              role: 'assistant',
              type: 'error',
              content: analyzeResult.error.message || 'Analysis failed. Please try again.',
            }),
        );
        return;
      }

      const analyzedSession: PromptSession = {
        ...newSession,
        category: analyzeResult.analysis.category,
        analysis: analyzeResult.analysis,
      };

      // 2. Request Clarifications
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
        setIsProcessing(false);
        return;
      }

      if (!clarifyResult.ok) {
        inFlightRef.current = false;
        setIsProcessing(false);
        setMessages((prev) =>
          prev
            .filter((m) => m.type !== 'thinking')
            .concat({
              id: `err-${Date.now()}`,
              role: 'assistant',
              type: 'error',
              content: clarifyResult.error.message || 'Clarification failed. Please try again.',
            }),
        );
        return;
      }

      if (clarifyResult.clarifications && clarifyResult.clarifications.length > 0) {
        const fullSession: PromptSession = {
          ...analyzedSession,
          status: 'clarifying',
          clarifications: clarifyResult.clarifications,
          clarificationAnswers: {},
        };
        setSession(fullSession);
        setCurrentQuestionIndex(0);
        inFlightRef.current = false;
        setIsProcessing(false);

        const firstQ = clarifyResult.clarifications[0];
        const qMsg: ChatMessage = {
          id: `q-0-${Date.now()}`,
          role: 'assistant',
          type: 'clarification',
          question: firstQ,
          questionIndex: 0,
          isAnswered: false,
        };

        setMessages((prev) => prev.filter((m) => m.type !== 'thinking').concat(qMsg));
      } else {
        // Direct generation if no clarification needed
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

        // Update thinking label to 'Writing prompt'
        setMessages((prev) =>
          prev.map((m) => (m.type === 'thinking' ? { ...m, content: 'Writing prompt' } : m)),
        );

        const genResult = await requestPromptGeneration(
          { context: builtContext },
          controller.signal,
        );

        inFlightRef.current = false;
        setIsProcessing(false);
        if (controller.signal.aborted) return;

        if (genResult.ok) {
          const updatedSession = {
            ...contextSession,
            status: 'complete' as const,
            title: genResult.title,
            variants: genResult.variants,
          };
          setSession(updatedSession);

          const promptMsg: ChatMessage = {
            id: `prompt-init-${Date.now()}`,
            role: 'assistant',
            type: 'prompt',
            promptText: genResult.variants.balanced.prompt,
            title: genResult.title,
            isLatestPrompt: true,
          };

          setMessages((prev) => prev.filter((m) => m.type !== 'thinking').concat(promptMsg));
          window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
        } else {
          setMessages((prev) =>
            prev
              .filter((m) => m.type !== 'thinking')
              .concat({
                id: `err-${Date.now()}`,
                role: 'assistant',
                type: 'error',
                content: genResult.error.message || 'Generation failed. Please try again.',
              }),
          );
        }
      }
    },
    [categorySlug, templateId],
  );

  // Auto-start if initialIdea was provided
  useEffect(() => {
    if (initialIdea && !session && !inFlightRef.current && !promptId) {
      handleStartNewSession(initialIdea);
    }
  }, [initialIdea, session, handleStartNewSession, promptId]);

  /**
   * User answers a clarification question
   */
  const handleAnswerQuestion = useCallback(
    async (answer: ClarificationAnswer) => {
      if (!session || !session.clarifications || inFlightRef.current) return;

      const updatedAnswers = {
        ...(session.clarificationAnswers ?? {}),
        [answer.questionId]: answer,
      };

      const totalQ = session.clarifications.length;

      // 1. Mark active question message as answered
      setMessages((prev) =>
        prev.map((m) =>
          m.type === 'clarification' && m.question.id === answer.questionId
            ? { ...m, isAnswered: true, selectedAnswer: answer.value }
            : m,
        ),
      );

      // 2. Append user answer message
      const userAnsMsg: ChatMessage = {
        id: `user-ans-${Date.now()}`,
        role: 'user',
        type: 'user',
        content: answer.value,
      };

      if (currentQuestionIndex < totalQ - 1) {
        const nextIdx = currentQuestionIndex + 1;
        const nextQ = session.clarifications[nextIdx];

        const nextQMsg: ChatMessage = {
          id: `q-${nextIdx}-${Date.now()}`,
          role: 'assistant',
          type: 'clarification',
          question: nextQ,
          questionIndex: nextIdx,
          isAnswered: false,
        };

        setSession({
          ...session,
          clarificationAnswers: updatedAnswers,
        });
        setCurrentQuestionIndex(nextIdx);
        setIdeaInput('');

        setMessages((prev) => [...prev, userAnsMsg, nextQMsg]);
      } else {
        // All questions answered -> generate final prompt
        inFlightRef.current = true;
        setIsProcessing(true);
        setIdeaInput('');

        const thinkingMsg: ChatMessage = {
          id: `thinking-gen-${Date.now()}`,
          role: 'assistant',
          type: 'thinking',
          content: 'Writing prompt',
        };

        setMessages((prev) => [...prev, userAnsMsg, thinkingMsg]);

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
          ...session,
          status: 'generating',
          clarificationAnswers: updatedAnswers,
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
        setIsProcessing(false);
        if (controller.signal.aborted) return;

        if (genResult.ok) {
          const completedSession = {
            ...generatingSession,
            status: 'complete' as const,
            title: genResult.title,
            variants: genResult.variants,
          };
          setSession(completedSession);

          const promptMsg: ChatMessage = {
            id: `prompt-final-${Date.now()}`,
            role: 'assistant',
            type: 'prompt',
            promptText: genResult.variants.balanced.prompt,
            title: genResult.title,
            isLatestPrompt: true,
          };

          setMessages((prev) => prev.filter((m) => m.type !== 'thinking').concat(promptMsg));
          window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
        } else {
          setMessages((prev) =>
            prev
              .filter((m) => m.type !== 'thinking')
              .concat({
                id: `err-${Date.now()}`,
                role: 'assistant',
                type: 'error',
                content: genResult.error.message || 'Generation failed. Please try again.',
              }),
          );
        }
      }
    },
    [currentQuestionIndex, session],
  );

  /**
   * Handle Refinement request
   */
  const handleRefine = useCallback(
    async (mode: 'shorter' | 'detailed' | 'creative') => {
      if (!session || !session.context || inFlightRef.current) return;

      const latestPromptMsg = [...messages].reverse().find((m) => m.type === 'prompt') as
        | (ChatMessage & { type: 'prompt' })
        | undefined;

      const currentPromptText = latestPromptMsg?.promptText;
      if (!currentPromptText) return;

      const modeLabels: Record<'shorter' | 'detailed' | 'creative', string> = {
        shorter: 'Make it short',
        detailed: 'Make it more detailed',
        creative: 'Creative',
      };

      const userLabel = modeLabels[mode];
      inFlightRef.current = true;
      setIsProcessing(true);

      setMessages((prev) =>
        prev.map((m) => (m.type === 'prompt' ? { ...m, isLatestPrompt: false } : m)),
      );

      const userRefineMsg: ChatMessage = {
        id: `user-refine-${Date.now()}`,
        role: 'user',
        type: 'user',
        content: userLabel,
      };

      const thinkingMsg: ChatMessage = {
        id: `thinking-refine-${Date.now()}`,
        role: 'assistant',
        type: 'thinking',
        content: 'Writing prompt',
      };

      setMessages((prev) => [...prev, userRefineMsg, thinkingMsg]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await requestPromptRefinement(
        {
          prompt: currentPromptText,
          context: session.context,
          mode,
        },
        controller.signal,
      );

      inFlightRef.current = false;
      setIsProcessing(false);
      if (controller.signal.aborted) return;

      if (res.ok) {
        const refinedPromptMsg: ChatMessage = {
          id: `prompt-refine-${Date.now()}`,
          role: 'assistant',
          type: 'prompt',
          promptText: res.refinedPrompt,
          title: session.title || 'Refined Prompt',
          isLatestPrompt: true,
          savedPromptId: session.savedPromptId,
        };

        setMessages((prev) => prev.filter((m) => m.type !== 'thinking').concat(refinedPromptMsg));
        window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
      } else {
        setMessages((prev) =>
          prev
            .filter((m) => m.type !== 'thinking')
            .concat({
              id: `err-${Date.now()}`,
              role: 'assistant',
              type: 'error',
              content: "I couldn't refine that prompt. Please try again.",
            }),
        );
      }
    },
    [messages, session],
  );

  /**
   * Save prompt callback
   */
  const handleSavePrompt = useCallback(
    async (promptText: string): Promise<string | undefined> => {
      if (!session || !session.context) return undefined;
      const res = await requestSavePrompt({
        id: session.savedPromptId,
        title: session.title || 'Generated Prompt',
        originalInput: session.originalInput,
        category: session.context.category,
        context: session.context,
        balancedPrompt: promptText,
        detailedPrompt: promptText,
        expertPrompt: promptText,
      });

      if (res.ok) {
        setSession((curr) => (curr ? { ...curr, savedPromptId: res.prompt.id } : null));
        window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
        return res.prompt.id;
      }
      return undefined;
    },
    [session],
  );

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBlankIdea(ideaInput)) return;

    if (!session || session.status === 'error' || messages.length === 0) {
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

  return (
    <div className="relative flex flex-col h-full bg-[#0B0B0C]">
      <StarField />

      {/* Main Conversation Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-14 lg:pt-6 pb-36">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Empty Welcome State */}
          {messages.length === 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 pt-16 sm:pt-32">
              <div className="shrink-0 flex items-center justify-center">
                <SpaceOrbitAnimation size="xl" />
              </div>
              <div className="flex flex-col text-center sm:text-left space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F4F4F5] leading-[0.92]">
                  <span className="block">Space</span>
                  <span className="block text-[#38BDF8]">Prompt.</span>
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#A1A1AA] pt-1">
                  Turn ideas into better prompts.
                </p>
              </div>
            </div>
          )}

          {/* Active Conversation Messages Stream */}
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex items-start gap-2.5 justify-end my-2">
                  <div className="max-w-[82%] sm:max-w-xl rounded-2xl bg-[#181819] border border-[#29292B] px-4 py-3 text-[15px] text-[#F4F4F5] shadow-xs">
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#29292B] text-[#A1A1AA] text-xs mt-1">
                    <User className="h-3 w-3" />
                  </div>
                </div>
              );
            }

            if (msg.type === 'thinking') {
              return <ThinkingIndicator key={msg.id} label={msg.content} />;
            }

            if (msg.type === 'error') {
              return (
                <div key={msg.id} className="flex items-start gap-3 my-2">
                  <AssistantMark size="md" className="mt-1" />
                  <div className="rounded-2xl bg-[#181819] border border-red-500/30 px-4 py-3 text-[14px] text-red-300 max-w-xl">
                    <p>{msg.content}</p>
                  </div>
                </div>
              );
            }

            if (msg.type === 'clarification') {
              const q = msg.question;
              return (
                <motion.div
                  key={msg.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="flex items-start gap-3 my-2"
                >
                  <AssistantMark size="md" className="mt-1" />

                  <div className="flex-1 space-y-3">
                    <div className="text-[15px] text-[#F4F4F5] leading-relaxed space-y-1">
                      <p className="font-medium">{q.question}</p>
                      {q.description && (
                        <p className="text-xs text-[#A1A1AA]">{q.description}</p>
                      )}
                    </div>

                    {!msg.isAnswered && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {q.options.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleAnswerQuestion({
                                questionId: q.id,
                                selectedOptionId: opt.id,
                                value: opt.value,
                                custom: opt.type === 'custom',
                                delegatedToAI: opt.type === 'ai-recommend',
                              })
                            }
                            className="px-3.5 py-1.5 rounded-xl text-[13px] sm:text-[14px] font-medium border border-[#29292B] bg-[#181819] text-[#F4F4F5] hover:border-[#38BDF8]/60 hover:bg-[#242424] transition-all cursor-pointer"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }

            if (msg.type === 'prompt') {
              return (
                <motion.div
                  key={msg.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="flex items-start gap-3 my-3"
                >
                  <AssistantMark size="md" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <StudioResult
                      promptText={msg.promptText}
                      title={msg.title}
                      savedPromptId={msg.savedPromptId}
                      isLatestPrompt={msg.isLatestPrompt}
                      onSave={handleSavePrompt}
                      onRefine={handleRefine}
                    />
                  </div>
                </motion.div>
              );
            }

            return null;
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Bottom Input Composer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] p-2.5 sm:p-4 bg-[#0B0B0C]/90 backdrop-blur-md z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleFormSubmit}
            className="relative rounded-2xl border border-[#29292B] bg-[#1C1C1D] p-3 space-y-2 focus-within:border-[#38BDF8]/60 transition-colors shadow-lg"
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
              className="w-full min-h-[44px] sm:min-h-[48px] resize-none bg-transparent text-[15px] sm:text-[16px] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none px-1"
            />

            {validationError && (
              <p className="text-xs text-red-400 px-1 font-medium">{validationError}</p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-[#29292B]">
              <div className="flex items-center gap-2">
                <VoiceStatus
                  status={speechStatus}
                  interimTranscript={interimTranscript}
                  error={speechError}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#71717A] hidden sm:inline">
                  Enter to send
                </span>
                <VoiceButton status={speechStatus} onToggle={toggleListening} />
                <button
                  type="submit"
                  disabled={isBlankIdea(ideaInput) || isProcessing}
                  className="h-8 w-8 flex items-center justify-center rounded-xl bg-[#38BDF8] text-slate-950 hover:bg-[#0284C7] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
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
