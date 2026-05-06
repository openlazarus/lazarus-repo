'use client'

import * as m from 'motion/react-m'
import { memo, useEffect, useRef, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import { AskUserQuestionRequest, ChatMessage } from '../types'
import { BaseMessage } from './base-message'

const OTHER_LABEL = '__other__'

export interface AskUserQuestionMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'ask-user-question'
      request: AskUserQuestionRequest
    }
  }
  onRespond?: (
    sessionId: string,
    requestId: string,
    answers: Record<string, string>,
  ) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
}

export const AskUserQuestionMessage = memo<AskUserQuestionMessageProps>(
  ({ message, onRespond, className, uiVariant = 'desktop' }) => {
    const { request } = message.variant
    const isAnswered = !!message.metadata?.askUserResponse
    const answeredData = message.metadata?.askUserResponse

    // Track selected answers per question (keyed by question text)
    const [selections, setSelections] = useState<Record<string, string[]>>({})
    // Track free text input per question (keyed by question text)
    const [otherText, setOtherText] = useState<Record<string, string>>({})
    // Refs for auto-focusing the text input
    const otherInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>(
      {},
    )

    const allQuestionsAnswered = request.questions.every((q) => {
      const selected = selections[q.question] || []
      if (selected.length === 0) return false
      // If "Other" is selected, require non-empty text
      if (selected.includes(OTHER_LABEL)) {
        return (otherText[q.question] || '').trim().length > 0
      }
      return true
    })

    const handleOptionToggle = (
      question: string,
      label: string,
      multiSelect: boolean,
    ) => {
      setSelections((prev) => {
        const current = prev[question] || []
        if (multiSelect) {
          // Toggle in multi-select mode
          if (current.includes(label)) {
            return { ...prev, [question]: current.filter((l) => l !== label) }
          } else {
            return { ...prev, [question]: [...current, label] }
          }
        } else {
          // Single select - replace
          return { ...prev, [question]: [label] }
        }
      })
    }

    // Auto-focus the "Other" text input when selected
    useEffect(() => {
      for (const q of request.questions) {
        const selected = selections[q.question] || []
        if (selected.includes(OTHER_LABEL)) {
          const ref = otherInputRefs.current[q.question]
          if (ref) {
            ref.focus()
          }
        }
      }
    }, [selections, request.questions])

    const handleSubmit = () => {
      if (!allQuestionsAnswered) return

      // Build answers map: question text -> selected label(s) or free text
      const answers: Record<string, string> = {}
      for (const q of request.questions) {
        const selected = selections[q.question] || []
        const labels = selected.map((s) =>
          s === OTHER_LABEL ? (otherText[q.question] || '').trim() : s,
        )
        answers[q.question] = labels.join(', ')
      }

      onRespond?.(request.sessionId, request.requestId, answers)
    }

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {/* Header row with spinner/checkmark */}
        <div className='flex px-4 py-1.5 text-sm'>
          <div className='flex max-w-[85%] gap-2'>
            <div className='flex shrink-0 pt-0.5'>
              {!isAnswered ? (
                <Spinner size='sm' className='shrink-0' />
              ) : (
                <i
                  className='ri-checkbox-circle-line shrink-0 text-[14px]'
                  style={{ color: 'hsl(var(--lazarus-blue))' }}
                />
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <span className='break-words text-[13px] font-medium leading-[18px] text-gray-500'>
                Lazarus has a question for you
                {!isAnswered && '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Question bubbles - only shown when not yet answered */}
        {!isAnswered && (
          <BaseMessage
            message={{
              ...message,
              role: 'assistant',
            }}
            showBubble={true}
            uiVariant={uiVariant}>
            <m.div
              className='space-y-4'
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                y: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                },
              }}>
              {request.questions.map((q, qIndex) => {
                const selected = selections[q.question] || []
                const isOtherSelected = selected.includes(OTHER_LABEL)

                return (
                  <div key={qIndex} className='space-y-2'>
                    {/* Header chip */}
                    <span
                      className='inline-block rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide'
                      style={{
                        backgroundColor: 'hsl(var(--lazarus-blue) / 0.1)',
                        color: 'hsl(var(--lazarus-blue))',
                      }}>
                      {q.header}
                    </span>

                    {/* Question text */}
                    <p
                      className='text-[14px] leading-[20px]'
                      style={{ color: 'hsl(var(--text-primary))' }}>
                      {q.question}
                    </p>

                    {/* Options */}
                    <div className='space-y-1.5'>
                      {q.options.map((opt, optIndex) => {
                        const isSelected = selected.includes(opt.label)

                        return (
                          <m.button
                            key={optIndex}
                            onClick={() =>
                              handleOptionToggle(
                                q.question,
                                opt.label,
                                q.multiSelect,
                              )
                            }
                            className={cn(
                              'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5',
                              'text-left transition-colors duration-150',
                              isSelected
                                ? 'bg-[hsl(var(--lazarus-blue)/0.08)]'
                                : 'hover:bg-gray-100/50 dark:hover:bg-white/10',
                            )}
                            style={
                              isSelected
                                ? {
                                    boxShadow:
                                      'inset 0 0 0 1.5px hsl(var(--lazarus-blue))',
                                  }
                                : undefined
                            }
                            whileTap={{ opacity: 0.8 }}>
                            {/* Radio / checkbox indicator */}
                            <div className='mt-0.5 flex shrink-0'>
                              <div
                                className={cn(
                                  'flex h-[16px] w-[16px] items-center justify-center rounded-full border-[1.5px] transition-colors duration-150',
                                  q.multiSelect && 'rounded-[4px]',
                                  isSelected
                                    ? 'border-[hsl(var(--lazarus-blue))] bg-[hsl(var(--lazarus-blue))]'
                                    : 'border-gray-300 dark:border-gray-600',
                                )}>
                                {isSelected && (
                                  <i className='ri-check-line text-[11px] text-white' />
                                )}
                              </div>
                            </div>

                            {/* Label and description */}
                            <div className='min-w-0 flex-1'>
                              <div
                                className='text-[14px] font-medium leading-[18px]'
                                style={{
                                  color: isSelected
                                    ? 'hsl(var(--lazarus-blue))'
                                    : 'hsl(var(--text-primary))',
                                }}>
                                {opt.label}
                              </div>
                              {opt.description && (
                                <div className='mt-0.5 text-[12px] leading-[16px] text-gray-500'>
                                  {opt.description}
                                </div>
                              )}
                            </div>
                          </m.button>
                        )
                      })}

                      {/* "Other" option — always available */}
                      <m.button
                        onClick={() =>
                          handleOptionToggle(
                            q.question,
                            OTHER_LABEL,
                            q.multiSelect,
                          )
                        }
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5',
                          'text-left transition-colors duration-150',
                          isOtherSelected
                            ? 'bg-[hsl(var(--lazarus-blue)/0.08)]'
                            : 'hover:bg-gray-100/50 dark:hover:bg-white/10',
                        )}
                        style={
                          isOtherSelected
                            ? {
                                boxShadow:
                                  'inset 0 0 0 1.5px hsl(var(--lazarus-blue))',
                              }
                            : undefined
                        }
                        whileTap={{ opacity: 0.8 }}>
                        <div className='mt-0.5 flex shrink-0'>
                          <div
                            className={cn(
                              'flex h-[16px] w-[16px] items-center justify-center rounded-full border-[1.5px] transition-colors duration-150',
                              q.multiSelect && 'rounded-[4px]',
                              isOtherSelected
                                ? 'border-[hsl(var(--lazarus-blue))] bg-[hsl(var(--lazarus-blue))]'
                                : 'border-gray-300 dark:border-gray-600',
                            )}>
                            {isOtherSelected && (
                              <i className='ri-check-line text-[11px] text-white' />
                            )}
                          </div>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div
                            className='text-[14px] font-medium leading-[18px]'
                            style={{
                              color: isOtherSelected
                                ? 'hsl(var(--lazarus-blue))'
                                : 'hsl(var(--text-primary))',
                            }}>
                            Other
                          </div>
                          <div className='mt-0.5 text-[12px] leading-[16px] text-gray-500'>
                            Provide your own answer
                          </div>
                        </div>
                      </m.button>

                      {/* Free text input — shown when "Other" is selected */}
                      {isOtherSelected && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className='pl-[34px]'>
                          <textarea
                            ref={(el) => {
                              otherInputRefs.current[q.question] = el
                            }}
                            value={otherText[q.question] || ''}
                            onChange={(e) =>
                              setOtherText((prev) => ({
                                ...prev,
                                [q.question]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Enter' &&
                                !e.shiftKey &&
                                allQuestionsAnswered
                              ) {
                                e.preventDefault()
                                handleSubmit()
                              }
                            }}
                            placeholder='Type your answer...'
                            rows={2}
                            className={cn(
                              'w-full resize-none rounded-lg border px-3 py-2',
                              'text-[13px] leading-[18px] placeholder:text-gray-400',
                              'bg-white dark:bg-white/5',
                              'border-gray-200 dark:border-gray-700',
                              'focus:border-[hsl(var(--lazarus-blue))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--lazarus-blue))]',
                              'transition-colors duration-150',
                            )}
                            style={{ color: 'hsl(var(--text-primary))' }}
                          />
                        </m.div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Submit button */}
              <m.button
                onClick={handleSubmit}
                disabled={!allQuestionsAnswered}
                className={cn(
                  'w-full rounded-lg px-3 py-2.5',
                  'text-center text-[14px] font-medium transition-colors duration-200',
                  allQuestionsAnswered
                    ? 'bg-[hsl(var(--lazarus-blue))] text-white hover:bg-[hsl(var(--lazarus-blue)/0.9)]'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
                )}
                whileTap={allQuestionsAnswered ? { opacity: 0.8 } : undefined}>
                Submit
              </m.button>
            </m.div>
          </BaseMessage>
        )}

        {/* User response bubble - after answering */}
        {isAnswered && answeredData && (
          <BaseMessage
            message={{
              ...message,
              role: 'user',
            }}
            uiVariant={uiVariant}>
            <div className='space-y-1'>
              {Object.entries(answeredData.answers).map(
                ([question, answer], idx) => (
                  <div key={idx} className='text-[14px] text-white'>
                    <span className='font-medium'>{answer}</span>
                  </div>
                ),
              )}
            </div>
          </BaseMessage>
        )}
      </div>
    )
  },
)

AskUserQuestionMessage.displayName = 'AskUserQuestionMessage'
