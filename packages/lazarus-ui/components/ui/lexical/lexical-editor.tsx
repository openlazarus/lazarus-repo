'use client'

import {
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
} from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import {
  $insertList,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { COMMAND_PRIORITY_LOW, EditorState } from 'lexical'
import React, { useEffect } from 'react'

import './lexical-styles.css'
import { COMPLETE_TRANSFORMERS } from './markdown-transformers'
import { DiffTextNode } from './nodes/diff-text-node'
import { TableHoverActionsPlugin } from './plugins/table-hover-actions-plugin'

interface LexicalEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  plugins?: React.ReactNode[]
  editorKey?: string
}

// Enhanced inspired diff styles
const diffStyles = `
  /* Simple Full-line Diff Styles */
  .diff-line-wrapper {
    display: block !important;
    width: 100%;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .diff-line-wrapper:hover {
    z-index: 15 !important;
  }
  
  .diff-line-added {
    background: linear-gradient(135deg, rgba(48, 209, 88, 0.08) 0%, rgba(48, 209, 88, 0.04) 100%) !important;
  }
  
  .diff-line-removed {
    background: linear-gradient(135deg, rgba(255, 69, 58, 0.08) 0%, rgba(255, 69, 58, 0.04) 100%) !important;
  }
  
  /* Hover-based action buttons with command-like design */
  .diff-action-buttons {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  }
  
  .diff-accept-btn,
  .diff-reject-btn {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    user-select: none;
  }
  
  .diff-accept-btn {
    color: #30d158;
  }
  
  .diff-reject-btn {
    color: #ff453a;
  }
  
  .diff-accept-btn:hover {
    background: rgba(48, 209, 88, 0.05) !important;
    border-color: rgba(48, 209, 88, 0.2) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
  }
  
  .diff-reject-btn:hover {
    background: rgba(255, 69, 58, 0.05) !important;
    border-color: rgba(255, 69, 58, 0.2) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
  }
  
  .diff-accept-btn:active,
  .diff-reject-btn:active {
    transform: translateY(0px) scale(0.98) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  }
  
  /* Command-like button content */
  .button-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .action-text {
    color: #1d1d1f;
    font-weight: 500;
  }
  
  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 1px;
    margin-left: 4px;
  }
  
  .key {
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 3px;
    padding: 1px 3px;
    font-size: 9px;
    font-weight: 600;
    color: #1d1d1f;
    min-width: 12px;
    text-align: center;
  }
  
  /* SVG icon animations for accept/reject */
  .diff-accept-btn svg,
  .diff-reject-btn svg {
    transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: center;
  }
  
  /* Content styling within diff lines */
  .diff-added {
    color: #1d4c31;
  }
  
  .diff-removed {
    color: #8b2018;
    text-decoration: line-through;
    text-decoration-color: rgba(255, 69, 58, 0.6);
    text-decoration-thickness: 1px;
  }
  
  .diff-unchanged {
    transition: all 0.15s ease;
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .diff-line-added {
      background: linear-gradient(135deg, rgba(48, 209, 88, 0.12) 0%, rgba(48, 209, 88, 0.06) 100%) !important;
    }
    
    .diff-line-removed {
      background: linear-gradient(135deg, rgba(255, 69, 58, 0.12) 0%, rgba(255, 69, 58, 0.06) 100%) !important;
    }
    
    .diff-added {
      color: #6ed46f;
    }
    
    .diff-removed {
      color: #ff9f92;
      text-decoration-color: rgba(255, 69, 58, 0.7);
    }
    
    .diff-accept-btn,
    .diff-reject-btn {
      background: rgba(28, 28, 30, 0.8) !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
    }
    
    .action-text {
      color: #f5f5f7 !important;
    }
    
    .key {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
      color: #f5f5f7 !important;
    }
    
    .diff-accept-btn:hover {
      background: rgba(48, 209, 88, 0.15) !important;
      border-color: rgba(48, 209, 88, 0.3) !important;
    }
    
    .diff-reject-btn:hover {
      background: rgba(255, 69, 58, 0.15) !important;
      border-color: rgba(255, 69, 58, 0.3) !important;
    }
  }
  
  /* Editor container adjustments */
  .lexical-content-editable {
    padding-right: 24px !important;
  }
  
  /* Remove any old styles */
  .diff-margin-indicator,
  .diff-group-actions,
  .diff-micro-controls,
  .diff-micro-accept,
  .diff-micro-reject,
  .diff-selected,
  .diff-right-indicator,
  .diff-group-highlight {
    display: none !important;
  }
`

