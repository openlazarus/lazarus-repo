import { LexicalEditor } from 'lexical'

export interface Item {
  id: string
  name: string
  type: string
}

export interface CursorPosition {
  top: number
  left: number
}

export interface MessageBarPluginProps {
  setEditorRef: (editor: LexicalEditor) => void
  autoFocus?: boolean
  variant?: 'mobile' | 'desktop'
  handleSubmit?: (text: string) => void
}

export interface TagSuggestionsPluginProps {
  suggestions: Item[]
  showSuggestions: boolean
  cursorPosition: CursorPosition | null
  onTagSelection: (item: Item) => void
}
