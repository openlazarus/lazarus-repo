'use client'

import * as m from 'motion/react-m'
import { ReactNode } from 'react'

import Spinner from '@/components/ui/spinner'
import { Stack } from '@/components/ui/stack'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

interface ListDetailViewProps {
  // Loading state
  loading?: boolean
  loadingText?: string

  // Empty state
  emptyTitle?: string
  emptyDescription?: string

  // Filter section (optional)
  filterSection?: ReactNode

  // List items
  children: ReactNode

  // Styling
  isDark?: boolean
  className?: string
}

/**
 * Reusable list-detail view component used across activity, agents, and sources pages.
 * Handles loading states, empty states, filters, and animated list rendering.
 */
export function ListDetailView({
  loading = false,
  loadingText = 'Loading...',
  emptyTitle = 'No items',
  emptyDescription = 'No items to display',
  filterSection,
  children,
  isDark = false,
  className,
}: ListDetailViewProps) {
  return (
    <div className={className}>
      {/* Optional Filter Section */}
      {filterSection}

      {/* Loading State */}
      {loading ? (
        <div className='flex h-64 items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Spinner size='lg' />
            <div
              className={cn(
                'text-sm',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              {loadingText}
            </div>
          </div>
        </div>
      ) : !children || (Array.isArray(children) && children.length === 0) ? (
        /* Empty State */
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          className='flex min-h-[400px] items-center justify-center px-6 py-24'>
          <div className='text-center'>
            <Typography
              variant='h3Dashboard'
              className={cn(
                'mb-2',
                isDark ? 'text-white/30' : 'text-black/20',
              )}>
              {emptyTitle}
            </Typography>

            <Typography
              variant='bodyRegular'
              className={cn(isDark ? 'text-white/20' : 'text-black/15')}>
              {emptyDescription}
            </Typography>
          </div>
        </m.div>
      ) : (
        /* Animated List Container using Stack */
        <Stack isDark={isDark}>{children}</Stack>
      )}
    </div>
  )
}
