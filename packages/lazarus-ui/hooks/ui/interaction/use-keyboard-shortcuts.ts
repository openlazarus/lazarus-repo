// useKeyboardShortcuts.ts
import { useEffect } from 'react'

export const useKeyboardShortcuts = (
  isSearchBarFocused: boolean,
  startRecording: () => void,
  stopRecording: () => void,
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' && !isSearchBarFocused && !event.repeat) {
        event.preventDefault()
        startRecording()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' && !isSearchBarFocused) {
        event.preventDefault()
        stopRecording()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSearchBarFocused, startRecording, stopRecording])
}
