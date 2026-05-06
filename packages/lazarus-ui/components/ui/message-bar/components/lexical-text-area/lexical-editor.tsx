'use client'

import { CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
} from '@lexical/markdown'
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { COMMAND_PRIORITY_LOW, EditorState, KEY_ENTER_COMMAND } from 'lexical'
import React, { useCallback, useEffect, useMemo } from 'react'

// Only use inline text transformers for the message bar (no block-level like headings, lists, quotes)
const MESSAGE_BAR_TRANSFORMERS = [
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  INLINE_CODE,
]

import { MentionNode } from './nodes/mention-node'
import { HistoryPlugin as MessageHistoryPlugin } from './plugins/history-plugin'
import MentionsPlugin from './plugins/mentions-plugin'
import {
  MessageBarPlugin,
  SUBMIT_EDITOR_COMMAND,
} from './plugins/message-bar-plugin'
import { TagSuggestionsPlugin } from './plugins/tag-suggestions-plugin'
import { CursorPosition, Item } from './plugins/types'

// Error boundary component for Lexical
function LexicalErrorBoundaryComponent({
  children,
}: {
  children: React.ReactNode
}) {
  return <React.Fragment>{children}</React.Fragment>
}
// Simple placeholder plugin
const PlaceholderPlugin = ({ placeholder }: { placeholder: string }) => {
  const editorPlaceholderStyle = {
    overflow: 'hidden',
    position: 'absolute',
    textOverflow: 'ellipsis',
    top: '12px',
    left: '16px',
    fontSize: '14px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif',
    fontWeight: '400',
    letterSpacing: '-0.01em',
    userSelect: 'none',
    display: 'inline-block',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease',
    backgroundColor: 'transparent !important',
  } as React.CSSProperties

  return (
    <div
      className='editor-placeholder text-gray-400 dark:text-gray-500'
      style={editorPlaceholderStyle}>
      {placeholder}
    </div>
  )
}

// Enhanced global styles for Apple-like text selection with aggressive focus outline removal
const globalStyles = `
//   ::selection {
//     background-color: rgba(0, 122, 255, 0.2);
//   }
  
//   .editor-input::selection {
//     background-color: rgba(0, 122, 255, 0.2);
//   }
  
  /* Aggressive focus style removal */
  .editor-input,
  .editor-input:focus,
  .editor-input:focus-visible,
  .editor-input:focus-within,
  .editor-container,
  .editor-container *,
  .editor-container *:focus,
  .editor-container *:focus-visible,
  [contenteditable],
  [contenteditable]:focus,
  [contenteditable]:focus-visible,
  [contenteditable]:active {
    box-shadow: none !important;
    outline: none !important;
    outline-width: 0 !important;
    outline-color: transparent !important;
    border-color: inherit !important;
    border-width: 0 !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    ring-width: 0 !important;
    ring-color: transparent !important;
  }

  /* Target React Focus Ring specifically */
  div[data-focus-visible-added],
  div[data-focus-visible-added]:focus {
    outline: none !important;
    box-shadow: none !important;
  }
  
  .message-bar-text {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.4;
    transition: all 0.15s ease;
  }
  
  .message-bar-text-bold {
    font-weight: 600;
  }
  
  .message-bar-text-italic {
    font-style: italic;
  }
  
  .message-bar-paragraph {
    margin: 0;
    position: relative;
    font-size: 14px;
    line-height: 1.4;
  }
  
  /* Style for @ mentions */
  .message-bar-mention {
    color: #0098FC;
    font-weight: 500;
  }

  /* Markdown formatting styles */
  .message-bar-text-bold {
    font-weight: 600;
  }

  .message-bar-text-italic {
    font-style: italic;
  }

  .message-bar-text-underline {
    text-decoration: underline;
  }

  .message-bar-text-strikethrough {
    text-decoration: line-through;
  }

  .message-bar-text-code {
    background-color: rgba(142, 142, 147, 0.12);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
    font-size: 0.9em;
  }

  .dark .message-bar-text-code {
    background-color: rgba(142, 142, 147, 0.24);
  }

  .message-bar-h1,
  .message-bar-h2,
  .message-bar-h3,
  .message-bar-h4,
  .message-bar-h5,
  .message-bar-h6 {
    font-weight: 600;
    margin: 0;
    padding: 0;
    font-size: 14px;
    line-height: 1.4;
    display: block;
    min-height: 1.4em;
  }

  .message-bar-quote {
    border-left: 3px solid hsl(var(--lazarus-blue));
    padding-left: 12px;
    margin: 0;
    padding-top: 0;
    padding-bottom: 0;
    color: #6e6e73;
    font-size: 14px;
    line-height: 1.4;
    min-height: 1.4em;
  }

  .dark .message-bar-quote {
    color: #98989d;
  }

  .message-bar-ul,
  .message-bar-ol {
    margin: 0;
    padding-left: 20px;
    font-size: 14px;
    line-height: 1.4;
  }

  .message-bar-listitem {
    margin: 0;
    padding: 0;
    font-size: 14px;
    line-height: 1.4;
  }

  .message-bar-nested-listitem {
    margin: 0;
    padding: 0;
  }

  .message-bar-link {
    color: hsl(var(--lazarus-blue));
    text-decoration: none;
  }

  .message-bar-link:hover {
    text-decoration: underline;
  }

  .message-bar-code {
    background-color: rgba(142, 142, 147, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 8px;
    padding: 8px 12px;
    margin: 0;
    font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
    font-size: 13px;
    white-space: pre-wrap;
    overflow-x: auto;
    line-height: 1.4;
  }

  .dark .message-bar-code {
    background-color: rgba(142, 142, 147, 0.12);
    border-color: rgba(255, 255, 255, 0.08);
  }
  
  @keyframes cursorBlink {
    0% { opacity: 1; }
    50% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  [data-lexical-cursor] {
    position: relative;
    border-left-color: #007AFF !important;
    border-left-width: 2px !important;
    animation: cursorBlink 1s ease infinite;
  }
`

