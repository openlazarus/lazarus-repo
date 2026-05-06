import { useCallback, useState } from 'react'

import { createClient } from '@/utils/supabase/client'

interface UseFieldVerificationOptions {
  /** Profile ID of the current user (excluded from uniqueness check) */
  profileId: string
  /** Regex to validate the input format */
  pattern: RegExp
  /** Error message when pattern doesn't match */
  patternError: string
  /** Column name in profiles table to check uniqueness against */
  uniqueColumn: string
  /** Error message when value is already taken */
  uniqueError: string
}

export function useFieldVerification({
  profileId,
  pattern,
  patternError,
  uniqueColumn,
  uniqueError,
}: UseFieldVerificationOptions) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isValid = pattern.test(input.trim())

  const validate = useCallback(async (): Promise<string | null> => {
    const trimmed = input.trim()

    if (!pattern.test(trimmed)) {
      setError(patternError)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq(uniqueColumn, trimmed)
        .neq('id', profileId)
        .limit(1)

      if (data && data.length > 0) {
        setError(uniqueError)
        return null
      }

      return trimmed
    } catch {
      setError('Validation failed. Please try again.')
      return null
    } finally {
      setLoading(false)
    }
  }, [input, profileId, pattern, patternError, uniqueColumn, uniqueError])

  const reset = useCallback(() => {
    setInput('')
    setError(null)
    setLoading(false)
  }, [])

  return {
    input,
    setInput,
    error,
    setError,
    loading,
    isValid,
    validate,
    reset,
  }
}
