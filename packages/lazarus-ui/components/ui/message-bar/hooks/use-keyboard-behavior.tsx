'use client'

import { useCallback } from 'react'

type KeyboardBehaviorOptions = {
  variant: 'mobile' | 'desktop'
  inputText: string
  setInputText: (text: string) => void
  handleSubmit: () => void
}

export const useKeyboardBehavior = ({
  variant,
  inputText,
  setInputText,
  handleSubmit,
}: KeyboardBehaviorOptions) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (variant === 'mobile') {
          // On mobile, let the enter key event pass through to allow the MessageBarPlugin to handle it
          // This allows the plugin to insert a newline character properly
          return false
        } else {
          // On desktop, Enter sends and Shift+Enter adds a new line
          if (!e.shiftKey) {
            e.preventDefault()
            handleSubmit()

            // Return true to indicate the event was handled
            return true
          }
        }
      }

      // Return false to indicate the event wasn't handled
      return false
    },
    [variant, handleSubmit],
  )

  return {
    handleKeyDown,
  }
}
