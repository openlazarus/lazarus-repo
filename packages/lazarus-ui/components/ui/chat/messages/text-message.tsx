'use client'

import 'katex/dist/katex.min.css'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { cn } from '@/lib/utils'
import { CodeBlock } from '../code-block'
import { getChatMarkdownStyles } from '../markdown-styles'
import { TableBlock } from '../table-block'

import { ChatMessage, MessageStatus } from '../types'
import { BaseMessage } from './base-message'

/**
 * Parse structured mentions from message content
 * Converts @{type:id} to **@filename** (extracts name from path/id)
 */
function formatMentions(content: string): string {
  // Match @{type:id} pattern - id can be a path like /README.md or workspace-xxx:/path
  const mentionRegex = /@\{([^:}]+):([^}]+)\}/g

  return content.replace(mentionRegex, (_match, _type, id) => {
    // Extract display name from the id (which may be a path)
    // Handle paths like "/README.md" or "workspace-xxx:/README.md"
    let displayName = id

    // If it contains a colon (workspace path format), get the part after the last colon
    if (id.includes(':')) {
      displayName = id.split(':').pop() || id
    }

    // Get the filename from the path
    if (displayName.includes('/')) {
      displayName = displayName.split('/').pop() || displayName
    }

    // Return as bold mention for markdown rendering
    return `**@${displayName}**`
  })
}

export interface TextMessageProps {
  message: ChatMessage & {
    variant: { type: 'text'; content: string; status?: MessageStatus }
  }
  isGrouped?: boolean
  isLastInGroup?: boolean
  showTimestamp?: boolean
  onRetry?: (messageId: string) => void
  onReactionClick?: (messageId: string, reaction: any) => void
  onTapbackClick?: (messageId: string, tapback: any) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
}

/**
 * TextMessage - Renders a simple text message with markdown support for assistant messages
 * Only provides content - BaseMessage handles ALL styling
 */
export const TextMessage = memo<TextMessageProps>((props) => {
  const { message } = props
  const rawContent = message.variant.content
  const isAssistant = message.role === 'assistant'

  // Format mentions for display (convert @{type:id:name} to @name)
  const content = useMemo(() => formatMentions(rawContent), [rawContent])

  // Markdown component shared between user and assistant messages
  const MarkdownContent = (
    <div
      className={cn(
        getChatMarkdownStyles(),
        '!text-[14px] [&_*]:!text-[14px]',
        // Override whitespace-pre-line from parent - markdown handles its own spacing
        '!whitespace-normal',
        // Use flexbox with gap for consistent spacing between block elements
        'flex flex-col gap-2 [&>*]:!mb-0 [&>*]:!mt-0',
        // User messages need white text - override all the specific color rules from markdown-styles
        !isAssistant && [
          '[&]:!text-white',
          '[&_p]:!text-white',
          '[&_li]:!text-white',
          '[&_a]:!text-white [&_a]:!underline',
          '[&_strong]:!text-white',
          '[&_em]:!text-white',
          '[&_code]:!text-white',
          '[&_pre]:!text-white',
          '[&_:not(pre)>code]:!bg-white/20 [&_:not(pre)>code]:!text-white',
          '[&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white',
          '[&_h4]:!text-white [&_h5]:!text-white [&_h6]:!text-white',
          '[&_blockquote]:!text-white/80',
          '[&_td]:!text-white [&_th]:!text-white/80',
          // Table backgrounds - override light backgrounds for user messages
          '[&_.table-scroll-container]:!bg-white/10 [&_.table-scroll-container]:!shadow-none',
          '[&_thead]:!bg-white/15',
          '[&_td]:!border-white/20 [&_th]:!border-white/20',
        ],
      )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // Block code: pre wraps code in react-markdown v10+
          pre({ node, children, ...props }) {
            return <>{children}</>
          },
          code({ node, className, children, ...props }) {
            const codeContent = String(children).replace(/\n$/, '')
            // Check if this is block code (has language class or newlines)
            const hasLanguage = className && className.includes('language-')
            const hasNewlines = codeContent.includes('\n')
            const isBlock = hasLanguage || hasNewlines

            return (
              <CodeBlock inline={!isBlock} className={className} {...props}>
                {codeContent}
              </CodeBlock>
            )
          },
          input({ node, type, checked, ...props }) {
            // Task list checkboxes
            if (type === 'checkbox') {
              return (
                <input type='checkbox' checked={checked} disabled {...props} />
              )
            }
            return <input type={type} {...props} />
          },
          table({ node, children, ...props }) {
            return (
              <TableBlock>
                <table {...props}>{children}</table>
              </TableBlock>
            )
          },
        }}>
        {content}
      </ReactMarkdown>
    </div>
  )

  return <BaseMessage {...props}>{MarkdownContent}</BaseMessage>
})

TextMessage.displayName = 'TextMessage'