// Add specific iOS styles
const iOSStyles = `
  @supports (-webkit-touch-callout: none) {
    .mobile-editor-input {
      /* Removing webkit-backdrop-filter and backdrop-filter */
      background-color: transparent !important;
      background: transparent !important;
    }
    
    /* Safari-specific transparent background */
    .editor-input {
      background-color: transparent !important;
      background: transparent !important;
      -webkit-background-color: transparent !important;
    }
    
    /* iOS keyboard animation support */
    @media screen and (max-width: 768px) {
      .editor-input:focus {
        transform: translateY(0) !important;
        background-color: transparent !important;
      }
    }
  }
`

interface LexicalEditorProps {
  variant: 'mobile' | 'desktop'
  placeholder: string
  initialConfig?: InitialConfigType
  handleEditorChange: (editorState: EditorState) => void
  handleKeyDown?: (e: React.KeyboardEvent) => void
  onFocus: (e: React.FocusEvent) => void
  onBlur: (e: React.FocusEvent) => void
  setEditorRef?: (editor: any) => void
  autoFocus?: boolean
  handleTagSelection?: (item: Item) => void
  tagSuggestions?: Item[]
  showTagSuggestions?: boolean
  cursorPosition?: CursorPosition | null
  handleSubmit?: (text: string) => void
  onContentEmpty?: () => void
}

// KeyboardHandlerPlugin to manage keyboard shortcuts
function KeyboardHandlerPlugin({
  variant,
}: {
  variant: 'mobile' | 'desktop'
  handleKeyDown?: (e: React.KeyboardEvent) => void
  onFocus: (e: React.FocusEvent) => void
  onBlur: (e: React.FocusEvent) => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Handler for Enter key
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event instanceof KeyboardEvent) {
          // Check if the mentions menu is open via global flag
          if (
            typeof window !== 'undefined' &&
            (window as any).__mentionsMenuOpen
          ) {
            // Let the typeahead menu handle the Enter key
            return false
          }

          if (variant === 'mobile') {
            // On mobile, allow Enter to create new lines (don't prevent default)
            return false
          } else if (!event.shiftKey) {
            // On desktop, Enter without shift submits
            event.preventDefault()
            editor.dispatchCommand(SUBMIT_EDITOR_COMMAND, undefined)
            return true
          }
        }
        return false
      },
      COMMAND_PRIORITY_LOW, // Changed from COMMAND_PRIORITY_CRITICAL to allow mentions plugin to handle first
    )

    return () => {
      removeEnterListener()
    }
  }, [editor, variant])

  return null
}

