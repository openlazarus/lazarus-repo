'use client'

import { ThemeMode, useUIState } from '@/state/ui-state'

export function useTheme() {
  const { isDark, setIsDark, toggleTheme, themeMode, setThemeMode } =
    useUIState()

  return { isDark, setIsDark, toggleTheme, themeMode, setThemeMode }
}

export type { ThemeMode }
