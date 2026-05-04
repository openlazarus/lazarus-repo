'use client'

import * as m from 'motion/react-m'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Typography } from '@/components/ui'
import { TagButton } from '@/components/ui/button/tag-button'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { KnowledgeArtifact } from '@/model/knowledge'

interface ArtifactCardProps {
  artifact: KnowledgeArtifact
  onSelect?: (artifact: KnowledgeArtifact) => void
  selected?: boolean
  compact?: boolean
  index?: number
}

const typeColors = {
  event: '#00d4ff',
  concept: '#a855f7',
  pattern: '#52c41a',
  context: '#faad14',
}

const typeLabels = {
  event: 'Event',
  concept: 'Concept',
  pattern: 'Pattern',
  context: 'Context',
}

export function ArtifactCard({
  artifact,
  onSelect,
  selected,
  compact = false,
  index = 0,
}: ArtifactCardProps) {
  const { isDark } = useTheme()
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [isTagged, setIsTagged] = useState(false)
  const typeColor = typeColors[artifact.type]
  const typeLabel = typeLabels[artifact.type]

  const handleCardClick = () => {
    // Call onSelect if provided, otherwise do nothing
    if (onSelect) {
      onSelect(artifact)
    }
  }

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsTagged(!isTagged)
  }

  // For grid view (card style)
  if (!compact) {
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: index * 0.05,
          ease: [0.22, 1, 0.36, 1],
        }}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'group relative cursor-pointer rounded-lg border p-4 transition-all duration-200',
          isDark
            ? 'border-white/[0.06] bg-[#1a1a1a] hover:border-white/15'
            : 'border-black/[0.06] bg-white hover:border-black/15',
        )}>
        {/* Type Badge */}
        <div className='mb-3 flex items-center justify-between'>
          <span
            className='rounded-full px-2.5 py-1 text-[11px] font-medium'
            style={{
              backgroundColor: typeColor + '15',
              color: typeColor,
            }}>
            {typeLabel}
          </span>
          <TagButton
            itemId={artifact.id}
            isTagged={isTagged}
            size='small'
            onClick={handleTagClick}
            disabled={false}
          />
        </div>

        {/* Title */}
        <h3
          className={cn(
            'mb-2 text-[14px] font-semibold leading-tight',
            isDark ? 'text-white' : 'text-black',
          )}>
          {artifact.title}
        </h3>

        {/* Tags */}
        <div className='mb-3 flex flex-wrap gap-1'>
          {artifact.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className={cn(
                'rounded px-2 py-0.5 text-[11px]',
                isDark
                  ? 'bg-white/5 text-white/40'
                  : 'bg-black/[0.03] text-black/40',
              )}>
              {tag}
            </span>
          ))}
          {artifact.tags.length > 2 && (
            <span
              className={cn(
                'text-[11px]',
                isDark ? 'text-white/30' : 'text-black/30',
              )}>
              +{artifact.tags.length - 2}
            </span>
          )}
        </div>

        {/* Stats */}
        <div
          className={cn(
            'flex items-center gap-3 text-[11px]',
            isDark ? 'text-white/40' : 'text-black/40',
          )}>
          {artifact.links.length > 0 && (
            <span>{artifact.links.length} links</span>
          )}
          {artifact.backlinks.length > 0 && (
            <span>{artifact.backlinks.length} refs</span>
          )}
          {artifact.metadata.importance === 'high' && (
            <span className='ml-auto' style={{ color: typeColor }}>
              High
            </span>
          )}
        </div>
      </m.div>
    )
  }

  // For list view (row style)
  return (
    <m.div
      layoutId={`artifact-item-${artifact.id}`}
      initial={{
        opacity: 0,
        y: 20,
        filter: 'blur(4px)',
      }}
      animate={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.32, 0, 0.67, 0],
      }}
      whileHover={{
        scale: 1.01,
        transition: {
          duration: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className='group relative cursor-pointer overflow-hidden'>
      {/* Hover background effect */}
      <m.div
        className={cn(
          'absolute inset-0 opacity-0',
          isDark
            ? 'bg-gradient-to-r from-white/[0.02] to-white/[0.04]'
            : 'bg-gradient-to-r from-black/[0.01] to-black/[0.02]',
        )}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      />

      <div className='relative z-10 px-6 py-5 transition-all duration-200'>
        {/* Single row layout */}
        <div className='flex items-center justify-between'>
          {/* Left side: Title, type, tags */}
          <div className='flex flex-1 items-center gap-3'>
            <Typography variant='body' className='!text-[14px]'>
              {artifact.title}
            </Typography>

            {/* Type Badge */}
            <span
              className='rounded-full px-2 py-0.5 text-[10px] font-medium'
              style={{
                backgroundColor: typeColor + '15',
                color: typeColor,
              }}>
              {typeLabel}
            </span>

            {/* Tags */}
            <div className='flex items-center gap-2'>
              {artifact.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'rounded px-2 py-0.5 font-mono text-[11px]',
                    isDark
                      ? 'bg-white/5 text-white/50'
                      : 'bg-black/[0.02] text-black/50',
                  )}>
                  {tag}
                </span>
              ))}
              {artifact.tags.length > 2 && (
                <span
                  className={cn(
                    'text-[11px]',
                    isDark ? 'text-white/30' : 'text-black/30',
                  )}>
                  +{artifact.tags.length - 2}
                </span>
              )}
            </div>
          </div>

          {/* Right side: Stats and tag button */}
          <div className='flex items-center gap-4'>
            {/* Stats */}
            <m.div
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: isHovered ? 1 : 0,
                x: isHovered ? 0 : -10,
              }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className='flex items-center gap-2 font-mono text-[11px]'>
              {artifact.links.length > 0 && (
                <span style={{ color: '#00d4ff' }}>
                  {artifact.links.length} links
                </span>
              )}
              {artifact.backlinks.length > 0 && (
                <span style={{ color: '#faad14' }}>
                  {artifact.backlinks.length} refs
                </span>
              )}
            </m.div>

            {/* Tag Button */}
            <m.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: isHovered ? 1 : 0.6 }}
              transition={{ duration: 0.2 }}>
              <TagButton
                itemId={artifact.id}
                isTagged={isTagged}
                size='small'
                onClick={handleTagClick}
                disabled={false}
              />
            </m.div>
          </div>
        </div>
      </div>
    </m.div>
  )
}
