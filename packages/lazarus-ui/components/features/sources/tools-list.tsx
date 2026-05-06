'use client'

import {
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiExpandUpDownLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useState } from 'react'

import type { MCPResource, MCPTool } from '@/hooks/features/mcp/types'
import { cn } from '@/lib/utils'

interface ToolsListProps {
  tools: MCPTool[]
  resources?: MCPResource[]
  isDark: boolean
  className?: string
}

export function ToolsList({
  tools,
  resources,
  isDark,
  className,
}: ToolsListProps) {
  const [expandedTools, setExpandedTools] = useState(false)
  const [expandedResources, setExpandedResources] = useState(false)

  const displayTools = expandedTools ? tools : tools.slice(0, 3)
  const displayResources = expandedResources
    ? resources
    : resources?.slice(0, 3)

  if (tools.length === 0 && (!resources || resources.length === 0)) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {tools.length > 0 && (
        <div>
          <div className='mb-2 flex items-center justify-between'>
            <h4 className='flex items-center gap-2 text-sm font-medium'>
              <RiCodeSSlashLine size={16} className='text-blue-500' />
              Available Tools ({tools.length})
            </h4>
            {tools.length > 3 && (
              <button
                onClick={() => setExpandedTools(!expandedTools)}
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isDark
                    ? 'text-white/60 hover:text-white'
                    : 'text-black/60 hover:text-black',
                )}>
                <RiExpandUpDownLine size={14} />
                {expandedTools ? 'Show less' : `Show all ${tools.length}`}
              </button>
            )}
          </div>

          <m.div
            className='space-y-3'
            initial='hidden'
            animate='visible'
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.1,
                },
              },
            }}>
            {displayTools.map((tool, index) => (
              <m.div
                key={tool.name}
                className={cn(
                  'border-b pb-3',
                  isDark ? 'border-white/5' : 'border-black/5',
                )}
                variants={{
                  hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
                  visible: {
                    opacity: 1,
                    x: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}>
                <div className='flex items-start gap-3'>
                  <span className='w-16 font-mono text-[12px] opacity-50'>
                    {tool.name}
                  </span>
                  <div className='flex-1'>
                    {tool.annotations?.title && (
                      <div className='mb-1 text-[13px] font-medium'>
                        {tool.annotations.title}
                      </div>
                    )}
                    {tool.description && (
                      <p
                        className={cn(
                          'text-[12px]',
                          isDark ? 'text-white/50' : 'text-black/50',
                        )}>
                        {tool.description
                          .split('\n')
                          .find((line) => line.trim().length > 0) ||
                          tool.description}
                      </p>
                    )}
                    {tool.inputSchema?.properties &&
                      Object.keys(tool.inputSchema.properties).length > 0 && (
                        <div className='mt-1.5'>
                          <span
                            className={cn(
                              'font-mono text-[11px]',
                              isDark ? 'text-white/30' : 'text-black/30',
                            )}>
                            params:{' '}
                            {Object.keys(tool.inputSchema.properties).join(
                              ', ',
                            )}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </m.div>
            ))}
          </m.div>
        </div>
      )}

      {resources && resources.length > 0 && (
        <div>
          <div className='mb-2 flex items-center justify-between'>
            <h4 className='flex items-center gap-2 text-sm font-medium'>
              <RiDatabase2Line size={16} className='text-purple-500' />
              Available Resources ({resources.length})
            </h4>
            {resources.length > 3 && (
              <button
                onClick={() => setExpandedResources(!expandedResources)}
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isDark
                    ? 'text-white/60 hover:text-white'
                    : 'text-black/60 hover:text-black',
                )}>
                <RiExpandUpDownLine size={14} />
                {expandedResources
                  ? 'Show less'
                  : `Show all ${resources.length}`}
              </button>
            )}
          </div>

          <div className='space-y-2'>
            {displayResources?.map((resource, idx) => (
              <div
                key={resource.uri || idx}
                className={cn(
                  'rounded-lg border p-3',
                  isDark
                    ? 'border-white/10 bg-white/[0.02]'
                    : 'border-black/10 bg-black/[0.02]',
                )}>
                <div className='flex items-start gap-2'>
                  <RiDatabase2Line
                    size={14}
                    className='mt-0.5 flex-shrink-0 text-purple-500'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-xs font-medium'>
                      {resource.name}
                    </p>
                    {resource.uri && (
                      <code
                        className={cn(
                          'mt-1 block truncate font-mono text-xs',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}>
                        {resource.uri}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
