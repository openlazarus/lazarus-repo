'use client'

import { $createCodeNode, CodeNode } from '@lexical/code'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createTextNode, $getRoot } from 'lexical'
import { useEffect, useRef, useState } from 'react'

interface EnhancedCodePluginProps {
  content?: string
  language?: string
  onChange?: (content: string) => void
}

const languageMap: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  mjs: 'javascript',
  cjs: 'javascript',

  // Python
  py: 'python',
  pyw: 'python',

  // Java/Scala/Kotlin
  java: 'java',
  scala: 'scala',
  sc: 'scala',
  kt: 'kotlin',
  kts: 'kotlin',

  // C/C++/C#
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'css',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',

  // Data/Config
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',

  // Other languages
  php: 'php',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  dart: 'dart',
  r: 'r',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  md: 'markdown',
  mdx: 'markdown',

  // Objective-C
  m: 'objectivec',
  mm: 'objectivec',
}

export function EnhancedCodePlugin({
  content,
  language = 'text',
  onChange,
}: EnhancedCodePluginProps) {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = useState(false)
  const lastContentRef = useRef<string>('')
  const skipNextUpdate = useRef(false)

  // Import code content into Lexical - only on initial mount
  useEffect(() => {
    if (isInitialized || content === undefined) return

    // Check if content has actually changed
    if (content === lastContentRef.current) return

    lastContentRef.current = content
    skipNextUpdate.current = true

    editor.update(() => {
      const root = $getRoot()
      root.clear()

      // Create a code block with the entire content
      const codeNode = $createCodeNode(language)
      codeNode.append($createTextNode(content))
      root.append(codeNode)
    })

    setIsInitialized(true)

    // Clear skip flag after update
    setTimeout(() => {
      skipNextUpdate.current = false
    }, 100)
  }, [content, language, editor, isInitialized])

  // Export Lexical content back to plain text
  useEffect(() => {
    if (!onChange) return

    const removeListener = editor.registerUpdateListener(
      ({ editorState, dirtyElements }) => {
        // Skip if we just initialized
        if (skipNextUpdate.current) return

        // Only process if there are actual changes
        if (dirtyElements.size === 0 && isInitialized) return

        editorState.read(() => {
          const root = $getRoot()
          const children = root.getChildren()

          // Get text from all code nodes
          let codeContent = ''
          children.forEach((child) => {
            if (child instanceof CodeNode) {
              codeContent += child.getTextContent()
            }
          })

          // Only call onChange if content actually changed
          if (codeContent !== lastContentRef.current) {
            lastContentRef.current = codeContent
            onChange(codeContent)
          }
        })
      },
    )

    return removeListener
  }, [editor, onChange, isInitialized])

  return null
}

// Helper function to detect language from file extension
export function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return languageMap[ext] || 'text'
}
