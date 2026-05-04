import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

import { TagSuggestionsPluginProps } from './types'

/**
 * Plugin to handle tag suggestions in the editor
 */
export function TagSuggestionsPlugin({
  suggestions,
  showSuggestions,
  cursorPosition,
  onTagSelection,
}: TagSuggestionsPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // This plugin doesn't directly manipulate the editor,
    // but could be extended to track @ mentions or other triggers

    return () => {
      // Clean up if needed
    }
  }, [editor])

  if (!showSuggestions || !cursorPosition || suggestions.length === 0) {
    return null
  }

  return (
    <div
      className='tag-suggestions'
      style={{
        position: 'absolute',
        top: cursorPosition.top + 24, // Position below cursor
        left: cursorPosition.left,
        zIndex: 100,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '8px 0',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
      {suggestions.map((item, index) => (
        <div
          key={index}
          className='tag-suggestion-item hover:bg-black/[0.05]'
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
          }}
          onClick={() => onTagSelection(item)}>
          {item.name}
        </div>
      ))}
    </div>
  )
}
