'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

interface AutoScrollPluginProps {
  scrollToTop?: boolean
}

export function AutoScrollPlugin({
  scrollToTop = false,
}: AutoScrollPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!scrollToTop) return

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      const editorElement = editor.getRootElement()
      if (!editorElement) return

      // Find all possible scrollable containers
      const scrollableContainers = [
        editorElement,
        editorElement.parentElement,
        editorElement.closest('.overflow-auto'),
        editorElement.closest('.overflow-y-auto'),
        editorElement.closest('.lexical-editor-container'),
        document.querySelector('.lexical-content-editable'),
      ].filter(Boolean) as HTMLElement[]

      // Scroll all containers to top
      scrollableContainers.forEach((container) => {
        if (container) {
          container.scrollTop = 0

          // Also try scrollIntoView for the first element
          const firstChild = container.firstElementChild
          if (firstChild) {
            firstChild.scrollIntoView({ block: 'start', behavior: 'instant' })
          }
        }
      })

      // Focus without scrolling
      editor.focus(
        () => {
          // Prevent default scroll behavior
          return false
        },
        { preventScroll: true },
      )
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [editor, scrollToTop])

  return null
}
