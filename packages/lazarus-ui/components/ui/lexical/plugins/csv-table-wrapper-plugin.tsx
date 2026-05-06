'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isTableNode } from '@lexical/table'
import { $getRoot } from 'lexical'
import { useEffect } from 'react'

import './csv-table-styles.css'

export function CSVTableWrapperPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Add CSV table wrapper class and styles
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    // Add wrapper class to the content editable
    const contentEditable = rootElement.closest('.lexical-content-editable')
    if (contentEditable) {
      contentEditable.classList.add('csv-table-wrapper')
    }

    // Monitor for table nodes and add data attributes for styling
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const children = root.getChildren()

        // Check if we have a table
        const hasTable = children.some((child) => $isTableNode(child))

        if (hasTable && contentEditable) {
          // Add wrapper class
          contentEditable.classList.add('csv-table-wrapper')

          // Check if content overflows horizontally
          requestAnimationFrame(() => {
            if (contentEditable.scrollWidth > contentEditable.clientWidth) {
              contentEditable.classList.add('can-scroll-right')
            } else {
              contentEditable.classList.remove('can-scroll-right')
            }
          })
        }
      })
    })

    // Handle horizontal scroll detection
    const handleScroll = () => {
      if (!contentEditable) return

      const isAtEnd =
        contentEditable.scrollLeft + contentEditable.clientWidth >=
        contentEditable.scrollWidth - 1

      if (isAtEnd) {
        contentEditable.classList.remove('can-scroll-right')
      } else if (contentEditable.scrollWidth > contentEditable.clientWidth) {
        contentEditable.classList.add('can-scroll-right')
      }
    }

    contentEditable?.addEventListener('scroll', handleScroll)

    return () => {
      unregister()
      contentEditable?.removeEventListener('scroll', handleScroll)
      contentEditable?.classList.remove('csv-table-wrapper', 'can-scroll-right')
    }
  }, [editor])

  return null
}
