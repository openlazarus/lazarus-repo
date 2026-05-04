'use client'

import { RiArrowDownSLine, RiCloseLine } from '@remixicon/react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
  color?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  isDark?: boolean
  size?: 'small' | 'medium'
  className?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isDark = false,
  size = 'small',
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  const selectedOptions = options.filter((o) => value.includes(o.value))

  const sizes = {
    small: {
      trigger: 'min-h-7 text-[12px] px-2.5 py-1',
      dropdown: 'text-[12px]',
      chip: 'text-[10px] px-1.5 py-0.5',
      option: 'px-2.5 py-1.5',
    },
    medium: {
      trigger: 'min-h-8 text-sm px-3 py-1.5',
      dropdown: 'text-sm',
      chip: 'text-[11px] px-2 py-0.5',
      option: 'px-3 py-2',
    },
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-xl border font-medium transition-all duration-200',
          'focus:shadow-[0_0_0_3px_rgba(0,152,252,0.1)] focus:outline-none focus:ring-2 focus:ring-[#0098FC]',
          sizes[size].trigger,
          isDark
            ? 'border-white/[0.12] bg-[hsl(var(--input))]'
            : 'border-black/[0.08] bg-[hsl(var(--input))]',
          isDark ? 'text-white' : 'text-black',
        )}>
        <div className='flex flex-1 flex-wrap gap-1'>
          {selectedOptions.length === 0 ? (
            <span className={isDark ? 'text-white/40' : 'text-black/40'}>
              {placeholder}
            </span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full font-medium',
                  sizes[size].chip,
                  isDark
                    ? 'bg-white/10 text-white/80'
                    : 'bg-black/5 text-black/70',
                )}>
                {opt.color && opt.color !== '#000000' && (
                  <span
                    className='h-1.5 w-1.5 rounded-full'
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.label}
                <RiCloseLine
                  className='h-3 w-3 cursor-pointer hover:opacity-70'
                  onClick={(e) => removeOption(opt.value, e)}
                />
              </span>
            ))
          )}
        </div>
        <RiArrowDownSLine
          size={14}
          className={cn(
            'shrink-0 transition-transform',
            isOpen && 'rotate-180',
            isDark ? 'text-white/40' : 'text-black/40',
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-xl border shadow-lg',
            sizes[size].dropdown,
            isDark
              ? 'border-white/[0.12] bg-[hsl(var(--background))]'
              : 'border-black/[0.08] bg-white',
          )}>
          <div className='max-h-48 overflow-y-auto py-1'>
            {options.map((opt) => {
              const isSelected = value.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type='button'
                  onClick={() => toggleOption(opt.value)}
                  className={cn(
                    'flex w-full items-center gap-2 transition-colors',
                    sizes[size].option,
                    isSelected
                      ? isDark
                        ? 'bg-[#0098FC]/10'
                        : 'bg-[#0098FC]/5'
                      : isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-black/5',
                  )}>
                  <div
                    className={cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-[#0098FC] bg-[#0098FC]'
                        : isDark
                          ? 'border-white/20'
                          : 'border-black/20',
                    )}>
                    {isSelected && (
                      <svg
                        className='h-2.5 w-2.5 text-white'
                        viewBox='0 0 12 12'
                        fill='none'>
                        <path
                          d='M2 6l3 3 5-5'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    )}
                  </div>
                  {opt.color && opt.color !== '#000000' && (
                    <span
                      className='h-2 w-2 shrink-0 rounded-full'
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span>{opt.label}</span>
                </button>
              )
            })}
            {options.length === 0 && (
              <div
                className={cn(
                  'px-3 py-2',
                  isDark ? 'text-white/30' : 'text-black/30',
                )}>
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
