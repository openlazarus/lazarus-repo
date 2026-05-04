'use client'

import {
  RiArrowRightLine,
  RiDatabase2Line,
  RiFolderLine,
  RiRobot2Line,
  RiSparklingLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useCallback, useState } from 'react'

import { cn } from '@/lib/utils'

import { ChatMessage, TemplateCardData } from '../types'
import { BaseMessage } from './base-message'

export interface TemplateCardMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'template-card'
      templates: TemplateCardData[]
      selectable?: boolean
    }
  }
  onActionClick?: (messageId: string, actionId: string) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
  isGrouped?: boolean
  isLastInGroup?: boolean
}

/**
 * TemplateCardMessage - Displays workspace template cards inline in chat
 * Used by the Workspace Designer agent during onboarding to show template options
 */
export const TemplateCardMessage = memo<TemplateCardMessageProps>(
  ({
    message,
    onActionClick,
    className,
    uiVariant = 'desktop',
    isGrouped,
    isLastInGroup,
  }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
      null,
    )

    const templates = message.variant.templates
    const selectable = message.variant.selectable !== false

    const handleSelectTemplate = useCallback(
      (templateId: string) => {
        if (!selectable) return
        setSelectedTemplateId(templateId)
        // Action format: "select-template:{templateId}"
        onActionClick?.(message.id, `select-template:${templateId}`)
      },
      [selectable, onActionClick, message.id],
    )

    // If a template is selected, show confirmation state
    if (selectedTemplateId) {
      const selectedTemplate = templates.find(
        (t) => t.id === selectedTemplateId,
      )
      return (
        <BaseMessage
          message={message}
          className={className}
          uiVariant={uiVariant}
          isGrouped={isGrouped}
          isLastInGroup={isLastInGroup}>
          <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400'>
            <RiSparklingLine className='h-4 w-4' />
            <span className='text-[13px] font-medium'>
              Selected: {selectedTemplate?.name || 'Template'}
            </span>
          </div>
        </BaseMessage>
      )
    }

    return (
      <BaseMessage
        message={message}
        showBubble={false}
        className={className}
        uiVariant={uiVariant}
        isGrouped={isGrouped}
        isLastInGroup={isLastInGroup}
        wrapperClassName='!max-w-full'>
        <div className='w-full'>
          {/* Horizontal scrollable container for multiple templates */}
          <div
            className={cn(
              'flex gap-3 pb-2',
              templates.length > 1 && 'overflow-x-auto',
            )}>
            {templates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                onSelect={handleSelectTemplate}
                selectable={selectable}
              />
            ))}
          </div>
        </div>
      </BaseMessage>
    )
  },
)

TemplateCardMessage.displayName = 'TemplateCardMessage'

interface TemplateCardProps {
  template: TemplateCardData
  index: number
  onSelect: (templateId: string) => void
  selectable: boolean
}

const TemplateCard = memo<TemplateCardProps>(
  ({ template, index, onSelect, selectable }) => {
    return (
      <m.button
        onClick={() => selectable && onSelect(template.id)}
        disabled={!selectable}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
          delay: index * 0.05,
        }}
        whileHover={selectable ? { scale: 1.02 } : undefined}
        whileTap={selectable ? { scale: 0.98 } : undefined}
        className={cn(
          'flex min-w-[280px] max-w-[320px] flex-shrink-0 flex-col rounded-xl border p-4 text-left transition-all',
          'bg-white dark:bg-[#1a1a1b]',
          'border-gray-200 dark:border-white/10',
          selectable && [
            'cursor-pointer',
            'hover:border-[hsl(var(--lazarus-blue))]/50',
            'hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
          ],
          !selectable && 'cursor-default opacity-80',
        )}>
        {/* Header */}
        <div className='mb-3 flex items-start justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <h4 className='text-[14px] font-semibold text-foreground'>
                {template.name}
              </h4>
              {template.featured && (
                <span
                  className='rounded px-1.5 py-0.5 text-[9px] font-medium'
                  style={{
                    background: 'hsl(var(--lazarus-blue) / 0.1)',
                    color: 'hsl(var(--lazarus-blue))',
                  }}>
                  Featured
                </span>
              )}
            </div>
            <p className='mt-1 text-[12px] text-muted-foreground'>
              {template.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className='mb-3 flex items-center gap-4 text-[11px] text-muted-foreground'>
          <div className='flex items-center gap-1.5'>
            <RiFolderLine className='h-3.5 w-3.5' />
            <span>{template.folderCount} folders</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <RiRobot2Line className='h-3.5 w-3.5' />
            <span>{template.agentCount} agents</span>
          </div>
          {template.databaseCount > 0 && (
            <div className='flex items-center gap-1.5'>
              <RiDatabase2Line className='h-3.5 w-3.5' />
              <span>{template.databaseCount} db</span>
            </div>
          )}
        </div>

        {/* Agent preview - show first 3 */}
        <div className='mb-3 space-y-1.5'>
          <span className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
            Agents
          </span>
          <div className='flex flex-wrap gap-1.5'>
            {template.agents.slice(0, 3).map((agent) => (
              <span
                key={agent.name}
                className='rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700 dark:bg-white/10 dark:text-gray-300'>
                {agent.name}
              </span>
            ))}
            {template.agents.length > 3 && (
              <span className='rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-white/10 dark:text-gray-400'>
                +{template.agents.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Select button */}
        {selectable && (
          <div className='mt-auto flex items-center justify-end pt-2'>
            <span
              className='flex items-center gap-1 text-[12px] font-medium'
              style={{ color: 'hsl(var(--lazarus-blue))' }}>
              Select
              <RiArrowRightLine className='h-3.5 w-3.5' />
            </span>
          </div>
        )}
      </m.button>
    )
  },
)

TemplateCard.displayName = 'TemplateCard'

export default TemplateCardMessage
