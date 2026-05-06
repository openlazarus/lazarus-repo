import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'lazarus-theme-preference'

/**
 * UI State context value type
 */
export interface UIStateContextValue {
  // Active conversation ID
  activeConversationId: string | null
  setActiveConversationId: (id: string | null) => void

  // Active message ID
  activeMessageId: string | null
  setActiveMessageId: (id: string | null) => void

  // Desktop studio states
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  isNavOpen: boolean
  setIsNavOpen: (open: boolean) => void

  // Focus mode state
  isFocusMode: boolean
  setIsFocusMode: (focusMode: boolean) => void

  // Theme state
  isDark: boolean
  setIsDark: (dark: boolean) => void
  toggleTheme: () => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

// Create context with a default value
const UIStateContext = createContext<UIStateContextValue | null>(null)

/**
 * Hook to use the UI state context
 */
export function useUIState(): UIStateContextValue {
  const context = useContext(UIStateContext)

  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider')
  }

  return context
}

/**
 * UI State provider props
 */
interface UIStateProviderProps {
  children: ReactNode
}

/**
 * UI State provider component
 */
export function UIStateProvider({
  children,
}: UIStateProviderProps): React.JSX.Element {
  // Conversation and message state
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)

  // Studio states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(true)
  const [isFocusMode, setIsFocusMode] = useState(false)

  // Theme state
  const [isDark, setIsDarkState] = useState(false)
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')

  // Apply dark class to document
  const applyDarkMode = (dark: boolean) => {
    setIsDarkState(dark)
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Initialize theme on mount from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as ThemeMode | null
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeModeState(savedTheme)
      if (savedTheme === 'system') {
        applyDarkMode(mediaQuery.matches)
      } else {
        applyDarkMode(savedTheme === 'dark')
      }
    } else {
      // Default to system preference
      applyDarkMode(mediaQuery.matches)
    }

    const handleChange = (e: MediaQueryListEvent) => {
      // Only respond to system changes if in system mode
      const currentMode = localStorage.getItem(
        THEME_STORAGE_KEY,
      ) as ThemeMode | null
      if (!currentMode || currentMode === 'system') {
        applyDarkMode(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Theme mode setter with localStorage persistence
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem(THEME_STORAGE_KEY, mode)

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyDarkMode(mediaQuery.matches)
    } else {
      applyDarkMode(mode === 'dark')
    }
  }

  // Theme setter that updates DOM (for backwards compatibility)
  const setIsDark = (newDarkState: boolean) => {
    const newMode = newDarkState ? 'dark' : 'light'
    setThemeMode(newMode)
  }

  // Theme toggle function (for backwards compatibility)
  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  // Create context value - only keep essential global state
  const value: UIStateContextValue = useMemo(
    () => ({
      activeConversationId,
      setActiveConversationId,
      activeMessageId,
      setActiveMessageId,
      isFullscreen,
      setIsFullscreen,
      isNavOpen,
      setIsNavOpen,
      isFocusMode,
      setIsFocusMode,
      isDark,
      setIsDark,
      toggleTheme,
      themeMode,
      setThemeMode,
    }),
    [
      activeConversationId,
      activeMessageId,
      isFullscreen,
      isNavOpen,
      isFocusMode,
      isDark,
      themeMode,
    ],
  )

  return (
    <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>
  )
}

export default UIStateContext
