import { useState } from 'react'

import { createClient } from '@/utils/supabase/client'

import { useFieldVerification } from './use-field-verification'

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/

interface UsePhoneVerificationOptions {
  profileId: string
  onSuccess?: () => Promise<void> | void
}

export function usePhoneVerification({
  profileId,
  onSuccess,
}: UsePhoneVerificationOptions) {
  const field = useFieldVerification({
    profileId,
    pattern: PHONE_REGEX,
    patternError:
      'Enter a valid phone number in E.164 format (e.g. +1234567890)',
    uniqueColumn: 'phone_number',
    uniqueError: 'This phone number is already associated with another account',
  })

  const [step, setStep] = useState<'input' | 'otp'>('input')
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''))
  const [otpLoading, setOtpLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const sendCode = async () => {
    const validated = await field.validate()
    if (!validated) return

    field.setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ phone: validated })

      if (error) throw error

      setStep('otp')
    } catch (err) {
      field.setError(
        err instanceof Error ? err.message : 'Failed to send SMS code',
      )
    }
  }

  const verifyOtp = async (code: string) => {
    setOtpLoading(true)
    field.setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        phone: field.input.trim(),
        token: code,
        type: 'phone_change',
      })

      if (error) throw error

      setSuccess(true)
      if (onSuccess) await onSuccess()
    } catch (err) {
      field.setError(
        err instanceof Error ? err.message : 'Invalid verification code',
      )
    } finally {
      setOtpLoading(false)
    }
  }

  const handleOtpChange = (values: string[]) => {
    setOtpValues(values)
    if (values.every((v) => v !== '')) {
      verifyOtp(values.join(''))
    }
  }

  const goBackToInput = () => {
    setStep('input')
    setOtpValues(Array(6).fill(''))
    field.setError(null)
  }

  const reset = () => {
    field.reset()
    setStep('input')
    setOtpValues(Array(6).fill(''))
    setOtpLoading(false)
    setSuccess(false)
  }

  return {
    input: field.input,
    setInput: field.setInput,
    step,
    otpValues,
    error: field.error,
    setError: field.setError,
    loading: field.loading || otpLoading,
    success,
    isValid: field.isValid,
    sendCode,
    handleOtpChange,
    goBackToInput,
    reset,
  }
}
