'use client'

import { RiArrowDownSLine } from '@remixicon/react'
import React from 'react'

import { cn } from '@/lib/utils'

interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'value' | 'onChange' | 'size'
  > {
  isDark?: boolean
  label?: string
  error?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: 'surface' | 'ghost' | 'bordered'
  size?: 'small' | 'medium' | 'large'
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      isDark = false,
      label,
      error,
      className,
      children,
      value,
      onValueChange,
      variant = 'surface',
      size = 'medium',
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value)
      }
    }

    // Size configurations matching Input component
    const sizes = {
      small: {
        select: 'h-7 text-sm pr-7 pl-2.5',
        label: 'text-sm mb-1',
        icon: 'right-1.5',
        iconSize: 14,
      },
      medium: {
        select: 'h-8 text-sm pr-8 pl-3',
        label: 'text-sm mb-1.5',
        icon: 'right-2',
        iconSize: 14,
      },
      large: {
        select: 'h-10 text-base pr-10 pl-4',
        label: 'text-sm mb-1.5',
        icon: 'right-3',
        iconSize: 16,
      },
    }

    // Variant styles matching Input component
    const variantClasses = {
      surface: cn(
        'border',
        isDark ? 'border-white/[0.12]' : 'border-black/[0.08]',
        isDark ? 'bg-[hsl(var(--input))]' : 'bg-[hsl(var(--input))]',
      ),
      ghost: cn(
        'bg-transparent border',
        isDark ? 'border-white/[0.15]' : 'border-black/[0.12]',
      ),
      bordered: cn(
        'bg-transparent border-2',
        isDark ? 'border-white/30' : 'border-black/20',
      ),
    }

    return (
      <div className={cn('shrink-0', className)}>
        {label && (
          <label
            className={cn(
              'block font-semibold',
              sizes[size].label,
              isDark ? 'text-white' : 'text-black',
              error && 'text-red-500',
            )}>
            {label}
          </label>
        )}
        <div className='relative inline-block'>
          <select
            ref={ref}
            value={value}
            onChange={handleChange}
            className={cn(
              'appearance-none rounded-xl font-medium transition-all duration-200',
              'focus:shadow-[0_0_0_3px_rgba(0,152,252,0.1)] focus:outline-none focus:ring-2 focus:ring-[#0098FC]',
              sizes[size].select,
              variantClasses[variant],
              isDark ? 'text-white' : 'text-black',
              error && 'shadow-[0_0_0_3px_rgba(239,68,68,0.1)] ring-red-500',
              props.disabled && 'cursor-not-allowed opacity-50',
            )}
            {...props}>
            {children}
          </select>
          <RiArrowDownSLine
            size={sizes[size].iconSize}
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2',
              sizes[size].icon,
              isDark ? 'text-white/40' : 'text-black/40',
            )}
          />
        </div>
        {error && <p className='mt-1.5 text-sm text-red-500'>{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
