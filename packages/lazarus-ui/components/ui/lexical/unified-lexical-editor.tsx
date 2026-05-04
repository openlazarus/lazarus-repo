'use client'

import React, { useMemo } from 'react'

import { DocumentEditorWithDiff } from '@/components/features/document/document-editor-with-diff'

import { LexicalEditor } from './lexical-editor'
import { AutoScrollPlugin } from './plugins/auto-scroll-plugin'
import { CSVTablePlugin } from './plugins/csv-table-plugin'
import { CSVTableWrapperPlugin } from './plugins/csv-table-wrapper-plugin'
import { DiffPlugin } from './plugins/diff-plugin'
import { EditorModePlugin } from './plugins/editor-mode-plugin'
import {
  detectLanguageFromFilename,
  EnhancedCodePlugin,
} from './plugins/enhanced-code-plugin'
import { TableActionsPlugin } from './plugins/table-actions-plugin'
import './xcode-theme.css'

export type FileType =
  | 'document'
  | 'markdown'
  | 'code'
  | 'csv'
  | 'table'
  | 'json'
  | 'text'
  | 'unknown'

interface UnifiedLexicalEditorProps {
  content: string
  onChange?: (content: string) => void
  placeholder?: string
  fileType: FileType
  fileName?: string
  showDiff?: boolean
  originalContent?: string
  editedContent?: string
  isWorkflowDocument?: boolean
  editorKey?: string
}

/**
 * Unified Lexical Editor that adapts to different file types
 * This replaces multiple separate editors with a single Lexical-based solution
 */
export function UnifiedLexicalEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  fileType,
  fileName,
  showDiff = false,
  originalContent,
  editedContent,
  isWorkflowDocument = false,
  editorKey,
}: UnifiedLexicalEditorProps) {
  // Determine which plugins to use based on file type
  const plugins = useMemo(() => {
    const pluginList: React.ReactNode[] = []

    // Add editor mode plugin for styling
    let _editorMode: 'code' | 'csv' | 'document' | 'markdown' | 'default' =
      'default'

    switch (fileType) {
      case 'csv':
      case 'table':
        _editorMode = 'csv'
        // For CSV/table files, use the CSV table plugin
        // Don't pass content through normal Lexical flow
        pluginList.push(
          <EditorModePlugin key='editor-mode' mode='csv' />,
          <CSVTablePlugin
            key='csv-table'
            csvContent={content}
            onContentChange={onChange}
          />,
          <CSVTableWrapperPlugin key='csv-wrapper' />,
          <TableActionsPlugin key='table-actions' />,
          <AutoScrollPlugin key='auto-scroll' scrollToTop={true} />,
        )
        break

      case 'code':
      case 'json':
        _editorMode = 'code'
        // For code files, use the enhanced code plugin
        const language = fileName
          ? detectLanguageFromFilename(fileName)
          : 'text'
        pluginList.push(
          <EditorModePlugin key='editor-mode' mode='code' />,
          <EnhancedCodePlugin
            key='enhanced-code'
            content={content}
            language={fileType === 'json' ? 'json' : language}
            onChange={onChange}
          />,
        )
        break

      case 'document':
        _editorMode = 'document'
        pluginList.push(<EditorModePlugin key='editor-mode' mode='document' />)
        // Optionally add diff plugin if needed
        if (showDiff && originalContent && editedContent) {
          pluginList.push(
            <DiffPlugin
              key='diff'
              originalContent={originalContent}
              editedContent={editedContent}
              showDiff={true}
              onChangeAction={() => {}}
            />,
          )
        }
        break

      case 'markdown':
        _editorMode = 'markdown'
        pluginList.push(<EditorModePlugin key='editor-mode' mode='markdown' />)
        break

      case 'text':
      default:
        // For text files, use default styling
        if (showDiff && originalContent && editedContent) {
          pluginList.push(
            <DiffPlugin
              key='diff'
              originalContent={originalContent}
              editedContent={editedContent}
              showDiff={true}
              onChangeAction={() => {}}
            />,
          )
        }
        break
    }

    return pluginList
  }, [
    fileType,
    content,
    onChange,
    fileName,
    showDiff,
    originalContent,
    editedContent,
  ])

  // Determine if editor should be in read-only mode
  const isReadOnly = showDiff && originalContent && editedContent

  // Custom placeholder based on file type
  const customPlaceholder = useMemo(() => {
    switch (fileType) {
      case 'csv':
      case 'table':
        return 'Edit your table data...'
      case 'code':
        return `Start coding in ${fileName || 'your file'}...`
      case 'json':
        return 'Edit your JSON data...'
      case 'markdown':
        return 'Start writing in Markdown...'
      default:
        return placeholder
    }
  }, [fileType, fileName, placeholder])

  // Use DocumentEditorWithDiff for workflow documents with diff enabled
  if (isWorkflowDocument && showDiff) {
    return <DocumentEditorWithDiff content={content} onChange={onChange} />
  }

  // For CSV and code files, don't pass initial content to avoid conflicts with their plugins
  // EnhancedCodePlugin and CSVTablePlugin handle their own content initialization and onChange
  const isPluginManagedType =
    fileType === 'csv' ||
    fileType === 'table' ||
    fileType === 'code' ||
    fileType === 'json'
  const initialContent = isPluginManagedType ? undefined : content
  const handleChange = isPluginManagedType ? undefined : onChange

  return (
    <LexicalEditor
      content={initialContent}
      onChange={handleChange}
      placeholder={customPlaceholder}
      editable={!isReadOnly}
      plugins={plugins}
      editorKey={editorKey}
    />
  )
}

/**
 * Helper function to determine file type from filename
 */
export function getFileTypeFromName(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'csv':
    case 'tsv':
      return 'csv'

    case 'xls':
    case 'xlsx':
    case 'ods':
      return 'table'

    case 'md':
    case 'mdx':
    case 'markdown':
      return 'markdown'

    case 'json':
    case 'jsonc':
    case 'json5':
      return 'json'

    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'cs':
    case 'go':
    case 'rs':
    case 'rb':
    case 'php':
    case 'swift':
    case 'kt':
    case 'scala':
    case 'r':
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
    case 'ps1':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'xml':
    case 'html':
    case 'htm':
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
    case 'sql':
      return 'code'

    case 'txt':
    case 'text':
    case 'log':
      return 'text'

    case 'doc':
    case 'docx':
    case 'odt':
    case 'rtf':
      return 'document'

    default:
      return 'unknown'
  }
}
