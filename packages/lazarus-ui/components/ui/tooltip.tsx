'use client'

import * as m from 'motion/react-m'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const tooltipHeight = tooltipRef.current?.offsetHeight || 24
      const tooltipWidth = tooltipRef.current?.offsetWidth || 0

      // Calculate centered position
      let left = rect.left + rect.width / 2 - tooltipWidth / 2
      // Position above the element with 6px gap
      const top =
        side === 'top' ? rect.top - tooltipHeight - 6 : rect.bottom + 6

      // Ensure tooltip doesn't go off-screen on the right
      const rightEdge = left + tooltipWidth
      if (rightEdge > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth - 8
      }

      // Ensure tooltip doesn't go off-screen on the left
      if (left < 8) {
        left = 8
      }

      setPosition({ top, left })
    }
  }, [isVisible, side, content])

  return (
    <div
      ref={triggerRef}
      className='inline-flex items-center justify-center'
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}>
      {children}
      {mounted &&
        isVisible &&
        createPortal(
          <m.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
            }}
            className={cn(
              'pointer-events-none z-[9999] whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium',
              'border border-black/10 bg-white text-black/80 shadow-lg',
              'dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white/90',
              className,
            )}>
            {content}
          </m.div>,
          document.body,
        )}
    </div>
  )
}
