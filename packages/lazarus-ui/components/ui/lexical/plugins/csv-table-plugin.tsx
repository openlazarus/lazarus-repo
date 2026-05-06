'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
} from 'lexical'
import { useEffect, useRef, useState } from 'react'

interface CSVTablePluginProps {
  csvContent?: string
  onContentChange?: (csvContent: string) => void
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function CSVTablePlugin({
  csvContent,
  onContentChange,
}: CSVTablePluginProps) {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = useState(false)
  const skipNextUpdate = useRef(false)
  const lastContentHash = useRef<string>('')

  // Helper to create a simple hash of content for comparison
  const getContentHash = (content: string) => {
    return content.length + '_' + content.slice(0, 50)
  }

  // Initialize table from CSV content - only once
  useEffect(() => {
    if (isInitialized || !csvContent) return

    const contentHash = getContentHash(csvContent)
    if (contentHash === lastContentHash.current) return

    lastContentHash.current = contentHash
    skipNextUpdate.current = true

    editor.update(() => {
      const root = $getRoot()
      root.clear()

      const lines = csvContent.trim().split('\n')
      if (lines.length === 0) return

      // Parse CSV
      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1).map((line) => parseCSVLine(line))

      // Create table with proper width handling
      const tableNode = $createTableNode()

      // Add header row
      if (headers.length > 0) {
        const headerRow = $createTableRowNode()
        headers.forEach((header) => {
          const cellNode = $createTableCellNode(0) // HeaderCell
          cellNode.setWidth(Math.max(150, header.length * 10)) // Set min width based on content
          const paragraph = $createParagraphNode()
          paragraph.append($createTextNode(header))
          cellNode.append(paragraph)
          headerRow.append(cellNode)
        })
        tableNode.append(headerRow)
      }

      // Add data rows
      rows.forEach((row) => {
        const rowNode = $createTableRowNode()
        // Ensure each row has the same number of cells as headers
        const cellCount = Math.max(row.length, headers.length)
        for (let i = 0; i < cellCount; i++) {
          const cellNode = $createTableCellNode()
          const cellContent = row[i] || ''
          // Calculate width based on content or header width
          const headerWidth = headers[i]
            ? Math.max(150, headers[i].length * 10)
            : 150
          const contentWidth = Math.max(150, cellContent.length * 8)
          cellNode.setWidth(Math.max(headerWidth, contentWidth))

          const paragraph = $createParagraphNode()
          paragraph.append($createTextNode(cellContent))
          cellNode.append(paragraph)
          rowNode.append(cellNode)
        }
        tableNode.append(rowNode)
      })

      root.append(tableNode)

      // Set selection to null to prevent auto-scroll to bottom
      $setSelection(null)
    })

    setIsInitialized(true)

    // Scroll to top after table is rendered
    setTimeout(() => {
      // Find the editor root element and scroll it to top
      const editorRoot = editor.getRootElement()
      if (editorRoot) {
        editorRoot.scrollTop = 0

        // Also try to scroll the parent container
        const scrollContainer = editorRoot.closest('.lexical-content-editable')
        if (scrollContainer) {
          scrollContainer.scrollTop = 0
        }

        // Try the main editor container as well
        const editorContainer = editorRoot.closest('.lexical-editor-container')
        if (editorContainer) {
          editorContainer.scrollTop = 0
        }
      }

      // Clear the skip flag after scrolling
      skipNextUpdate.current = false
    }, 150)
  }, [csvContent, editor, isInitialized])

  // Listen for table changes and export to CSV
  useEffect(() => {
    if (!onContentChange) return

    const removeListener = editor.registerUpdateListener(
      ({ editorState, dirtyElements }) => {
        // Skip if we're initializing or if we just updated from CSV
        if (skipNextUpdate.current) {
          return
        }

        // Only process if there are actual changes to table elements
        let hasTableChanges = false
        dirtyElements.forEach((_, key) => {
          if (
            key.startsWith('__table') ||
            key.startsWith('__tableCell') ||
            key.startsWith('__tableRow')
          ) {
            hasTableChanges = true
          }
        })

        if (!hasTableChanges && dirtyElements.size > 0) {
          // Check if any dirty element is a table-related node
          editorState.read(() => {
            const root = $getRoot()
            const firstChild = root.getFirstChild()
            if ($isTableNode(firstChild)) {
              hasTableChanges = true
            }
          })
        }

        if (!hasTableChanges && isInitialized) return

        editorState.read(() => {
          const root = $getRoot()
          const children = root.getChildren()

          // Find the first table node
          const tableNode = children.find((child) => $isTableNode(child)) as
            | TableNode
            | undefined
          if (!tableNode) return

          const rows: string[][] = []
          tableNode.getChildren().forEach((row, rowIndex) => {
            if (row instanceof TableRowNode) {
              const cells: string[] = []
              row.getChildren().forEach((cell) => {
                if (cell instanceof TableCellNode) {
                  cells.push(cell.getTextContent())
                }
              })
              if (cells.length > 0) {
                rows.push(cells)
              }
            }
          })

          if (rows.length > 0) {
            const csvLines = rows.map((row) =>
              row.map(escapeCSVField).join(','),
            )
            const newContent = csvLines.join('\n')

            const newHash = getContentHash(newContent)
            if (newHash !== lastContentHash.current) {
              lastContentHash.current = newHash
              onContentChange(newContent)
            }
          }
        })
      },
    )

    return removeListener
  }, [editor, onContentChange, isInitialized])

  return null
}
