'use client'

import * as m from 'motion/react-m'
import Link from 'next/link'
import { ReactNode, useEffect, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import {
  ButtonShape,
  ButtonSize,
  ButtonVariant,
} from '@/lib/design-system/types'

interface BaseButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: ButtonShape
  className?: string
  disabled?: boolean
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  iconOnly?: boolean
  title?: string
}

interface ButtonAsButton extends BaseButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  href?: never
  target?: never
  type?: 'button' | 'submit' | 'reset'
}

interface ButtonAsLink extends BaseButtonProps {
  href: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  onClick?: never
}

type ButtonProps = ButtonAsButton | ButtonAsLink

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  shape = 'pill',
  className = '',
  onClick,
  href,
  target,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  iconOnly = false,
  title,
  type = 'button',
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  const baseClasses =
    'relative font-medium tracking-[-0.01em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-block'

  const overflowClass = variant === 'link' ? '' : 'overflow-hidden'

  const shapeClasses = {
    pill: 'rounded-full',
    rounded: 'rounded-lg',
  }

  const getSizeClass = () => {
    if (variant === 'link') {
      return {
        small: 'py-2 text-xs',
        medium: 'py-2.5 text-sm',
        large: 'py-3 text-base',
      }[size]
    }

    if (iconOnly) {
      return {
        small: 'p-2 text-xs',
        medium: 'p-2.5 text-sm',
        large: 'p-3 text-base',
      }[size]
    }

    return {
      small: 'px-4 py-2 text-xs',
      medium: 'px-5 py-2.5 text-sm',
      large: 'px-6 py-3 text-base',
    }[size]
  }

  const variantClasses = {
    primary:
      'text-white dark:text-black shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:shadow-[0_1px_2px_rgba(255,255,255,0.2)]',
    secondary:
      'text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))] dark:hover:text-[hsl(var(--text-primary))]',
    active: 'text-white shadow-[0_1px_3px_rgba(0,152,252,0.3)]',
    destructive: 'text-white shadow-[0_1px_2px_rgba(239,68,68,0.3)]',
    outline:
      'border-2 border-[hsl(var(--border-dark))] text-[hsl(var(--text-primary))] hover:border-[hsl(var(--border-dark))] dark:border-[hsl(var(--border-dark))] dark:text-[hsl(var(--text-primary))] dark:hover:border-[hsl(var(--border-dark))]',
    link: 'bg-transparent text-[hsl(var(--text-primary))] hover:text-[hsl(var(--text-secondary))] dark:text-[hsl(var(--text-primary))] dark:hover:text-[hsl(var(--text-secondary))]',
  }

  // Background styles for gradients and colors
  const getBackgroundStyle = () => {
    if (disabled || loading) {
      if (variant === 'active') return { background: '#0098FC', opacity: 0.5 }
      if (variant === 'destructive')
        return { background: '#ef4444', opacity: 0.5 }
      if (variant === 'primary')
        return { background: isDark ? '#ffffff' : '#000000', opacity: 0.5 }
      if (variant === 'secondary')
        return { background: 'transparent', opacity: 0.5 }
      return {}
    }

    switch (variant) {
      case 'active':
        return {
          background: 'linear-gradient(to bottom, #33a9fd, #0098fc)',
        }
      case 'primary':
        return isDark
          ? {
              background:
                'linear-gradient(to bottom, hsl(var(--lazarus-white)), hsl(var(--lazarus-gray-100)))',
            }
          : {
              background:
                'linear-gradient(to bottom, hsl(var(--text-primary)), hsl(var(--lazarus-black)))',
            }
      case 'destructive':
        return {
          background: 'linear-gradient(to bottom, #f87171, #ef4444)',
        }
      case 'secondary':
        return isDark
          ? { background: 'hsl(var(--input))' }
          : { background: 'hsl(var(--input))' }
      default:
        return {}
    }
  }

  const commonProps = {
    className: `${baseClasses} ${overflowClass} ${shapeClasses[shape]} ${getSizeClass()} ${variantClasses[variant]} ${className}`,
    style: getBackgroundStyle(),
    title,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false)
      setIsPressed(false)
    },
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
  }

  const content = (
    <>
      {/* Hover overlay for gradient buttons */}
      {(variant === 'primary' ||
        variant === 'active' ||
        variant === 'destructive') &&
        !disabled && (
          <m.div
            className='absolute inset-0 bg-white dark:bg-black'
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.15 : 0 }}
            transition={{ duration: 0.2 }}
          />
        )}

      {/* Secondary variant hover overlay */}
      {variant === 'secondary' && !disabled && (
        <m.div
          className='absolute inset-0 bg-black dark:bg-white'
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.04 : 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Link variant underline animation */}
      {variant === 'link' && (
        <m.div
          className='absolute left-0 right-0 h-[2px]'
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ transformOrigin: 'left', bottom: '-2px' }}>
          <div className='absolute inset-0 bg-black opacity-60 dark:bg-white' />
          <m.div
            className='absolute inset-0 bg-gradient-to-r from-[#0098FC] to-[#00D4FF]'
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 0.8 : 0 }}
            transition={{
              duration: 0.4,
              delay: 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        </m.div>
      )}

      {/* Button content with icons */}
      <m.span
        className='relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap'
        style={{
          filter: isPressed && !disabled ? 'brightness(0.95)' : 'brightness(1)',
        }}
        transition={{ duration: 0.1 }}>
        {loading ? (
          <span className='flex items-center justify-center gap-2'>
            <Spinner size='sm' />
            {typeof children === 'string' && children}
          </span>
        ) : iconOnly ? (
          <span className='flex items-center justify-center'>{children}</span>
        ) : (
          <>
            {iconLeft && (
              <m.span
                className='flex items-center justify-center'
                animate={{
                  x:
                    (variant === 'secondary' ||
                      variant === 'primary' ||
                      variant === 'active') &&
                    isHovered
                      ? -2
                      : 0,
                }}
                transition={{ duration: 0.2 }}>
                {iconLeft}
              </m.span>
            )}
            <span className='font-normal'>{children}</span>
            {iconRight && (
              <m.span
                className='flex items-center justify-center'
                animate={{
                  x:
                    (variant === 'secondary' ||
                      variant === 'primary' ||
                      variant === 'active') &&
                    isHovered
                      ? 2
                      : 0,
                }}
                transition={{ duration: 0.2 }}>
                {iconRight}
              </m.span>
            )}
          </>
        )}
      </m.span>
    </>
  )

  // Render as link if href is provided
  if (href) {
    // External link
    if (
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      return (
        <m.a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          {...commonProps}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}>
          {content}
        </m.a>
      )
    }

    // Internal link using Next.js Link
    return (
      <Link href={href}>
        <m.span
          {...commonProps}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}>
          {content}
        </m.span>
      </Link>
    )
  }

  // Render as button
  return (
    <m.button
      {...commonProps}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}>
      {content}
    </m.button>
  )
}
