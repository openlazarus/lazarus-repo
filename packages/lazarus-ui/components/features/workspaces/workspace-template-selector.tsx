'use client'

import { Check } from 'lucide-react'
import * as m from 'motion/react-m'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { List } from '@/components/ui/list'
import { cn } from '@/lib/utils'

export interface WorkspaceTemplate {
  id: string
  name: string
  description: string
  icon: string
  agentTemplateIds: string[]
  category: 'general' | 'sales' | 'finance' | 'custom'
  isPremium?: boolean
}

interface WorkspaceTemplateSelectorProps {
  templates: WorkspaceTemplate[]
  selectedTemplateId: string
  onSelect: (templateId: string) => void
  className?: string
}

/**
 * Category colors using design system variables
 */
const getCategoryColor = (category: WorkspaceTemplate['category']): string => {
  switch (category) {
    case 'general':
      return 'text-[hsl(var(--lazarus-blue))]'
    case 'sales':
      return 'text-[hsl(var(--lazarus-cyan))]'
    case 'finance':
      return 'text-[hsl(204_85%_60%)]' // Green variant
    case 'custom':
      return 'text-[hsl(var(--text-secondary))]'
    default:
      return 'text-[hsl(var(--text-tertiary))]'
  }
}

/**
 * Workspace Template Selector Component
 *
 * Displays available workspace templates using the List component.
 * Users can select a template to determine which agents will be created.
 */
export const WorkspaceTemplateSelector: React.FC<
  WorkspaceTemplateSelectorProps
> = ({ templates, selectedTemplateId, onSelect, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className='text-sm font-medium leading-none'>
        Workspace template
      </label>

      <List
        items={templates}
        itemsToShow={templates.length}
        loadMore={() => {}}
        hasMore={false}
        loading={false}
        containerClassName='max-h-[320px] overflow-y-auto rounded-xl border border-[hsl(var(--border))]'
        renderItem={(template, _index, { isExpanded: _isExpanded }) => {
          const isSelected = selectedTemplateId === template.id
          const agentCount = template.agentTemplateIds.length

          return (
            <m.div
              className={cn(
                'relative cursor-pointer transition-colors',
                'hover:bg-[hsl(var(--background))]/50',
                isSelected && 'bg-[hsl(var(--lazarus-blue))]/5',
              )}
              onClick={() => onSelect(template.id)}
              whileHover={{
                backgroundColor: 'rgba(0, 152, 252, 0.02)',
                transition: { duration: 0.2 },
              }}
              whileTap={{ opacity: 0.8 }}>
              <div className='flex items-start gap-3 p-3'>
                {/* Selection indicator */}
                {isSelected && (
                  <m.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--lazarus-blue))]'>
                    <Check className='h-2.5 w-2.5 text-white' />
                  </m.div>
                )}
                {!isSelected && (
                  <div className='h-4 w-4 shrink-0 rounded-full border-2 border-[hsl(var(--border))]' />
                )}

                {/* Content */}
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-center gap-2'>
                    <h4 className='text-sm font-medium text-[hsl(var(--text-primary))]'>
                      {template.name}
                    </h4>
                    {template.isPremium && (
                      <Badge variant='default' className='text-[10px]'>
                        Premium
                      </Badge>
                    )}
                    {agentCount > 0 && (
                      <Badge variant='secondary' className='text-[10px]'>
                        {agentCount} {agentCount === 1 ? 'agent' : 'agents'}
                      </Badge>
                    )}
                  </div>
                  <p className='text-xs text-[hsl(var(--text-secondary))]'>
                    {template.description}
                  </p>
                </div>
              </div>
            </m.div>
          )
        }}
      />
    </div>
  )
}

/**
 * Format agent template ID to human-readable name
 */
function formatAgentName(agentId: string): string {
  // Convert IDs like 'database-manager', 'sales-researcher' to 'Database manager', 'Sales researcher'
  const formatted = agentId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  // Return sentence case (only first letter capitalized)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase()
}

export default WorkspaceTemplateSelector
