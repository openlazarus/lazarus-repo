'use client'

import * as m from 'motion/react-m'
import { useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  isDark: boolean
  activeColorMap?: Partial<Record<T, string>>
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
  activeColorMap,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const idx = options.findIndex((o) => o.id === value)
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-seg]')
    const btn = buttons[idx]
    if (btn) {
      setIndicatorStyle({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
      })
    }
  }, [value, options])

  const activeColor = activeColorMap?.[value]

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex rounded-full p-0.5',
        isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]',
      )}>
      <m.div
        className={cn(
          'absolute bottom-0.5 top-0.5 rounded-full',
          !activeColor && (isDark ? 'bg-white/[0.12]' : 'bg-white shadow-sm'),
        )}
        style={activeColor ? { backgroundColor: activeColor } : undefined}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
      {options.map((option) => (
        <button
          key={option.id}
          data-seg
          type='button'
          onClick={() => onChange(option.id)}
          className={cn(
            'relative z-10 px-3 py-1.5 text-[12px] font-medium transition-colors',
            'rounded-full',
            value === option.id
              ? activeColor
                ? 'text-white'
                : isDark
                  ? 'text-white'
                  : 'text-[#1a1a1a]'
              : isDark
                ? 'text-white/40 hover:text-white/60'
                : 'text-black/40 hover:text-black/60',
          )}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
