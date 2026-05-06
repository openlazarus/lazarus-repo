'use client'

import * as m from 'motion/react-m'
import { memo } from 'react'

import { TypingIndicatorProps } from './types'

// iOS-style message tail CSS for typing indicator
const typingStyles = `
  .typing-with-tail {
    position: relative;
    z-index: 1;
  }

  .typing-with-tail::before,
  .typing-with-tail::after {
    position: absolute;
    bottom: 0;
    height: 25px;
    content: '';
    z-index: -1;
  }

  .typing-with-tail::before {
    width: 20px;
    left: -7px;
    background-color: hsl(var(--muted));
    border-bottom-right-radius: 16px 14px;
  }

  .dark .typing-with-tail::before {
    background-color: hsl(var(--chat-agent-bg));
  }

  .typing-with-tail::after {
    width: 26px;
    left: -26px;
    background-color: hsl(var(--background-secondary));
    border-bottom-right-radius: 10px;
  }
`

/**
 * TypingIndicator - Shows animated dots when someone is typing
 *
 * Features:
 * - Smooth dot animation inspired by iMessage
 * - Fade in/out transitions
 * - Performance optimized with memo
 */
export const TypingIndicator = memo<TypingIndicatorProps>(
  ({ isVisible, userName: _userName, className: _className }) => {
    if (!isVisible) return null

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: typingStyles }} />
        <div className='flex items-start gap-3'>
          {/* Typing bubble with iMessage style */}
          <div className='relative inline-block max-w-full'>
            <div className='message-bubble typing-with-tail relative inline-block max-w-full rounded-[18px] bg-muted px-[14px] py-[10px] text-foreground dark:bg-chat-agent-bg dark:text-white'>
              <m.div
                className='flex min-h-[22px] min-w-[40px] items-center justify-center gap-[6px]'
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.2 },
                }}
                exit={{ opacity: 0 }}>
                <m.span
                  className='block h-[8px] w-[8px] rounded-full bg-gray-400 dark:bg-gray-500'
                  initial={{ y: 0 }}
                  animate={{
                    y: [0, -3, 0],
                    opacity: [0.6, 1, 0.6],
                    transition: {
                      duration: 1.3,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      repeatDelay: 0,
                    },
                  }}
                />
                <m.span
                  className='block h-[8px] w-[8px] rounded-full bg-gray-400 dark:bg-gray-500'
                  initial={{ y: 0 }}
                  animate={{
                    y: [0, -3, 0],
                    opacity: [0.6, 1, 0.6],
                    transition: {
                      duration: 1.3,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      repeatDelay: 0,
                      delay: 0.2,
                    },
                  }}
                />
                <m.span
                  className='block h-[8px] w-[8px] rounded-full bg-gray-400 dark:bg-gray-500'
                  initial={{ y: 0 }}
                  animate={{
                    y: [0, -3, 0],
                    opacity: [0.6, 1, 0.6],
                    transition: {
                      duration: 1.3,
                      ease: 'easeInOut',
                      repeat: Infinity,
                      repeatDelay: 0,
                      delay: 0.4,
                    },
                  }}
                />
              </m.div>
            </div>
          </div>
        </div>
      </>
    )
  },
)

TypingIndicator.displayName = 'TypingIndicator'
