'use client'

import { AskButton } from './components/ask-button'
import { TagButton } from './components/tag-button'
import { TagDropdown } from './components/tag-dropdown'
import { TagDropdownEnhanced } from './components/tag-dropdown-enhanced'
import { VoiceButton } from './components/voice-button'
import { MessageBar } from './message-bar'
import { MessageBarProvider, useMessageBar } from './message-bar-provider'

// Re-export components
export {
  AskButton,
  MessageBar,
  TagButton,
  TagDropdown,
  TagDropdownEnhanced,
  VoiceButton,
}

// Export the component as default
export default MessageBar

// Provider export
export { MessageBarProvider, useMessageBar }

// Hooks exports
export { useAttachments } from './hooks/use-attachments'
export { useKeyboardBehavior } from './hooks/use-keyboard-behavior'
export { useTextInput } from './hooks/use-text-input'
