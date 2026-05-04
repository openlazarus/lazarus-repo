'use client'

import {
  RiDatabase2Line,
  RiEditLine,
  RiGlobalLine,
  RiMailLine,
  RiMoneyDollarCircleLine,
  RiTerminalLine,
} from '@remixicon/react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'

import type { GuardrailConfig, PermissionLevel } from './guardrail-types'
import { PERMISSION_COLORS, PERMISSION_LABELS } from './guardrail-types'

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  RiEditLine,
  RiTerminalLine,
  RiGlobalLine,
  RiDatabase2Line,
  RiMailLine,
  RiMoneyDollarCircleLine,
}

const PERMISSION_OPTIONS: { id: PermissionLevel; label: string }[] = [
  { id: 'always_allowed', label: PERMISSION_LABELS.always_allowed },
  { id: 'ask_first', label: PERMISSION_LABELS.ask_first },
  { id: 'never_allowed', label: PERMISSION_LABELS.never_allowed },
]

const ACTIVE_COLOR_MAP: Partial<Record<PermissionLevel, string>> = {
  always_allowed: PERMISSION_COLORS.always_allowed,
  ask_first: PERMISSION_COLORS.ask_first,
  never_allowed: PERMISSION_COLORS.never_allowed,
}

interface GuardrailCardProps {
  categoryId: string
  label: string
  description: string
  icon: string
  config: GuardrailConfig
  onChange: (config: GuardrailConfig) => void
  isDark: boolean
  readOnly?: boolean
  index?: number
  isFirst?: boolean
}

export function GuardrailCard({
  categoryId,
  label,
  description,
  icon,
  config,
  onChange,
  isDark,
  readOnly = false,
  index = 0,
  isFirst = false,
}: GuardrailCardProps) {
  const IconComponent = ICON_MAP[icon] || RiEditLine

  const handleLevelChange = (level: PermissionLevel) => {
    onChange({
      ...config,
      level,
      conditions: level === 'ask_first' ? config.conditions : undefined,
    })
  }

  const handleConditionsChange = (conditions: string) => {
    onChange({ ...config, conditions })
  }

  return (
    <m.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        'border-b px-0 py-4',
        isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
        isFirst &&
          (isDark
            ? 'border-t border-t-white/[0.06]'
            : 'border-t border-t-black/[0.06]'),
      )}>
      <div className='flex items-center justify-between gap-4'>
        {/* Left: icon + text */}
        <div className='flex items-center gap-3'>
          <IconComponent size={18} className='flex-shrink-0 opacity-40' />
          <div>
            <p className='text-[13px] font-medium'>{label}</p>
            <p
              className={cn(
                'mt-0.5 text-[11px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              {description}
            </p>
          </div>
        </div>

        {/* Right: control or badge */}
        {readOnly ? (
          <div
            className='flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-white'
            style={{ backgroundColor: PERMISSION_COLORS[config.level] }}>
            {PERMISSION_LABELS[config.level]}
          </div>
        ) : (
          <div className='flex-shrink-0'>
            <SegmentedControl
              options={PERMISSION_OPTIONS}
              value={config.level}
              onChange={handleLevelChange}
              isDark={isDark}
              activeColorMap={ACTIVE_COLOR_MAP}
            />
          </div>
        )}
      </div>

      {/* Conditions field (slides open when "Ask" is selected) */}
      <AnimatePresence>
        {config.level === 'ask_first' && !readOnly && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className='overflow-hidden'>
            <Input
              type='text'
              value={config.conditions || ''}
              onChange={(e) => handleConditionsChange(e.target.value)}
              placeholder='When should the agent ask? (optional)'
              variant='ghost'
              size='small'
              isDark={isDark}
              className='mt-3'
            />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}
