'use client'

import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { ThemeMode } from '@/state/ui-state'

interface ThemeSelectorProps {
  value: ThemeMode
  onChange: (mode: ThemeMode) => void
  isDark?: boolean
  className?: string
}

const themes: ThemeMode[] = ['light', 'dark', 'system']

function ThemeIcon({
  mode,
  isSelected,
  isDark,
}: {
  mode: ThemeMode
  isSelected: boolean
  isDark: boolean
}) {
  const size = 24

  // Selected ring style
  const ringColor = isSelected ? '#0098FC' : 'transparent'
  const borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'

  if (mode === 'light') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        {/* Outer selection ring */}
        <circle
          cx='12'
          cy='12'
          r='11'
          fill='none'
          stroke={ringColor}
          strokeWidth='2'
        />
        {/* Main circle */}
        <circle
          cx='12'
          cy='12'
          r='8'
          fill='#FAFAFA'
          stroke={borderColor}
          strokeWidth='1'
        />
      </svg>
    )
  }

  if (mode === 'dark') {
    return (
      <svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
        {/* Outer selection ring */}
        <circle
          cx='12'
          cy='12'
          r='11'
          fill='none'
          stroke={ringColor}
          strokeWidth='2'
        />
        {/* Main circle */}
        <circle
          cx='12'
          cy='12'
          r='8'
          fill='#1d1d1f'
          stroke={borderColor}
          strokeWidth='1'
        />
      </svg>
    )
  }

  // System mode - half light, half dark (vertical split)
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
      {/* Outer selection ring */}
      <circle
        cx='12'
        cy='12'
        r='11'
        fill='none'
        stroke={ringColor}
        strokeWidth='2'
      />
      <defs>
        <clipPath id='system-clip-left'>
          <rect x='4' y='4' width='8' height='16' />
        </clipPath>
        <clipPath id='system-clip-right'>
          <rect x='12' y='4' width='8' height='16' />
        </clipPath>
      </defs>
      {/* Light half */}
      <circle
        cx='12'
        cy='12'
        r='8'
        fill='#FAFAFA'
        clipPath='url(#system-clip-left)'
      />
      {/* Dark half */}
      <circle
        cx='12'
        cy='12'
        r='8'
        fill='#1d1d1f'
        clipPath='url(#system-clip-right)'
      />
      {/* Border */}
      <circle
        cx='12'
        cy='12'
        r='8'
        fill='none'
        stroke={borderColor}
        strokeWidth='1'
      />
    </svg>
  )
}

export function ThemeSelector({
  value,
  onChange,
  isDark = false,
  className = '',
}: ThemeSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {themes.map((mode) => {
        const isSelected = value === mode

        return (
          <m.button
            key={mode}
            onClick={() => onChange(mode)}
            whileTap={{ opacity: 0.7 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'rounded-full p-0.5 transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0098FC] focus-visible:ring-offset-2',
            )}
            aria-pressed={isSelected}
            aria-label={`${mode} theme`}>
            <ThemeIcon mode={mode} isSelected={isSelected} isDark={isDark} />
          </m.button>
        )
      })}
    </div>
  )
}
