'use client'

import * as m from 'motion/react-m'
import React, {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useRef,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string | boolean
  variant?: 'surface' | 'ghost' | 'bordered'
  size?: 'small' | 'medium' | 'large'
  shape?: 'rounded' | 'capsule'
  isDark?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  showClear?: boolean
  isLoading?: boolean
  onClear?: () => void
  animated?: boolean
  delay?: number
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      variant = 'surface',
      size = 'medium',
      shape = 'rounded',
      isDark = false,
      iconLeft,
      iconRight,
      showClear = false,
      isLoading = false,
      onClear,
      animated = false,
      delay = 0,
      className = '',
      disabled = false,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(!!value)
    const inputRef = useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!)

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      onChange?.(e)
    }

    const handleClear = () => {
      if (inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.focus()
        setHasValue(false)

        // Create synthetic event
        const event = new Event('input', { bubbles: true })
        inputRef.current.dispatchEvent(event)
      }
      onClear?.()
    }

    // Size configurations
    const sizes = {
      small: {
        input: 'h-7 text-sm',
        padding: iconLeft
          ? 'pl-8 pr-2.5'
          : iconRight || showClear
            ? 'pl-2.5 pr-8'
            : 'px-2.5',
        label: 'text-sm mb-1',
        helper: 'text-xs mt-1',
        icon: 'w-3.5 h-3.5',
      },
      medium: {
        input: 'h-8 text-sm',
        padding: iconLeft
          ? 'pl-9 pr-3'
          : iconRight || showClear
            ? 'pl-3 pr-9'
            : 'px-3',
        label: 'text-sm mb-1.5',
        helper: 'text-xs mt-1',
        icon: 'w-4 h-4',
      },
      large: {
        input: 'h-10 text-base',
        padding: iconLeft
          ? 'pl-11 pr-4'
          : iconRight || showClear
            ? 'pl-4 pr-11'
            : 'px-4',
        label: 'text-sm mb-1.5',
        helper: 'text-sm mt-1.5',
        icon: 'w-5 h-5',
      },
    }

    // Shape classes
    const shapeClasses = {
      rounded: 'rounded-xl',
      capsule: 'rounded-full',
    }

    // Base input styles
    const baseInputClasses = cn(
      'w-full font-medium',
      'focus:outline-none ring-2 ring-transparent',
      'placeholder:font-normal',
      'transition-all duration-200',
      shapeClasses[shape],
      sizes[size].input,
      sizes[size].padding,
    )

    // Get background style for surface variant (subtle shaded like secondary button)
    const getSurfaceStyle = () => {
      if (variant !== 'surface') return {}
      if (disabled) {
        return {
          background: 'transparent',
          opacity: 0.5,
        }
      }
      return { background: 'hsl(var(--input))' }
    }

    // Variant styles
    const variantClasses = {
      surface: cn(
        'border',
        isDark ? 'border-white/[0.12]' : 'border-black/[0.08]',
        isFocused && 'ring-[#0098FC] shadow-[0_0_0_3px_rgba(0,152,252,0.1)]',
        error && 'ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
      ),
      ghost: cn(
        'bg-transparent border',
        isDark ? 'border-white/[0.15]' : 'border-black/[0.12]',
        isFocused && 'ring-[#0098FC] shadow-[0_0_0_3px_rgba(0,152,252,0.1)]',
        error && 'ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
      ),
      bordered: cn(
        'bg-transparent border-2 shadow-[0_0.5px_1px_rgba(0,0,0,0.05)]',
        isDark ? 'border-white/30' : 'border-black/20',
        isFocused &&
          'border-[#0098FC] ring-[#0098FC] shadow-[0_0_0_3px_rgba(0,152,252,0.1)]',
        error &&
          'border-red-500 ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
      ),
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
          {/* Left icon */}
          {iconLeft && (
            <div
              className={cn(
                'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2',
                sizes[size].icon,
                'text-[hsl(var(--input-icon))]',
              )}>
              {iconLeft}
            </div>
          )}

          {/* Input field */}
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled || isLoading}
            style={getSurfaceStyle()}
            className={cn(
              baseInputClasses,
              variantClasses[variant],
              textColorClass,
              disabled && 'cursor-not-allowed',
            )}
            {...props}
          />

          {/* Right side content (loading, clear button, or icon) */}
          {(isLoading || (showClear && hasValue && !disabled) || iconRight) && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                sizes[size].icon,
              )}>
              {isLoading ? (
                <Spinner
                  size={
                    size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md'
                  }
                />
              ) : showClear && hasValue && !disabled ? (
                <button
                  type='button'
                  onClick={handleClear}
                  className={cn(
                    'rounded-full p-0.5 transition-colors duration-200',
                    'hover:bg-[hsl(var(--border))]',
                  )}
                  aria-label='Clear input'>
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 16 16'
                    fill='none'
                    className='h-full w-full'>
                    <path
                      d='M12 4L4 12M4 4L12 12'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </button>
              ) : iconRight ? (
                <div
                  className={cn(
                    'flex items-center justify-center',
                    'text-[hsl(var(--input-icon))]',
                  )}>
                  {iconRight}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Helper text or error message */}
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
      </Container>
    )
  },
)