export const LexicalEditor: React.FC<LexicalEditorProps> = ({
  variant,
  placeholder,
  initialConfig: _propInitialConfig,
  handleEditorChange,
  handleKeyDown = () => false,
  onFocus,
  onBlur,
  setEditorRef = () => {},
  autoFocus = false,
  handleTagSelection = () => {},
  tagSuggestions = [],
  showTagSuggestions = false,
  cursorPosition = null,
  handleSubmit,
  onContentEmpty,
}) => {
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.textContent = globalStyles + iOSStyles
    document.head.appendChild(styleEl)

    return () => {
      styleEl.remove()
    }
  }, [])

  // Direct pass-through of editor changes without throttling
  // The height calculation needs immediate updates
  const optimizedHandleEditorChange = useCallback(
    (editorState: EditorState) => {
      handleEditorChange(editorState)
    },
    [handleEditorChange],
  )

  // Default initialConfig
  const defaultInitialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: `message-bar-${variant}`,
      nodes: [
        MentionNode,
        HeadingNode,
        QuoteNode,
        CodeNode,
        ListNode,
        ListItemNode,
        LinkNode,
      ],
      theme: {
        text: {
          base: 'message-bar-text',
          bold: 'message-bar-text-bold',
          italic: 'message-bar-text-italic',
          underline: 'message-bar-text-underline',
          strikethrough: 'message-bar-text-strikethrough',
          underlineStrikethrough: 'message-bar-text-underlineStrikethrough',
          code: 'message-bar-text-code',
        },
        mention: 'message-bar-mention',
        paragraph: 'message-bar-paragraph',
        heading: {
          h1: 'message-bar-h1',
          h2: 'message-bar-h2',
          h3: 'message-bar-h3',
        },
        link: 'message-bar-link',
        list: {
          ul: 'message-bar-ul',
          ol: 'message-bar-ol',
          listitem: 'message-bar-listitem',
          nested: {
            listitem: 'message-bar-nested-listitem',
          },
        },
        quote: 'message-bar-quote',
        code: 'message-bar-code',
        codeHighlight: {
          atrule: 'message-bar-token-attr',
          attr: 'message-bar-token-attr',
          boolean: 'message-bar-token-property',
          builtin: 'message-bar-token-builtin',
          cdata: 'message-bar-token-cdata',
          char: 'message-bar-token-char',
          class: 'message-bar-token-class',
          'class-name': 'message-bar-token-class-name',
          comment: 'message-bar-token-comment',
          constant: 'message-bar-token-constant',
          deleted: 'message-bar-token-deleted',
          doctype: 'message-bar-token-doctype',
          entity: 'message-bar-token-entity',
          function: 'message-bar-token-function',
          important: 'message-bar-token-important',
          inserted: 'message-bar-token-inserted',
          keyword: 'message-bar-token-keyword',
          namespace: 'message-bar-token-namespace',
          number: 'message-bar-token-number',
          operator: 'message-bar-token-operator',
          prolog: 'message-bar-token-prolog',
          property: 'message-bar-token-property',
          punctuation: 'message-bar-token-punctuation',
          regex: 'message-bar-token-regex',
          selector: 'message-bar-token-selector',
          string: 'message-bar-token-string',
          symbol: 'message-bar-token-symbol',
          tag: 'message-bar-token-tag',
          url: 'message-bar-token-url',
          variable: 'message-bar-token-variable',
        },
      },
      onError: (error) => console.error('Lexical editor error:', error),
    }),
    [variant],
  )

  // Use provided config or default
  const editorConfig = useMemo(() => {
    if (_propInitialConfig) {
      // Merge nodes array to ensure all required nodes are included
      return {
        ..._propInitialConfig,
        nodes: [
          ...(_propInitialConfig.nodes || []),
          MentionNode,
          HeadingNode,
          QuoteNode,
          CodeNode,
          ListNode,
          ListItemNode,
          LinkNode,
        ],
      }
    }
    return defaultInitialConfig
  }, [_propInitialConfig, defaultInitialConfig])

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div
        className='editor-container'
        style={{ outline: 'none', boxShadow: 'none' }}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={`editor-input ${variant === 'mobile' ? 'mobile-editor-input' : ''} text-gray-900 dark:text-white`}
              onKeyDown={(e) => {
                // For all standard key handling
                if (handleKeyDown) {
                  handleKeyDown(e)
                }
              }}
              onFocus={onFocus}
              onBlur={onBlur}
              style={{
                minHeight: '24px',
                height: 'auto',
                padding: '12px 16px 16px 16px',
                borderRadius: '0',
                resize: 'none',
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif',
                fontSize: '14px',
                fontWeight: '400',
                letterSpacing: '-0.022em',
                caretColor: '#007AFF',
                position: 'relative',
                tabSize: 1,
                outline: 'none !important',
                outlineWidth: '0 !important',
                outlineColor: 'transparent !important',
                boxShadow: 'none !important',
                border: 'none !important',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                transition: 'all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                lineHeight: '1.4',
                background: 'transparent',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
              }}
            />
          }
          placeholder={<PlaceholderPlugin placeholder={placeholder} />}
          ErrorBoundary={LexicalErrorBoundaryComponent}
        />
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={MESSAGE_BAR_TRANSFORMERS} />
        <OnChangePlugin onChange={optimizedHandleEditorChange} />
        <KeyboardHandlerPlugin
          variant={variant}
          handleKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <MessageBarPlugin
          setEditorRef={setEditorRef}
          autoFocus={autoFocus}
          variant={variant}
          handleSubmit={(text) => {
            // Call the submit handler directly
            if (typeof handleSubmit === 'function') {
              handleSubmit(text)
            }
          }}
          onContentEmpty={onContentEmpty}
        />
        <MessageHistoryPlugin />
        <MentionsPlugin />
        <TagSuggestionsPlugin
          onTagSelection={handleTagSelection}
          suggestions={tagSuggestions}
          showSuggestions={showTagSuggestions}
          cursorPosition={cursorPosition}
        />
      </div>
    </LexicalComposer>
  )
}
