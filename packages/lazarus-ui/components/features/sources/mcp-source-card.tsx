'use client'

import {
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiFolderLine,
  RiGitBranchLine,
  RiGlobalLine,
  RiServerLine,
  RiSettings3Line,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { memo } from 'react'

import { AnimatedListItem, Typography } from '@/components/ui'
import { Toggle } from '@/components/ui/toggle'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'

import { Source } from './types'

interface MCPSourceCardProps {
  serverName: string
  source: Source
  onClick: () => void
  isDark: boolean
  onToggle: (name: string, enabled: boolean) => Promise<void>
  toolsCount?: number
  index?: number
}

// Icon mappings for known services - using Remix icons instead of logos
const getSourceIcon = (name: string) => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('file') || lowerName.includes('filesystem')) {
    return RiFolderLine
  }
  if (lowerName.includes('git')) {
    return RiGitBranchLine
  }
  if (
    lowerName.includes('database') ||
    lowerName.includes('sqlite') ||
    lowerName.includes('postgres')
  ) {
    return RiDatabase2Line
  }
  if (
    lowerName.includes('fetch') ||
    lowerName.includes('web') ||
    lowerName.includes('http')
  ) {
    return RiGlobalLine
  }
  if (lowerName.includes('code') || lowerName.includes('github')) {
    return RiCodeSSlashLine
  }
  if (lowerName.includes('server')) {
    return RiServerLine
  }

  return RiSettings3Line // Default to settings/gear icon
}

export const MCPSourceCard = memo(
  ({
    serverName,
    source,
    onClick,
    isDark,
    onToggle,
    index = 0,
  }: MCPSourceCardProps) => {
    const handleToggle = async (checked: boolean) => {
      try {
        await onToggle(serverName, checked)
      } catch (error) {
        console.error('Failed to toggle server:', error)
      }
    }

    const handleClick = () => {
      onClick()
    }

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Never'
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    // Check for logo first (by preset_id or server name)
    const logoPath = getSourceLogoPath(source.preset_id, serverName)
    const IconComponent = getSourceIcon(serverName)

    return (
      <AnimatedListItem onClick={handleClick} index={index} isDark={isDark}>
        <m.div
          layoutId={`source-item-${serverName}`}
          layout={false}
          className='px-6 py-5'>
          {/* First Line - Source Name and Icon */}
          <div className='mb-2'>
            <m.div
              layoutId={`source-title-${serverName}`}
              layout={false}
              className='flex items-center gap-2'>
              {/* Source Icon - inline with name */}
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full',
                  isDark ? 'bg-white/5' : 'bg-black/[0.03]',
                )}>
                {logoPath ? (
                  <Image
                    src={logoPath}
                    alt={serverName}
                    width={16}
                    height={16}
                    className='h-4 w-4 object-contain'
                  />
                ) : (
                  <IconComponent
                    size={14}
                    className={cn(isDark ? 'text-white/60' : 'text-black/60')}
                  />
                )}
              </div>

              <Typography variant='body' className='!text-[14px]'>
                {serverName}
              </Typography>
            </m.div>
          </div>

          {/* Second Line */}
          <div className='flex items-center justify-between'>
            {/* Left: Category or Description */}
            <div className='flex items-center gap-2'>
              {source.category && (
                <span
                  className={cn(
                    'rounded px-2 py-0.5 font-mono text-[11px]',
                    isDark
                      ? 'bg-white/5 text-white/50'
                      : 'bg-black/[0.02] text-black/50',
                  )}>
                  {source.category}
                </span>
              )}
              {source.description && !source.category && (
                <span
                  className={cn(
                    'line-clamp-1 text-[11px]',
                    isDark ? 'text-white/50' : 'text-black/50',
                  )}>
                  {source.description}
                </span>
              )}
            </div>

            {/* Right: Last Updated + Toggle */}
            <div className='flex items-center gap-3'>
              {/* Last updated */}
              <div className='text-right' data-toggle-area>
                <div
                  className={cn(
                    'text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  last updated
                </div>
                <div className='text-[14px] font-semibold leading-tight'>
                  {formatDate(source.updated_at)}
                </div>
              </div>

              {/* Toggle */}
              <m.div
                layoutId={`source-toggle-${serverName}`}
                layout={false}
                data-toggle-area>
                <Toggle
                  checked={source.enabled}
                  onChange={handleToggle}
                  size='small'
                  isDark={isDark}
                />
              </m.div>
            </div>
          </div>
        </m.div>
      </AnimatedListItem>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.serverName === nextProps.serverName &&
      prevProps.source.enabled === nextProps.source.enabled &&
      prevProps.source.updated_at === nextProps.source.updated_at &&
      prevProps.source.has_env === nextProps.source.has_env &&
      prevProps.source.category === nextProps.source.category &&
      prevProps.source.description === nextProps.source.description &&
      prevProps.source.preset_id === nextProps.source.preset_id &&
      prevProps.isDark === nextProps.isDark &&
      prevProps.index === nextProps.index
    )
  },
)

MCPSourceCard.displayName = 'MCPSourceCard'
