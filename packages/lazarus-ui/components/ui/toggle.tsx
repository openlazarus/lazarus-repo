'use client'

import * as m from 'motion/react-m'
import { useState } from 'react'

import { cn } from '@/lib/utils'

interface ToggleProps {
  label?: string
  description?: string
  defaultChecked?: boolean
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'gradient'
  isDark?: boolean
  className?: string
}

export function Toggle({
  label,
  description,
  defaultChecked = false,
  checked: controlledChecked,
  onChange,
  disabled = false,
  size = 'medium',
  variant = 'default',
  isDark = false,
  className = '',
}: ToggleProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isControlled = controlledChecked !== undefined
  const isChecked = isControlled ? controlledChecked : internalChecked

  const handleToggle = () => {
    if (disabled) return

    if (!isControlled) {
      setInternalChecked(!internalChecked)
    }
    onChange?.(!isChecked)
  }

  const sizes = {
    small: {
      track: 'w-10 h-6',
      thumb: 'w-4 h-4',
      padding: 'p-1',
      translate: 16,
    },
    medium: {
      track: 'w-14 h-8',
      thumb: 'w-6 h-6',
      padding: 'p-1',
      translate: 24,
    },
    large: {
      track: 'w-20 h-11',
      thumb: 'w-9 h-9',
      padding: 'p-1',
      translate: 36,
    },
  }

  const trackVariants = {
    default: cn(
      'transition-colors duration-200',
      isChecked
        ? variant === 'gradient'
          ? 'bg-gradient-to-r from-[#0098FC] to-[#00D4FF]'
          : 'bg-[#0098FC]'
        : isDark
          ? 'bg-white/20'
          : 'bg-black/10',
    ),
    disabled: 'opacity-50 cursor-not-allowed',
  }

  const thumbVariants = {
    default: cn(
      isChecked ? 'bg-white shadow-lg' : isDark ? 'bg-white' : 'bg-white',
      'shadow-sm',
    ),
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <m.button
        role='switch'
        aria-checked={isChecked}
        disabled={disabled}
        onClick={handleToggle}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 600,
          damping: 35,
          mass: 0.6,
        }}
        className={cn(
          'relative flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0098FC] focus-visible:ring-offset-2',
          sizes[size].track,
          sizes[size].padding,
          trackVariants.default,
          disabled && trackVariants.disabled,
        )}>
        <m.div
          className={cn(
            'relative rounded-full',
            sizes[size].thumb,
            thumbVariants.default,
          )}
          animate={{ x: isChecked ? sizes[size].translate : 0 }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 30,
            mass: 0.3,
          }}
        />
      </m.button>

      {(label || description) && (
        <div className='flex-1'>
          {label && (
            <label
              className={cn(
                'block cursor-pointer select-none text-base font-medium',
                isDark ? 'text-white' : 'text-[#1d1d1f]',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              onClick={disabled ? undefined : handleToggle}>
              {label}
            </label>
          )}
          {description && (
            <p
              className={cn(
                'mt-1 text-sm',
                isDark ? 'text-white/60' : 'text-[#86868b]',
                disabled && 'opacity-50',
              )}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
