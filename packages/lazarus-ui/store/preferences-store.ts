import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { UserPreferences, createUserPreferences } from '@/model/user-profile'

interface PreferencesStore {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      preferences: createUserPreferences(),

      updatePreferences: (updates) => {
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        }))
      },
    }),
    {
      name: 'lazarus:preferences',
    },
  ),
)
