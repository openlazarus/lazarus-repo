'use client'

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { TagButton } from '@/components/ui/button/tag-button'
import { useKnowledgeArtifact } from '@/hooks/features/knowledge/use-knowledge-graph'
import { useTheme } from '@/hooks/ui/use-theme'
import { getMarkdownStyles } from '@/lib/markdown-styles'
import { cn } from '@/lib/utils'

interface ArtifactViewerProps {
  workspaceId: string
  userId: string
  artifactId: string
  agentId?: string
  onClose: () => void
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

// Beautiful pastel gradient combinations (matching activity page)
const pastelGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink to coral
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Sky blue
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Mint green
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink to yellow
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Teal to deep purple
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Aqua to pink
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral to lavender
]

const getTypeGradient = (type: string): string => {
  let hash = 0
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % pastelGradients.length
  return pastelGradients[index]
}

export function ArtifactViewer({
  workspaceId,
  userId,
  artifactId,
  agentId,
  onClose,
}: ArtifactViewerProps) {
  const { isDark } = useTheme()
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const [isTagged, setIsTagged] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const { artifact, backlinks, loading, error } = useKnowledgeArtifact({
    workspaceId,
    userId,
    agentId,
    artifactId,
    autoLoad: true,
  })

  const handleBack = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 150)
  }

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsTagged(!isTagged)
  }

  const handleCopyContent = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!artifact) return

    try {
      await navigator.clipboard.writeText(artifact.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  if (loading) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm',
          isDark ? 'bg-black/80' : 'bg-white/80',
        )}>
        <div className='text-center'>
          <div
            className={cn(
              'mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2',
              isDark
                ? 'border-zinc-700 border-t-zinc-400'
                : 'border-[#e5e5e7] border-t-[#86868b]',
            )}></div>
          <p
            className={cn(
              'text-sm',
              isDark ? 'text-zinc-500' : 'text-[#86868b]',
            )}>
            Loading artifact...
          </p>
        </div>
      </div>
    )
  }

  if (error || !artifact) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm',
          isDark ? 'bg-black/80' : 'bg-white/80',
        )}>
        <div
          className={cn(
            'rounded-lg border p-6 text-center',
            isDark
              ? 'border-zinc-800 bg-[#111111]'
              : 'border-[#e5e5e7] bg-white',
          )}>
          <p
            className={cn('mb-2', isDark ? 'text-zinc-400' : 'text-[#86868b]')}>
            Failed to load artifact
          </p>
          <p
            className={cn(
              'mb-4 text-sm',
              isDark ? 'text-zinc-600' : 'text-[#a1a1a6]',
            )}>
            {error?.message || 'Unknown error'}
          </p>
          <button
            onClick={onClose}
            className={cn(
              'rounded-lg px-4 py-2 text-sm transition-colors',
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700'
                : 'bg-[#fafafa] hover:bg-[#e5e5e7]',
            )}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const typeColor = typeColors[artifact.type]
  const typeLabel = typeLabels[artifact.type]

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
          isDark ? 'bg-black/60' : 'bg-white/60',
        )}
        onClick={onClose}>
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: isExiting ? 0 : 1,
            scale: isExiting ? 0.95 : 1,
          }}
          transition={{ duration: 0.3 }}
          className={cn(
            'relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border shadow-2xl',
            isDark
              ? 'border-white/10 bg-[#1a1a1a]'
              : 'border-black/10 bg-white',
          )}
          onClick={(e) => e.stopPropagation()}>
          <div className='flex h-full max-h-[85vh] flex-col'>
            {/* Header */}
            <div
              className={cn(
                'border-b px-6 py-4',
                isDark ? 'border-white/10' : 'border-black/10',
              )}>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-[16px] font-semibold'>
                    {artifact.title}
                  </h2>
                  <div className='mt-1 flex items-center gap-3 text-[12px]'>
                    <span
                      className='rounded-full px-2 py-0.5 font-medium'
                      style={{
                        backgroundColor: typeColor + '15',
                        color: typeColor,
                      }}>
                      {typeLabel}
                    </span>
                    {artifact.metadata.importance === 'high' && (
                      <span
                        className={cn(
                          isDark ? 'text-white/50' : 'text-black/50',
                        )}>
                        High priority
                      </span>
                    )}
                    <span
                      className={cn(
                        isDark ? 'text-white/40' : 'text-black/40',
                      )}>
                      {new Date(artifact.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  {/* Copy Content Button */}
                  <button
                    onClick={handleCopyContent}
                    title='Copy content'
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-all',
                      isDark
                        ? 'text-white/60 hover:bg-white/10 hover:text-white/80'
                        : 'text-black/60 hover:bg-black/10 hover:text-black/80',
                      isCopied && 'text-[#0098FC]',
                    )}>
                    {isCopied ? (
                      <>
                        <RiCheckLine className='h-3.5 w-3.5' />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <RiFileCopyLine className='h-3.5 w-3.5' />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <TagButton
                    itemId={artifact.id}
                    isTagged={isTagged}
                    size='small'
                    onClick={handleTagClick}
                    disabled={false}
                  />
                  <button
                    onClick={handleBack}
                    className={cn(
                      'rounded-md p-2 transition-colors',
                      isDark
                        ? 'text-white/60 hover:bg-white/10'
                        : 'text-black/60 hover:bg-black/10',
                    )}>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'>
                      <line x1='18' y1='6' x2='6' y2='18'></line>
                      <line x1='6' y1='6' x2='18' y2='18'></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className='flex-1 overflow-y-auto p-6'>
              {/* Content section */}
              <div className='mb-6'>
                <h3 className='mb-3 text-[13px] font-medium text-black/60 dark:text-white/60'>
                  Content
                </h3>
                <div className={cn(getMarkdownStyles(), 'max-w-none')}>
                  <ReactMarkdown
                    components={{
                      // Override heading sizes for compact viewer
                      h1: ({ node, ...props }) => (
                        <h1
                          className='mb-3 mt-6 text-[20px] font-semibold leading-tight first:mt-0'
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          className='mb-2.5 mt-5 text-[14px] font-semibold leading-tight first:mt-0'
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className='mb-2 mt-4 text-[15px] font-semibold leading-tight first:mt-0'
                          {...props}
                        />
                      ),
                      // Adjust paragraph spacing
                      p: ({ node, ...props }) => (
                        <p
                          className='mb-3 text-[14px] leading-relaxed'
                          {...props}
                        />
                      ),
                      // Style lists
                      ul: ({ node, ...props }) => (
                        <ul
                          className='mb-3 ml-4 list-disc space-y-1.5 text-[14px]'
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          className='mb-3 ml-4 list-decimal space-y-1.5 text-[14px]'
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className='leading-relaxed' {...props} />
                      ),
                      // Style links as wikilinks
                      a: ({ node, ...props }) => {
                        const href = props.href || ''
                        // Check if it's a wikilink
                        if (href.startsWith('[[') && href.endsWith(']]')) {
                          const title = href.slice(2, -2)
                          return (
                            <span className='cursor-pointer rounded bg-purple-500/10 px-1.5 py-0.5 text-[14px] text-purple-400 hover:bg-purple-500/20'>
                              {title}
                            </span>
                          )
                        }
                        // Use default link styles from centralized config
                        return <a {...props} />
                      },
                    }}>
                    {artifact.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Links */}
              {artifact.links.length > 0 && (
                <div className='mb-6'>
                  <h3 className='mb-3 text-[13px] font-medium text-black/60 dark:text-white/60'>
                    Links ({artifact.links.length})
                  </h3>
                  <div className='space-y-1.5'>
                    {artifact.links.map((link, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-2 text-[12px]',
                          isDark ? 'text-white/70' : 'text-black/70',
                        )}>
                        <span className='text-blue-400'>→</span>
                        <span>{link}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Backlinks */}
              {backlinks.length > 0 && (
                <div className='mb-6'>
                  <h3 className='mb-3 text-[13px] font-medium text-black/60 dark:text-white/60'>
                    Referenced By ({backlinks.length})
                  </h3>
                  <div className='space-y-1.5'>
                    {backlinks.map((backlink) => (
                      <div
                        key={backlink.id}
                        className={cn(
                          'flex items-center gap-2 text-[12px]',
                          isDark ? 'text-white/70' : 'text-black/70',
                        )}>
                        <span className='text-purple-400'>←</span>
                        <span>{backlink.title}</span>
                        <span
                          className={cn(
                            'text-[11px]',
                            isDark ? 'text-white/40' : 'text-black/40',
                          )}>
                          ({backlink.type})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {artifact.tags.length > 0 && (
                <div className='mb-6'>
                  <h3 className='mb-3 text-[14px] font-semibold text-black/60 dark:text-white/60'>
                    Tags
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {artifact.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'rounded-full px-3 py-1 text-[12px]',
                          isDark
                            ? 'bg-white/5 text-white/50'
                            : 'bg-black/[0.03] text-black/50',
                        )}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </m.div>
      </div>
    </>
  )
}
