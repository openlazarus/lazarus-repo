'use client'

import * as m from 'motion/react-m'
import { ComponentType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface OptionItem<T = string> {
  id: T
  icon?: ComponentType<{ className?: string; isDark?: boolean }>
  label: string
  description?: string
  rightContent?: ReactNode
  selected?: boolean
}

interface OptionListProps<T = string> {
  options: OptionItem<T>[]
  onOptionClick: (optionId: T) => void
  isDark?: boolean
  showDescriptions?: boolean
  animated?: boolean
  className?: string
}

const SPRING_ENTRANCE = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
}

export function OptionList<T = string>({
  options,
  onOptionClick,
  isDark = false,
  showDescriptions = false,
  animated = true,
  className,
}: OptionListProps<T>) {
  return (
    <div className={cn('space-y-0', className)}>
      {options.map((option, index) => {
        const Icon = option.icon

        const content = (
          <div
            role='button'
            tabIndex={0}
            onClick={() => onOptionClick(option.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOptionClick(option.id)
              }
            }}
            className={cn(
              'group relative w-full cursor-pointer border-b px-0 py-4 text-left',
              'transition-[background-color,transform] duration-200 ease-out',
              'active:scale-[0.995]',
              isDark
                ? 'border-white/5 hover:bg-white/[0.02]'
                : 'border-black/5 hover:bg-black/[0.01]',
              index === 0 &&
                (isDark
                  ? 'border-t border-t-white/5'
                  : 'border-t border-t-black/5'),
              option.selected && 'bg-[#0098FC]/[0.08]',
            )}>
            <div className='flex items-center gap-3 pl-4 transition-transform duration-200 ease-out group-hover:translate-x-1'>
              {Icon && (
                <Icon
                  className='h-[18px] w-[18px] transition-opacity'
                  isDark={isDark}
                />
              )}
              <div className='flex-1'>
                <div
                  className={cn(
                    'text-[14px] font-medium',
                    isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                  )}>
                  {option.label}
                </div>
                {showDescriptions && option.description && (
                  <div
                    className={cn(
                      'mt-0.5 text-[12px]',
                      isDark ? 'text-foreground/50' : 'text-[#666666]',
                    )}>
                    {option.description}
                  </div>
                )}
              </div>
              {option.rightContent && (
                <div className='pr-4'>{option.rightContent}</div>
              )}
            </div>
          </div>
        )

        if (!animated) return <div key={String(option.id)}>{content}</div>

        return (
          <m.div
            key={String(option.id)}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{
              ...SPRING_ENTRANCE,
              delay: 0.3 + index * 0.06,
            }}>
            {content}
          </m.div>
        )
      })}
    </div>
  )
}
