'use client'

import { m } from 'motion/react'

import { CardVariant } from '@/lib/design-system/types'
import { MOTION } from '@/lib/design-system/ui-constants'

interface CardProps {
  variant?: CardVariant
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
  }
  className?: string
  isDark?: boolean
}

// Simple shadcn-style Card wrapper component
export function Card({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}>
      {children}
    </div>
  )
}

// Original feature Card renamed to FeatureCard
export function FeatureCard({
  variant = 'standard',
  title,
  description,
  action,
  className = '',
  isDark = false,
}: CardProps) {
  const getCardClasses = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-br from-[#0098FC] to-[#00D4FF] text-white'
      case 'outlined':
        return `border transition-all duration-300 ${
          isDark
            ? 'border-white/20 hover:border-white/30'
            : 'border-[#e5e5e7] hover:border-[#d5d5d7]'
        }`
      default:
        return `transition-all duration-300 ${
          isDark
            ? 'bg-white/[0.05] hover:bg-white/[0.08]'
            : 'bg-[#fafafa] hover:bg-[#f5f5f7]'
        }`
    }
  }

  const getTextColor = () => {
    if (variant === 'gradient') return 'text-white/90'
    return 'text-[#6e6e73]'
  }

  const getActionColor = () => {
    if (variant === 'gradient') return 'text-white'
    return 'text-[#0098FC]'
  }

  return (
    <m.div
      className={`rounded-3xl p-10 ${getCardClasses()} ${className}`}
      whileHover={{ y: -2 }}
      transition={MOTION.transitions.micro}>
      <h4 className='mb-4 text-[24px] font-semibold tracking-[-0.02em]'>
        {title}
      </h4>
      <p className={`text-[16px] ${getTextColor()} mb-6 leading-[1.5]`}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className={`text-[16px] font-medium ${getActionColor()} tracking-[-0.01em] transition-opacity hover:opacity-80`}>
          {action.label} →
        </button>
      )}
    </m.div>
  )
}

// Shadcn-style Card sub-components for compatibility
export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  )
}
