import { useState } from 'react'

import { createClient } from '@/utils/supabase/client'

import { useFieldVerification } from './use-field-verification'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface UseEmailVerificationOptions {
  profileId: string
  redirectTo?: string
}

export function useEmailVerification({
  profileId,
  redirectTo,
}: UseEmailVerificationOptions) {
  const field = useFieldVerification({
    profileId,
    pattern: EMAIL_REGEX,
    patternError: 'Please enter a valid email address',
    uniqueColumn: 'email',
    uniqueError: 'This email is already associated with another account',
  })

  const [sent, setSent] = useState(false)

  const sendVerification = async () => {
    const validated = await field.validate()
    if (!validated) return

    field.setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser(
        { email: validated },
        redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      )

      if (error) throw error

      setSent(true)
    } catch (err) {
      field.setError(
        err instanceof Error
          ? err.message
          : 'Failed to send confirmation email',
      )
    }
  }

  const reset = () => {
    field.reset()
    setSent(false)
  }

  return {
    input: field.input,
    setInput: field.setInput,
    sent,
    error: field.error,
    setError: field.setError,
    loading: field.loading,
    isValid: field.isValid,
    sendVerification,
    reset,
  }
}