Input.displayName = 'Input'

// Specialized input components

// Capsule Search Input - fully rounded for modern UI
export const CapsuleSearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'iconLeft' | 'shape'>
>((props, ref) => {
  const searchIcon = (
    <svg className='h-full w-full' viewBox='0 0 20 20' fill='none'>
      <path
        d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M19 19L14.65 14.65'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )

  return (
    <Input
      ref={ref}
      type='search'
      shape='capsule'
      iconLeft={searchIcon}
      placeholder='Search...'
      showClear
      {...props}
    />
  )
})

CapsuleSearchInput.displayName = 'CapsuleSearchInput'

// Standard Search Input
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'iconLeft'>
>((props, ref) => {
  const searchIcon = (
    <svg className='h-full w-full' viewBox='0 0 20 20' fill='none'>
      <path
        d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M19 19L14.65 14.65'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )

  return (
    <Input
      ref={ref}
      type='search'
      iconLeft={searchIcon}
      placeholder='Search...'
      showClear
      {...props}
    />
  )
})

SearchInput.displayName = 'SearchInput'

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'iconRight' | 'showClear'>
>(({ size = 'medium', isDark = false, className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false)

  // Size configurations matching the Input component
  const sizes = {
    small: {
      iconSize: 'w-4 h-4',
    },
    medium: {
      iconSize: 'w-4 h-4',
    },
    large: {
      iconSize: 'w-5 h-5',
    },
  }

  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      size={size}
      isDark={isDark}
      className={className}
      iconRight={
        <button
          type='button'
          onClick={() => setShowPassword(!showPassword)}
          className={cn(
            'flex h-full w-full items-center justify-center rounded-sm transition-all duration-200',
            'hover:opacity-70 active:scale-90',
            isDark ? 'text-white/50' : 'text-black/50',
          )}
          aria-label={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? (
            <svg
              viewBox='0 0 20 20'
              fill='none'
              className={sizes[size].iconSize}>
              <path
                d='M14.95 14.95C13.5255 16.0358 11.7909 16.6374 10 16.67C4 16.67 1 10 1 10C2.01135 7.94266 3.43734 6.11096 5.19 4.62M8.42 3.47C8.93766 3.32797 9.46814 3.25195 10 3.25C16 3.25 19 10 19 10C18.507 10.9917 17.9134 11.9285 17.23 12.79M11.76 11.77C11.5358 12.0388 11.2592 12.2573 10.9474 12.4115C10.6355 12.5657 10.2952 12.6523 9.94864 12.6655C9.60207 12.6788 9.25641 12.6184 8.93432 12.4886C8.61224 12.3587 8.32084 12.1623 8.07827 11.9117C7.8357 11.6611 7.64714 11.3619 7.52438 11.0332C7.40162 10.7045 7.34741 10.3532 7.36507 10.0012C7.38273 9.64921 7.47196 9.30414 7.62741 8.98681C7.78287 8.66947 8.00115 8.38646 8.27 8.15'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M1 1L19 19'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          ) : (
            <svg
              viewBox='0 0 20 20'
              fill='none'
              className={sizes[size].iconSize}>
              <path
                d='M1 10C1 10 4 3.25 10 3.25C16 3.25 19 10 19 10C19 10 16 16.75 10 16.75C4 16.75 1 10 1 10Z'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          )}
        </button>
      }
      {...props}
    />
  )
})

PasswordInput.displayName = 'PasswordInput'

// Input with embedded button inside the input container
interface InputWithButtonProps
  extends Omit<InputProps, 'iconRight' | 'showClear'> {
  buttonText: string
  onButtonClick?: () => void
  buttonDisabled?: boolean
  buttonLoading?: boolean
  buttonIcon?: ReactNode
  submitOnEnter?: boolean
}

export const InputWithButton = forwardRef<
  HTMLInputElement,
  InputWithButtonProps
>(
  (
    {
      buttonText,
      onButtonClick,
      buttonDisabled = false,
      buttonLoading = false,
      buttonIcon,
      submitOnEnter = true,
      size = 'medium',
      shape = 'capsule',
      isDark = false,
      className = '',
      variant = 'surface',
      disabled = false,
      iconLeft,
      error,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!)

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        submitOnEnter &&
        e.key === 'Enter' &&
        !disabled &&
        !buttonDisabled &&
        !buttonLoading
      ) {
        e.preventDefault()
        onButtonClick?.()
      }
    }

    // Size configurations
    const sizes = {
      small: {
        height: 'h-8',
        textSize: 'text-sm',
        leftPadding: iconLeft ? 'pl-9' : 'pl-3',
        rightPadding: 'pr-28',
        iconSize: 'w-4 h-4',
        iconLeft: 'left-3',
      },
      medium: {
        height: 'h-10',
        textSize: 'text-base',
        leftPadding: iconLeft ? 'pl-11' : 'pl-4',
        rightPadding: 'pr-32',
        iconSize: 'w-5 h-5',
        iconLeft: 'left-3',
      },
      large: {
        height: 'h-12',
        textSize: 'text-lg',
        leftPadding: iconLeft ? 'pl-14' : 'pl-5',
        rightPadding: 'pr-36',
        iconSize: 'w-6 h-6',
        iconLeft: 'left-3',
      },
    }

    const shapeClasses = {
      rounded: 'rounded-xl',
      capsule: 'rounded-full',
    }

    // Get background style
    const getSurfaceStyle = () => {
      if (variant !== 'surface') return {}
      if (disabled) {
        return { background: 'transparent', opacity: 0.5 }
      }
      return { background: 'hsl(var(--input))' }
    }

    const variantClasses = {
      surface: cn(
        'border',
        isDark ? 'border-white/[0.12]' : 'border-black/[0.08]',
        isFocused && 'ring-[#0098FC] shadow-[0_0_0_3px_rgba(0,152,252,0.1)]',
        error && 'ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
      ),
      ghost: cn(
        'bg-transparent border',
        isDark ? 'border-white/[0.15]' : 'border-black/[0.12]',
        isFocused && 'ring-[#0098FC] shadow-[0_0_0_3px_rgba(0,152,252,0.1)]',
        error && 'ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
      ),
      bordered: cn(
        'bg-transparent border-2 shadow-[0_0.5px_1px_rgba(0,0,0,0.05)]',
        isDark ? 'border-white/30' : 'border-black/20',
        isFocused &&
          'border-[#0098FC] ring-[#0098FC] shadow-[0_0_0_3px_rgba(0,152,252,0.1)]',
        error &&
          'border-red-500 ring-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
      ),
    }

    const textColorClass = cn(
      'text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--input-placeholder))]',
      disabled && 'opacity-50',
    )

    return (
      <div className={cn('relative w-full', className)}>
        {/* Input container with button inside */}
        <div
          className={cn(
            'relative w-full',
            'ring-2 ring-transparent focus-within:outline-none',
            'transition-all duration-200',
            shapeClasses[shape],
            sizes[size].height,
            variantClasses[variant],
          )}
          style={getSurfaceStyle()}>
          {/* Left icon */}
          {iconLeft && (
            <div
              className={cn(
                'pointer-events-none absolute top-1/2 z-10 -translate-y-1/2',
                sizes[size].iconLeft,
                sizes[size].iconSize,
                'text-[hsl(var(--input-icon))]',
              )}>
              {iconLeft}
            </div>
          )}

          {/* Input field */}
          <input
            ref={inputRef}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled || buttonLoading}
            className={cn(
              'absolute inset-0 h-full w-full bg-transparent',
              'font-medium',
              'focus:outline-none',
              'placeholder:font-normal',
              sizes[size].textSize,
              sizes[size].leftPadding,
              sizes[size].rightPadding,
              shapeClasses[shape],
              textColorClass,
              disabled && 'cursor-not-allowed',
            )}
            {...props}
          />

          {/* Button inside */}
          <div className='absolute right-1.5 top-1/2 z-10 -translate-y-1/2'>
            <Button
              type='button'
              onClick={onButtonClick}
              variant='primary'
              size='small'
              shape='pill'
              disabled={buttonDisabled || disabled}
              loading={buttonLoading}
              iconRight={!buttonLoading && buttonIcon}>
              {buttonText}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && typeof error === 'string' && (
          <p className={cn('mt-1.5 text-sm text-red-500')}>{error}</p>
        )}
      </div>
    )
  },
)

