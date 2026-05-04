import { useCallback, useEffect, useRef, useState } from 'react'

import { LocalStorageAdapter } from '@/model/local-storage'

interface UseLocalStorageOptions {
  debounceTime?: number
  savingIndicatorTime?: number
  prefix?: string
}

/**
 * A hook for accessing and storing data in localStorage with saving indicator
 * using the LocalStorageAdapter for consistency with the rest of the application
 * @param key The key to store the data under in localStorage
 * @param initialValue The initial value if no value is found in localStorage
 * @param options Configuration options for the hook
 * @returns [value, setValue, isSaving, error]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {},
): [T, (newValue: T | ((prevValue: T) => T)) => void, boolean, Error | null] {
  // Default options
  const {
    debounceTime = 500,
    savingIndicatorTime = 1000,
    prefix = 'lazarus:',
  } = options

  // Create the storage adapter
  const storageAdapterRef = useRef<LocalStorageAdapter>(
    new LocalStorageAdapter(prefix),
  )

  // Initialize state with stored value or initial value
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue

    try {
      // Use the adapter to get the value
      // Since getItem is async, we need to handle this specially during initialization
      let storedValue: T | null = null

      // For initialization, we'll use localStorage directly to avoid async issues
      const item = localStorage.getItem(prefix + key)
      storedValue = item ? JSON.parse(item) : null

      return storedValue !== null ? storedValue : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Track if the component is mounted to avoid memory leaks
  const isMounted = useRef(true)
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Track saving state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Use a ref for the debounce timer to avoid recreating functions
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Save to localStorage with debounce using the adapter
  const debouncedSave = useCallback(
    async (newValue: T) => {
      // Clear any existing timer
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
      }

      // Set a new timer
      saveTimer.current = setTimeout(async () => {
        try {
          // Only save if component is still mounted
          if (isMounted.current) {
            // Show saving indicator
            setIsSaving(true)

            // Save to localStorage using adapter
            await storageAdapterRef.current.setItem(key, newValue)

            // Hide saving indicator after delay
            setTimeout(() => {
              if (isMounted.current) {
                setIsSaving(false)
              }
            }, savingIndicatorTime)

            // Clear any previous errors
            setError(null)
          }
        } catch (error) {
          console.error(`Error saving to localStorage key "${key}":`, error)
          if (error instanceof Error && isMounted.current) {
            setError(error)
          }
        }
      }, debounceTime)
    },
    [key, debounceTime, savingIndicatorTime],
  )

  // Update local state and save to localStorage
  const updateValue = useCallback(
    (newValue: T | ((prevValue: T) => T)) => {
      setValue((prev) => {
        const nextValue =
          typeof newValue === 'function'
            ? (newValue as (prevValue: T) => T)(prev)
            : newValue

        // Don't save if the value hasn't changed
        if (JSON.stringify(prev) !== JSON.stringify(nextValue)) {
          debouncedSave(nextValue)
        }

        return nextValue
      })
    },
    [debouncedSave],
  )

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
      }
    }
  }, [])

  return [value, updateValue, isSaving, error]
}
