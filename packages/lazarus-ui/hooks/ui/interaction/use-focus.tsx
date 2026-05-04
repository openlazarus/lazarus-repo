import React, { createContext, useCallback, useContext, useState } from 'react'

// Focus management context
interface FocusContextType {
  activeEditor: string | null
  setActiveEditor: (editorId: string | null) => void
  clearAllFocus: () => void
}

const FocusContext = createContext<FocusContextType>({
  activeEditor: null,
  setActiveEditor: () => {},
  clearAllFocus: () => {},
})

export const FocusProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeEditor, setActiveEditor] = useState<string | null>(null)

  // Function to clear focus from all editors
  const clearAllFocus = useCallback(() => {
    setActiveEditor(null)
  }, [])

  return (
    <FocusContext.Provider
      value={{ activeEditor, setActiveEditor, clearAllFocus }}>
      {children}
    </FocusContext.Provider>
  )
}

export const useFocus = () => useContext(FocusContext)

export default useFocus