// Enhanced theme with proper list configuration per Lexical docs
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    ul: 'editor-list-ul',
    ol: 'editor-list-ol',
    listitem: 'editor-listitem',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
    nested: {
      listitem: 'editor-nested-listitem',
    },
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-token-attr',
    attr: 'editor-token-attr',
    boolean: 'editor-token-property',
    builtin: 'editor-token-selector',
    cdata: 'editor-token-comment',
    char: 'editor-token-selector',
    class: 'editor-token-function',
    'class-name': 'editor-token-function',
    comment: 'editor-token-comment',
    constant: 'editor-token-property',
    deleted: 'editor-token-property',
    doctype: 'editor-token-comment',
    entity: 'editor-token-operator',
    function: 'editor-token-function',
    important: 'editor-token-variable',
    inserted: 'editor-token-selector',
    keyword: 'editor-token-attr',
    namespace: 'editor-token-variable',
    number: 'editor-token-property',
    operator: 'editor-token-operator',
    prolog: 'editor-token-comment',
    property: 'editor-token-property',
    punctuation: 'editor-token-punctuation',
    regex: 'editor-token-variable',
    selector: 'editor-token-selector',
    string: 'editor-token-selector',
    symbol: 'editor-token-property',
    tag: 'editor-token-property',
    url: 'editor-token-operator',
    variable: 'editor-token-variable',
  },
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
}

function MarkdownPlugin() {
  return <MarkdownShortcutPlugin transformers={COMPLETE_TRANSFORMERS} />
}

// List Commands Plugin to register the required command handlers
function ListCommandsPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const unregisterUnorderedList = editor.registerCommand(
      INSERT_UNORDERED_LIST_COMMAND,
      () => {
        editor.update(() => {
          $insertList('bullet')
        })
        return true
      },
      COMMAND_PRIORITY_LOW,
    )

    const unregisterOrderedList = editor.registerCommand(
      INSERT_ORDERED_LIST_COMMAND,
      () => {
        editor.update(() => {
          $insertList('number')
        })
        return true
      },
      COMMAND_PRIORITY_LOW,
    )

    const unregisterCheckList = editor.registerCommand(
      INSERT_CHECK_LIST_COMMAND,
      () => {
        editor.update(() => {
          $insertList('check')
        })
        return true
      },
      COMMAND_PRIORITY_LOW,
    )

    const unregisterRemoveList = editor.registerCommand(
      REMOVE_LIST_COMMAND,
      () => {
        // This will be handled by the ListPlugin automatically
        return false
      },
      COMMAND_PRIORITY_LOW,
    )

    return () => {
      unregisterUnorderedList()
      unregisterOrderedList()
      unregisterCheckList()
      unregisterRemoveList()
    }
  }, [editor])

  return null
}

// Code Highlighting Plugin
function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return registerCodeHighlighting(editor)
  }, [editor])

  return null
}

// Sync the editable prop to the editor instance when it changes
function EditablePlugin({ editable }: { editable: boolean }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.setEditable(editable)
  }, [editor, editable])

  return null
}

// Style injection component
function DiffStylesPlugin() {
  useEffect(() => {
    // Check if styles are already injected
    if (document.getElementById('lexical-diff-styles')) {
      return
    }

    const style = document.createElement('style')
    style.id = 'lexical-diff-styles'
    style.textContent = diffStyles
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('lexical-diff-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  return null
}

export function LexicalEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  plugins,
  editorKey,
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: editorKey ? `LazarusEditor-${editorKey}` : 'LazarusEditor',
    theme,
    editable,
    editorState: content
      ? () => $convertFromMarkdownString(content, COMPLETE_TRANSFORMERS)
      : null,
    onError: (error: Error) => {
      console.error('Lexical error:', error)
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      HorizontalRuleNode,
      DiffTextNode,
    ],
  }

  return (
    <div className='lexical-editor-container relative h-full w-full bg-card dark:bg-background'>
      <LexicalComposer initialConfig={initialConfig}>
        <div className='relative h-full w-full'>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className='lexical-content-editable h-full w-full resize-none overflow-x-auto overflow-y-auto text-[14px] leading-relaxed text-gray-900 outline-none transition-colors duration-200 dark:text-gray-100' />
            }
            placeholder={
              <div className='editor-placeholder pointer-events-none absolute left-8 top-6 text-[14px] leading-relaxed text-gray-400 transition-all duration-200 dark:text-gray-600'>
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          {onChange && (
            <OnChangePlugin
              onChange={(editorState: EditorState) => {
                editorState.read(() => {
                  const markdown = $convertToMarkdownString(
                    COMPLETE_TRANSFORMERS,
                  )
                  onChange(markdown)
                })
              }}
            />
          )}
          <HistoryPlugin />
          <ClickableLinkPlugin newTab />
          {editable && <AutoFocusPlugin />}
          <ListPlugin />
          <CheckListPlugin />
          <ListCommandsPlugin />
          <CodeHighlightPlugin />
          <MarkdownPlugin />
          <TablePlugin />
          <TableHoverActionsPlugin />
          <EditablePlugin editable={editable} />
          <DiffStylesPlugin />
          {/* Render additional plugins */}
          {plugins?.map((plugin: React.ReactNode, index: number) => (
            <React.Fragment key={index}>{plugin}</React.Fragment>
          ))}
        </div>
      </LexicalComposer>
    </div>
  )
}