InputWithButton.displayName = 'InputWithButton'

// Expandable Search Input - animates from icon to full input
interface ExpandableSearchInputProps
  extends Omit<InputProps, 'type' | 'iconLeft' | 'shape' | 'size'> {
  isExpanded: boolean
  onToggle: () => void
  expandedWidth?: number | string
  size?: 'small' | 'medium'
}

export const ExpandableSearchInput = forwardRef<
  HTMLInputElement,
  ExpandableSearchInputProps
>(
  (
    {
      isExpanded,
      onToggle,
      expandedWidth = 200,
      size = 'medium',
      isDark = false,
      value,
      onChange,
      onBlur,
      placeholder = 'Search...',
      className,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [isFocused, setIsFocused] = useState(false)

    // Size configurations
    const sizeConfig = {
      small: {
        button: 'h-7 w-7',
        collapsedWidth: 28,
        input: 'h-7',
        iconSize: 'w-4 h-4',
        padding: 'px-2',
        text: 'text-sm',
        closeIcon: 'h-3.5 w-3.5',
      },
      medium: {
        button: 'h-9 w-9',
        collapsedWidth: 36,
        input: 'h-9',
        iconSize: 'w-5 h-5',
        padding: 'px-3',
        text: 'text-sm',
        closeIcon: 'h-3.5 w-3.5',
      },
    }

    const config = sizeConfig[size]

    React.useImperativeHandle(ref, () => inputRef.current!)

    // Focus input when expanded
    React.useEffect(() => {
      if (isExpanded && inputRef.current) {
        // Small delay to allow animation to start
        const timer = setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
        return () => clearTimeout(timer)
      }
    }, [isExpanded])

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      // Close if empty on blur
      if (!value && isExpanded) {
        onToggle()
      }
      onBlur?.(e)
    }

    const handleClear = () => {
      if (inputRef.current) {
        inputRef.current.value = ''
        // Trigger onChange with empty value
        const event = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange?.(event)
      }
      onToggle()
    }

    const searchIcon = (
      <svg viewBox='0 0 20 20' fill='none' className={config.iconSize}>
        <path
          d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M19 19L14.65 14.65'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )

    return (
      <m.div
        className={cn('relative flex items-center', className)}
        initial={false}
        animate={{
          width: isExpanded
            ? typeof expandedWidth === 'number'
              ? expandedWidth
              : expandedWidth
            : config.collapsedWidth,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}>
        {/* Collapsed state - just the icon button */}
        {!isExpanded && (
          <m.button
            type='button'
            onClick={onToggle}
            className={cn(
              'flex items-center justify-center rounded-full transition-colors',
              config.button,
              isDark
                ? 'text-white/60 hover:bg-white/[0.05] hover:text-white/80'
                : 'text-black/60 hover:bg-black/[0.04] hover:text-black/80',
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}>
            {searchIcon}
          </m.button>
        )}

        {/* Expanded state - full input */}
        {isExpanded && (
          <m.div
            className='relative w-full'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}>
            <div
              className={cn(
                'flex w-full items-center rounded-full border',
                config.input,
                config.padding,
                'transition-all duration-200',
                isDark
                  ? 'border-white/[0.12] bg-white/[0.06]'
                  : 'border-black/[0.08] bg-black/[0.04]',
                isFocused &&
                  'shadow-[0_0_0_3px_rgba(0,152,252,0.1)] ring-2 ring-[#0098FC]',
              )}>
              {/* Search icon */}
              <div
                className={cn(
                  'mr-1.5 flex-shrink-0',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                {searchIcon}
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                type='text'
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={cn(
                  'h-full min-w-0 flex-1 bg-transparent font-medium',
                  config.text,
                  isDark
                    ? 'text-white placeholder:text-white/40'
                    : 'text-black placeholder:text-black/40',
                  'focus:outline-none',
                )}
                {...props}
              />

              {/* Close button */}
              <button
                type='button'
                onClick={handleClear}
                className={cn(
                  'ml-1 flex-shrink-0 rounded-full p-0.5 transition-colors',
                  isDark
                    ? 'text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                    : 'text-black/40 hover:bg-black/[0.06] hover:text-black/60',
                )}>
                <svg
                  viewBox='0 0 16 16'
                  fill='none'
                  className={config.closeIcon}>
                  <path
                    d='M12 4L4 12M4 4L12 12'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
            </div>
          </m.div>
        )}
      </m.div>
    )
  },
)

ExpandableSearchInput.displayName = 'ExpandableSearchInput'
