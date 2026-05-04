'use client'

import {
  RiAddLine,
  RiArrowRightLine,
  RiLockLine,
  RiSettings3Line,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { memo } from 'react'

import type { MCPPreset } from '@/hooks/features/mcp/types'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'

interface MCPPresetCardProps {
  preset?: MCPPreset & { id: string }
  isCustom?: boolean
  onClick: () => void
  isDark: boolean
  index?: number
}

export const MCPPresetCard = memo(
  ({
    preset,
    isCustom = false,
    onClick,
    isDark,
    index = 0,
  }: MCPPresetCardProps) => {
    const logoPath = preset?.id ? getSourceLogoPath(preset.id) : null
    const IconComponent = isCustom ? RiAddLine : RiSettings3Line

    return (
      <m.button
        type='button'
        onClick={onClick}
        className={cn(
          'group relative w-full text-left',
          'border-b py-5',
          isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
        )}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.4,
          delay: index * 0.05,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{
          x: 4,
          transition: { duration: 0.2 },
        }}
        whileTap={{ opacity: 0.7 }}>
        <div className='flex items-start gap-4'>
          {/* Icon or Logo */}
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
              isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]',
            )}>
            {logoPath ? (
              <Image
                src={logoPath}
                alt={preset?.name || ''}
                width={20}
                height={20}
                className='h-5 w-5 object-contain'
              />
            ) : (
              <IconComponent
                size={18}
                className={isDark ? 'text-white/70' : 'text-black/70'}
              />
            )}
          </div>

          {/* Content */}
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <h3
                className={cn(
                  'text-[14px] font-medium',
                  isDark ? 'text-white' : 'text-black',
                )}>
                {isCustom ? 'Add new' : preset?.name}
              </h3>
              {!isCustom && preset?.category && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    isDark
                      ? 'bg-white/[0.06] text-white/40'
                      : 'bg-black/[0.04] text-black/40',
                  )}>
                  {preset.category}
                </span>
              )}
              {!isCustom && preset?.requiresOAuth && (
                <span
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                    isDark
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-blue-50 text-blue-600',
                  )}
                  title='Requires browser authorization'>
                  <RiLockLine size={10} />
                  OAuth
                </span>
              )}
            </div>
            <p
              className={cn(
                'mt-1 line-clamp-1 text-[13px]',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              {isCustom
                ? 'Set up your own MCP server with custom command and environment'
                : preset?.description || 'No description available'}
            </p>
          </div>

          {/* Arrow */}
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center',
              'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
            )}>
            <RiArrowRightLine
              size={16}
              className={isDark ? 'text-white/40' : 'text-black/40'}
            />
          </div>
        </div>
      </m.button>
    )
  },
)

MCPPresetCard.displayName = 'MCPPresetCard'
