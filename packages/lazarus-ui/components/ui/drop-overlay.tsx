'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

interface DropOverlayProps {
  visible: boolean
  label?: string
  isUploading?: boolean
  /** Subtle mode: animated gradient border only — lets content remain visible */
  subtle?: boolean
}

export function DropOverlay({
  visible,
  label = 'Drop files here',
  isUploading = false,
  subtle = false,
}: DropOverlayProps) {
  if (subtle) {
    return (
      <AnimatePresence>
        {visible && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='pointer-events-none absolute inset-0 z-50 rounded-xl'
            style={{
              padding: '2px',
            }}>
            {/* Spinning conic gradient — clipped to the 2px border ring */}
            <div
              className='absolute inset-0 overflow-hidden rounded-xl'
              style={{
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
                padding: '2px',
              }}>
              <div
                className='absolute animate-border-sweep'
                style={{
                  inset: '-50%',
                  background:
                    'conic-gradient(from 0deg, transparent 0%, hsl(var(--lazarus-blue)) 25%, transparent 50%)',
                }}
              />
            </div>

            {/* Ambient pulsing glow */}
            <div
              className='absolute inset-0 animate-glow-pulse rounded-xl'
              style={{
                boxShadow:
                  '0 0 12px 2px hsl(var(--lazarus-blue) / 0.3), inset 0 0 12px 2px hsl(var(--lazarus-blue) / 0.1)',
              }}
            />
          </m.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='pointer-events-none absolute inset-0 z-50 rounded-xl'
          style={{
            padding: '2px',
          }}>
          {/* Spinning conic gradient border */}
          <div
            className='absolute inset-0 overflow-hidden rounded-xl'
            style={{
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: '2px',
            }}>
            <div
              className='absolute animate-border-sweep'
              style={{
                inset: '-50%',
                background:
                  'conic-gradient(from 0deg, transparent 0%, hsl(var(--lazarus-blue)) 25%, transparent 50%)',
              }}
            />
          </div>

          {/* Ambient pulsing glow */}
          <div
            className='absolute inset-0 animate-glow-pulse rounded-xl'
            style={{
              boxShadow:
                '0 0 12px 2px hsl(var(--lazarus-blue) / 0.3), inset 0 0 12px 2px hsl(var(--lazarus-blue) / 0.1)',
            }}
          />
        </m.div>
      )}
    </AnimatePresence>
  )
}
