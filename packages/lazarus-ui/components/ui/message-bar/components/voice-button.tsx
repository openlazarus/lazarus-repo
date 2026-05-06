'use client'

import { RiMicAiLine } from '@remixicon/react'
import { forwardRef, memo, useEffect, useRef } from 'react'

import { GlowEffect } from '@/components/ui/glow-effect'
import { AudioLinesIcon } from '@/components/ui/icons/audio-lines'
import { cn } from '@/lib/utils'

interface VoiceButtonProps {
  onClick: () => void
  size?: 'small' | 'default'
  variant?: 'mobile' | 'desktop'
  className?: string
  isRecording?: boolean
}

// The inner component that will be memoized
const VoiceButtonInner = forwardRef<HTMLButtonElement, VoiceButtonProps>(
  (
    {
      onClick,
      size = 'default',
      variant = 'desktop',
      className = '',
      isRecording = false,
    },
    ref,
  ) => {
    const isSmall = size === 'small'
    const audioLinesRef = useRef<any>(null)
    const prevRecordingState = useRef(isRecording)

    // Only handle animation when recording status actually changes
    useEffect(() => {
      if (prevRecordingState.current !== isRecording) {
        if (isRecording && audioLinesRef.current) {
          setTimeout(() => audioLinesRef.current.startAnimation(), 50)
        } else if (audioLinesRef.current) {
          audioLinesRef.current.stopAnimation()
        }
        prevRecordingState.current = isRecording
      }
    }, [isRecording])

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          'relative flex items-center gap-2 overflow-hidden rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors duration-200',
          isRecording
            ? 'bg-gradient-to-r from-[#0098FC]/10 via-[#0098FC]/15 to-[#0098FC]/10 shadow-[0_2px_8px_rgba(0,152,252,0.1)]'
            : variant === 'mobile'
              ? 'bg-black/[0.02] shadow-sm hover:bg-black/[0.06] active:bg-black/[0.09]'
              : 'bg-black/[0.02] shadow-sm hover:bg-black/[0.06] active:bg-black/[0.09]',
          isSmall ? 'h-8 text-sm' : 'h-9 text-sm',
          className,
        )}>
        {isRecording && (
          <GlowEffect className='opacity-70' intensity='medium' color='blue' />
        )}

        {/* Icon container with minimal styling */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-1 transition-all',
            isRecording
              ? 'bg-white/90 shadow-[0_0_0_1px_rgba(0,152,252,0.2)]'
              : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
          )}>
          <div className='relative flex h-[17px] w-[17px] items-center justify-center'>
            {/* Show mic icon when not recording */}
            {!isRecording && (
              <RiMicAiLine
                size={isSmall ? 15 : 17}
                className='text-[#0098FC]'
              />
            )}

            {/* Show audio lines when recording */}
            {isRecording && (
              <AudioLinesIcon
                ref={audioLinesRef}
                size={isSmall ? 15 : 17}
                className='text-[#0098FC]'
              />
            )}
          </div>
        </div>

        {/* Text with minimal styling */}
        <span
          className={cn(
            'select-none font-medium',
            isRecording
              ? 'text-[rgba(0,152,252,0.9)]'
              : 'text-[rgba(0,0,0,0.7)]',
          )}>
          {isRecording ? 'Tap again to send' : 'Use voice'}
        </span>
      </button>
    )
  },
)

VoiceButtonInner.displayName = 'VoiceButtonInner'

// Wrap with memo to prevent unnecessary rerenders
export const VoiceButton = memo(
  forwardRef<HTMLButtonElement, VoiceButtonProps>((props, ref) => {
    return <VoiceButtonInner {...props} ref={ref} />
  }),
)

VoiceButton.displayName = 'VoiceButton'
