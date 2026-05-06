import { debounce } from 'lodash'
import { useCallback, useEffect, useState } from 'react'

/**
 * Hook to debounce a value with a delay
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  // Create a debounced function using lodash
  const debouncedSetValue = useCallback(
    debounce((newValue: T) => {
      setDebouncedValue(newValue)
    }, delay),
    [delay],
  )

  useEffect(() => {
    debouncedSetValue(value)

    // Cleanup function to cancel any pending debounced calls
    return () => {
      debouncedSetValue.cancel()
    }
  }, [value, debouncedSetValue])

  return debouncedValue
}
