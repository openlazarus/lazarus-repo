'use client'

import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface ListFilterSectionProps {
  children: ReactNode
  isDark?: boolean
  className?: string
}

/**
 * Reusable filter section for list views.
 * Provides consistent styling for filter UI elements.
 */
export function ListFilterSection({
  children,
  isDark = false,
  className,
}: ListFilterSectionProps) {
  return (
    <div
      className={cn('border-b px-6 py-3', className)}
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      }}>
      {children}
    </div>
  )
}
