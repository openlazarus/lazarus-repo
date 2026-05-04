'use client'

import { RiCheckLine, RiPencilLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import OtpInput from '@/components/ui/otp-input'
import { useAuth } from '@/hooks/auth/use-auth'
import { useEmailVerification } from '@/hooks/auth/use-email-verification'
import { usePhoneVerification } from '@/hooks/auth/use-phone-verification'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { UserProfile } from '@/model/user-profile'

interface ContactVerificationSectionProps {
  profile: UserProfile
}

export const ContactVerificationSection = ({
  profile,
}: ContactVerificationSectionProps) => {
  const { isDark } = useTheme()
  const { refetchProfile } = useAuth()

  const isPhonePlaceholderEmail =
    profile.email?.endsWith('@phone.lazarusconnect.com') ?? false
  const hasVerifiedEmail =
    profile.email_verified === true && !isPhonePlaceholderEmail
  const hasPhone = !!profile.phone_number

  const [emailEditing, setEmailEditing] = useState(!hasVerifiedEmail)
  const [phoneEditing, setPhoneEditing] = useState(!hasPhone)

  const email = useEmailVerification({
    profileId: profile.id,
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/confirm`,
  })

  const phone = usePhoneVerification({
    profileId: profile.id,
    onSuccess: () => refetchProfile(),
  })

  const startEmailEdit = () => {
    email.reset()
    setEmailEditing(true)
  }

  const startPhoneEdit = () => {
    phone.reset()
    setPhoneEditing(true)
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className='mt-12'>
      <h3
        className={cn(
          'mb-6 text-[13px] font-semibold uppercase tracking-wider',
          isDark ? 'text-foreground/60' : 'text-[#666666]',
        )}>
        Contact Information
      </h3>

      <div className='flex max-w-[600px] flex-col gap-6'>
        {/* Email Section */}
        <div>
          <label
            className={cn(
              'mb-2 block text-[11px] font-medium uppercase tracking-wider',
              isDark ? 'text-foreground/50' : 'text-[#999999]',
            )}>
            Email address
          </label>

          {emailEditing ? (
            <div
              className={cn(
                'rounded-lg border p-4',
                isDark
                  ? 'border-white/10 bg-white/[0.03]'
                  : 'border-black/5 bg-black/[0.02]',
              )}>
              <p
                className={cn(
                  'mb-3 text-[12px]',
                  isDark ? 'text-foreground/50' : 'text-[#999999]',
                )}>
                {hasVerifiedEmail
                  ? 'Enter a new email address. A confirmation link will be sent.'
                  : 'Add a verified email to receive notifications and recover your account.'}
              </p>

              {email.sent ? (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md p-3',
                    isDark
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-green-50 text-green-600',
                  )}>
                  <RiCheckLine className='h-4 w-4' />
                  <p className='text-[13px]'>
                    Confirmation email sent to {email.input}. Check your inbox
                    and click the link to verify.
                  </p>
                </div>
              ) : (
                <div className='flex gap-2'>
                  <Input
                    type='email'
                    placeholder='your@email.com'
                    value={email.input}
                    onChange={(e) => {
                      email.setInput(e.target.value)
                      email.setError(null)
                    }}
                    variant='surface'
                    isDark={isDark}
                    size='medium'
                    disabled={email.loading}
                  />
                  <Button
                    onClick={email.sendVerification}
                    variant='active'
                    size='small'
                    loading={email.loading}
                    disabled={!email.input.trim() || email.loading}>
                    Verify
                  </Button>
                  {hasVerifiedEmail && (
                    <Button
                      onClick={() => setEmailEditing(false)}
                      variant='secondary'
                      size='small'
                      disabled={email.loading}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}

              {email.error && (
                <p className='mt-2 text-[12px] text-red-500'>{email.error}</p>
              )}
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <Input
                type='email'
                value={profile.email}
                variant='surface'
                isDark={isDark}
                size='large'
                disabled
              />
              <Button
                onClick={startEmailEdit}
                variant='secondary'
                size='small'
                iconLeft={<RiPencilLine className='h-3.5 w-3.5' />}>
                Change
              </Button>
            </div>
          )}
        </div>

        {/* Phone Section */}
        <div>
          <label
            className={cn(
              'mb-2 block text-[11px] font-medium uppercase tracking-wider',
              isDark ? 'text-foreground/50' : 'text-[#999999]',
            )}>
            Phone number
          </label>

          {phoneEditing ? (
            <div
              className={cn(
                'rounded-lg border p-4',
                isDark
                  ? 'border-white/10 bg-white/[0.03]'
                  : 'border-black/5 bg-black/[0.02]',
              )}>
              <p
                className={cn(
                  'mb-3 text-[12px]',
                  isDark ? 'text-foreground/50' : 'text-[#999999]',
                )}>
                {hasPhone
                  ? 'Enter a new phone number. A verification code will be sent via SMS.'
                  : 'Add a phone number to enable SMS sign-in and two-factor authentication.'}
              </p>

              {phone.success ? (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md p-3',
                    isDark
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-green-50 text-green-600',
                  )}>
                  <RiCheckLine className='h-4 w-4' />
                  <p className='text-[13px]'>
                    Phone number verified successfully.
                  </p>
                </div>
              ) : phone.step === 'otp' ? (
                <div className='space-y-3'>
                  <p
                    className={cn(
                      'text-[13px]',
                      isDark ? 'text-foreground/70' : 'text-[#444444]',
                    )}>
                    Enter the code sent to {phone.input}
                  </p>
                  <OtpInput
                    value={phone.otpValues}
                    onChange={phone.handleOtpChange}
                    error={phone.error}
                    isLoading={phone.loading}
                    isDark={isDark}
                  />
                  <button
                    type='button'
                    onClick={phone.goBackToInput}
                    className={cn(
                      'text-[12px]',
                      isDark
                        ? 'text-foreground/50 hover:text-foreground/70'
                        : 'text-black/50 hover:text-black/70',
                    )}>
                    Change number
                  </button>
                </div>
              ) : (
                <div>
                  <div className='flex gap-2'>
                    <Input
                      type='tel'
                      placeholder='+1234567890'
                      value={phone.input}
                      onChange={(e) => {
                        phone.setInput(e.target.value)
                        phone.setError(null)
                      }}
                      variant='surface'
                      isDark={isDark}
                      size='medium'
                      disabled={phone.loading}
                    />
                    <Button
                      onClick={phone.sendCode}
                      variant='active'
                      size='small'
                      loading={phone.loading}
                      disabled={!phone.input.trim() || phone.loading}>
                      Send code
                    </Button>
                    {hasPhone && (
                      <Button
                        onClick={() => setPhoneEditing(false)}
                        variant='secondary'
                        size='small'
                        disabled={phone.loading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-2 text-[11px]',
                      isDark ? 'text-foreground/40' : 'text-[#999999]',
                    )}>
                    E.164 format (e.g. +1234567890)
                  </p>
                </div>
              )}

              {phone.error && phone.step === 'input' && (
                <p className='mt-2 text-[12px] text-red-500'>{phone.error}</p>
              )}
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <Input
                type='tel'
                value={profile.phone_number || ''}
                variant='surface'
                isDark={isDark}
                size='large'
                disabled
              />
              <Button
                onClick={startPhoneEdit}
                variant='secondary'
                size='small'
                iconLeft={<RiPencilLine className='h-3.5 w-3.5' />}>
                Change
              </Button>
            </div>
          )}
        </div>
      </div>
    </m.div>
  )
}
