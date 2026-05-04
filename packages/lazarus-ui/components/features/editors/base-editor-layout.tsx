'use client'

import React from 'react'

import Spinner from '@/components/ui/spinner'
import { TimeStamp } from '@/components/ui/timestamp'
import { cn } from '@/lib/utils'

interface BaseEditorLayoutProps {
  children: React.ReactNode
  className?: string
  lastModified?: Date
  isEditing?: boolean
  editingStatus?: string
  headerActions?: React.ReactNode
}

export const BaseEditorLayout: React.FC<BaseEditorLayoutProps> = ({
  children,
  className,
  lastModified = new Date(),
  isEditing = false,
  editingStatus = 'Lazarus editing',
  headerActions,
}) => {
  return (
    <div className={cn('flex h-full w-full flex-col bg-white', className)}>
      {/* Minimal Header */}
      <div className='flex items-center justify-between bg-white px-4 py-2'>
        <div className='flex items-center gap-2'>
          {/* Editing Status - Left of timestamp */}
          {isEditing && (
            <div className='flex items-center gap-1.5'>
              <Spinner size='sm' />
              <span className='text-[11px] text-[#8E8E93]'>
                {editingStatus}
              </span>
              <span className='text-[11px] text-[#8E8E93]'>•</span>
            </div>
          )}

          {/* Timestamp */}
          <TimeStamp
            date={lastModified}
            format='header'
            variant='header'
            className='text-[11px] text-[#8E8E93]'
          />
        </div>

        {/* Header Actions - Top Right */}
        {headerActions && (
          <div className='flex items-center gap-2'>{headerActions}</div>
        )}
      </div>

      {/* Content Area - Seamless with header */}
      <div className='flex-1 bg-white'>{children}</div>
    </div>
  )
}
