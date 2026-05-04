'use client'

import { RiCheckLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useCallback, useEffect, useRef } from 'react'

// iOS-style ease curves
const EXPAND_EASE = [0.25, 1, 0.5, 1]

interface EditModeProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export const EditMode = memo(
  ({ value, onChange, onSave, onCancel }: EditModeProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Focus the input on mount
    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        // Select all text
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)

        // Smoother animation without bouncing
        if (containerRef.current) {
          containerRef.current.animate(
            [
              { opacity: 0.9, transform: 'translateY(-4px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 220,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
              fill: 'forwards',
            },
          )
        }
      }
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        onSave()
      } else if (e.key === 'Escape') {
        onCancel()
      }
    }

    const handleSave = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onSave()
      },
      [onSave],
    )

    const handleCancel = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onCancel()
      },
      [onCancel],
    )

    return (
      <m.div
        ref={containerRef}
        initial={{ opacity: 0.9, y: 0 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.2,
            ease: EXPAND_EASE,
          },
        }}
        exit={{
          opacity: 0,
          y: -4,
          transition: {
            duration: 0.15,
            ease: EXPAND_EASE,
          },
        }}
        className='flex w-full flex-col gap-3 py-1'>
        <div className='relative'>
          <m.div
            initial={{ opacity: 0.8 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.2, ease: EXPAND_EASE },
            }}
            className='relative'>
            <m.input
              ref={inputRef}
              type='text'
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              initial={{ boxShadow: '0 0 0 0px rgba(0, 152, 252, 0)' }}
              animate={{
                boxShadow:
                  '0 0 0 3px rgba(0, 152, 252, 0.15), 0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: {
                  delay: 0.05,
                  duration: 0.2,
                  ease: EXPAND_EASE,
                },
              }}
              className='w-full rounded-lg border border-[#0098FC]/40 bg-white/95 px-3.5 py-2 text-[16px] font-medium tracking-tight text-gray-900 shadow-sm backdrop-blur-sm focus:border-[#0098FC] focus:outline-none dark:border-[#0098FC]/60 dark:bg-gray-900/95 dark:text-white dark:focus:border-[#4DB8FF]'
              style={{
                fontSize: '16px',
                lineHeight: '1.15',
                touchAction: 'manipulation',
                WebkitAppearance: 'none',
                WebkitTextSizeAdjust: '100%',
                caretColor: '#0098FC',
                transform: 'translateZ(0)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
              }}
            />
            <div className='pointer-events-none absolute left-0 right-0 top-0 h-full overflow-hidden rounded-lg'>
              <div className='absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50' />
            </div>
          </m.div>
          <m.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.7,
              transition: { delay: 0.1, duration: 0.2, ease: EXPAND_EASE },
            }}
            className='mt-1.5 pl-1 text-[11px] font-medium text-gray-500'>
            Press Enter to save, Esc to cancel
          </m.div>
        </div>

        <div className='flex justify-end gap-2'>
          <m.button
            whileHover={{
              backgroundColor: 'rgb(229, 231, 235)',
              scale: 1.02,
              transition: { duration: 0.15 },
            }}
            whileTap={{
              scale: 0.97,
              backgroundColor: 'rgb(224, 226, 230)',
              transition: { duration: 0.1 },
            }}
            onClick={handleCancel}
            className='flex h-8 items-center gap-1 rounded-md bg-gray-100 px-3.5 text-xs font-medium text-gray-700 shadow-sm transition-all'
            style={{
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}>
            Cancel
          </m.button>
          <m.button
            whileHover={{
              backgroundColor: 'rgb(0, 136, 229)',
              scale: 1.02,
              transition: { duration: 0.15 },
            }}
            whileTap={{
              scale: 0.97,
              backgroundColor: 'rgb(0, 126, 219)',
              transition: { duration: 0.1 },
            }}
            onClick={handleSave}
            className='flex h-8 items-center gap-1.5 rounded-md bg-[#0098FC] px-3.5 text-xs font-medium text-white shadow-sm transition-all'
            style={{
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}>
            <RiCheckLine
              size={14}
              className='relative'
              style={{ top: '-0.5px' }}
            />
            Save
          </m.button>
        </div>
      </m.div>
    )
  },
)

EditMode.displayName = 'EditMode'
