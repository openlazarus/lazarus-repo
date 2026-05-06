'use client'

import * as m from 'motion/react-m'
import React, {
  forwardRef,
  TextareaHTMLAttributes,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string | boolean
  variant?: 'surface' | 'ghost' | 'bordered' | 'naked'
  size?: 'small' | 'medium' | 'large'
  isDark?: boolean
  showCount?: boolean
  maxLength?: number
  resizable?: boolean
  animated?: boolean
  delay?: number
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      helperText,
      error,
      variant = 'surface',
      size = 'medium',
      isDark = false,
      showCount = false,
      maxLength,
      resizable = true,
      animated = false,
      delay = 0,
      className = '',
      disabled = false,
      value,
      onChange,
      onFocus,
      onBlur,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const [charCount, setCharCount] = useState(value ? String(value).length : 0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!)

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      onChange?.(e)
    }

    // Size configurations
    const sizes = {
      small: {
        textarea: 'text-sm',
        padding: 'px-3 py-2',
        label: 'text-sm mb-1.5',
        helper: 'text-xs mt-1',
      },
      medium: {
        textarea: 'text-base',
        padding: 'px-4 py-3',
        label: 'text-sm mb-2',
        helper: 'text-sm mt-1.5',
      },
      large: {
        textarea: 'text-lg',
        padding: 'px-5 py-4',
        label: 'text-base mb-2',
        helper: 'text-base mt-2',
      },
    }

    // Base textarea styles
    const baseTextareaClasses = cn(
      'w-full rounded-xl font-medium',
      'focus:outline-none ring-2 ring-transparent',
      !resizable && 'resize-none',
      sizes[size].textarea,
      sizes[size].padding,
    )

    // Variant styles
    const variantClasses = {
      surface: cn(
        'bg-[hsl(var(--input))] border border-black/[0.08] transition-[box-shadow,border-color] duration-300 ease-out',
        isDark && 'border-white/[0.08]',
        isFocused && 'ring-[#0098FC]',
        error && 'ring-red-500',
      ),
      ghost: cn(
        'bg-transparent border border-black/[0.12] transition-[box-shadow,border-color] duration-300 ease-out',
        isDark && 'border-white/[0.12]',
        isFocused && 'ring-[#0098FC]',
        error && 'ring-red-500',
      ),
      bordered: cn(
        'bg-transparent border transition-[box-shadow,border-color] duration-300 ease-out',
        'border-[#d2d2d7]',
        isFocused && 'border-[#0098FC] ring-[#0098FC]',
        error && 'border-red-500 ring-red-500',
        isDark && 'border-white/30',
        isDark && isFocused && 'border-[#0098FC]',
      ),
      naked: 'bg-transparent border-none ring-0',
    }

    // Text color
    const textColorClass = cn(
      'text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--input-placeholder))]',
      disabled && 'opacity-50',
    )

    // Container for animation
    const Container = animated ? m.div : 'div'
    const containerProps = animated
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] },
        }
      : {}

    return (
      <Container className={cn('w-full', className)} {...containerProps}>
        {label && (
          <label
            htmlFor={props.id}
            className={cn(
              'block font-semibold transition-colors duration-300 ease-out',
              sizes[size].label,
              'text-[hsl(var(--text-primary))]',
              error && 'text-red-500',
            )}>
            {label}
            {props.required && <span className='ml-1 text-red-500'>*</span>}
          </label>
        )}

        <div className='relative'>
          {/* Textarea field */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={cn(
              baseTextareaClasses,
              variantClasses[variant],
              textColorClass,
              disabled && 'cursor-not-allowed',
              className,
            )}
            {...props}
          />
        </div>

        {/* Helper text, error message, or character count */}
        <div className='flex items-center justify-between'>
          {(error || helperText) && (
            <p
              className={cn(
                'transition-colors duration-300 ease-out',
                sizes[size].helper,
                error ? 'text-red-500' : 'text-[hsl(var(--text-secondary))]',
              )}>
              {typeof error === 'string' ? error : helperText}
            </p>
          )}

          {showCount && (
            <p
              className={cn(
                'transition-colors duration-300 ease-out',
                sizes[size].helper,
                'text-[hsl(var(--text-tertiary))]',
                maxLength && charCount >= maxLength && 'text-red-500',
                error || helperText ? 'ml-auto' : '',
              )}>
              {maxLength ? `${charCount}/${maxLength}` : charCount}
            </p>
          )}
        </div>
      </Container>
    )
  },
)

TextArea.displayName = 'TextArea'
