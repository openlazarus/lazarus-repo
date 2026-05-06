'use client'

import {
  RiArrowLeftLine,
  RiArrowRightCircleLine,
  RiMailSendLine,
  RiPhoneLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import LoadingSpinner from '@/components/features/loading-screen'
import { Button } from '@/components/ui'
import { InputWithButton } from '@/components/ui/input'
import { OptionList } from '@/components/ui/option-list'
import OtpInput from '@/components/ui/otp-input'
import { useAuth } from '@/hooks/auth/use-auth'
import { useTheme } from '@/hooks/ui/use-theme'
import { authProviderOptions, type AuthProvider } from '@/lib/auth/providers'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type AuthMethod = 'initial' | 'email' | 'phone'
type EmailStep = 'input' | 'otp'
type PhoneStep = 'input' | 'otp'

const ROUTES = {
  AFTER_AUTH: '/',
  TERMS: '/terms',
  PRIVACY: '/privacy',
} as const

const CONFIG = {
  OTP_LENGTH: 6,
  OTP_AUTO_SUBMIT_DELAY: 500,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+[1-9]\d{6,14}$/,
  MAX_VERIFY_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 30_000,
} as const

const COPY = {
  BRAND: 'Lazarus',
  INITIAL_TITLE: 'Choose your preferred way to sign in',
  EMAIL_INPUT_TITLE: 'Enter your email',
  EMAIL_INPUT_SUBTITLE:
    "We'll send you a secure verification code to access your account",
  EMAIL_OTP_TITLE: 'Check your inbox',
  EMAIL_OTP_SUBTITLE: (email: string) =>
    `We've sent your verification code to ${email}`,
  EMAIL_PLACEHOLDER: 'name@example.com',
  PHONE_INPUT_TITLE: 'Enter your phone number',
  PHONE_INPUT_SUBTITLE: "We'll send you a verification code via SMS",
  PHONE_OTP_TITLE: 'Check your phone',
  PHONE_OTP_SUBTITLE: (phone: string) =>
    `We've sent a verification code to ${phone}`,
  PHONE_PLACEHOLDER: '+1234567890',
  CHANGE_PHONE: 'Change number',
  SECURITY_MESSAGE: 'Secure, passwordless authentication',
  SUPPORT_EMAIL: 'support@openlazarus.ai',
  BACK: 'Back',
  CONTINUE: 'Continue',
  SENDING: 'Sending...',
  VERIFY: 'Verify',
  VERIFYING: 'Verifying...',
  CHANGE_EMAIL: 'Change email',
  RESEND_CODE: 'Resend code',
  NEED_HELP: 'Need help?',
  CONTACT_SUPPORT: 'Contact',
  TERMS_PREFIX: 'By continuing, you agree to our',
  TERMS_LINK: 'Terms of Service',
  PRIVACY_LINK: 'Privacy Policy',
} as const

const ANIMATION_VARIANTS = {
  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  },
  staggerContainer: {
    initial: 'hidden' as const,
    animate: 'visible' as const,
    variants: {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.05,
          delayChildren: 0.1,
        },
      },
    },
  },
  item: {
    variants: {
      hidden: { opacity: 0, x: -20, filter: 'blur(4px)' },
      visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    },
  },
} as const

const THEME_CLASSES = {
  page: (isDark: boolean) => (isDark ? 'bg-[#111112]' : 'bg-[#f5f5f5]'),
  container: (isDark: boolean) => (isDark ? 'bg-[#000000]' : 'bg-[#ffffff]'),
  border: (isDark: boolean) => (isDark ? 'border-white/10' : 'border-black/5'),
  text: {
    primary: (isDark: boolean) =>
      isDark ? 'text-foreground' : 'text-[#1a1a1a]',
    secondary: (isDark: boolean) =>
      isDark ? 'text-foreground/60' : 'text-[#666666]',
    tertiary: (isDark: boolean) =>
      isDark ? 'text-foreground/50' : 'text-[#999999]',
    muted: (isDark: boolean) =>
      isDark ? 'text-foreground/40' : 'text-[#999999]',
  },
  link: 'text-[#0098fc] transition-opacity hover:opacity-80',
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const isValidEmail = (email: string): boolean => {
  return CONFIG.EMAIL_REGEX.test(email.trim())
}

const isValidPhone = (phone: string): boolean => {
  return CONFIG.PHONE_REGEX.test(phone.trim())
}

const createOtpArray = (length: number = CONFIG.OTP_LENGTH): string[] => {
  return Array(length).fill('')
}

const isOtpComplete = (values: string[]): boolean => {
  return values.every((v) => v !== '')
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AuthHeaderProps {
  isDark: boolean
}

const AuthHeader = ({ isDark }: AuthHeaderProps) => (
  <div
    className={cn(
      'border-b px-6 py-4 sm:px-8 sm:py-5',
      THEME_CLASSES.border(isDark),
    )}>
    <m.div
      className={cn(
        'text-[16px] font-semibold tracking-[-0.02em] sm:text-[18px]',
        THEME_CLASSES.text.primary(isDark),
      )}
      initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
      {COPY.BRAND}
    </m.div>
  </div>
)

interface BackButtonProps {
  onClick: () => void
}

const BackButton = ({ onClick }: BackButtonProps) => (
  <m.div
    className='mb-8'
    initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}>
    <Button
      onClick={onClick}
      variant='secondary'
      size='small'
      shape='pill'
      iconLeft={<RiArrowLeftLine className='h-[14px] w-[14px]' />}
      title='Go back to previous step'>
      {COPY.BACK}
    </Button>
  </m.div>
)

interface SectionHeaderProps {
  title: string
  subtitle: string
  isDark: boolean
}

const SectionHeader = ({ title, subtitle, isDark }: SectionHeaderProps) => (
  <>
    <m.h1
      className={cn(
        'mb-2 text-[18px] font-medium tracking-[-0.01em] sm:text-[19px]',
        THEME_CLASSES.text.primary(isDark),
      )}
      initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}>
      {title}
    </m.h1>
    <m.p
      className={cn(
        'mb-8 text-[14px] font-light leading-relaxed sm:text-[15px]',
        THEME_CLASSES.text.secondary(isDark),
      )}
      initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}>
      {subtitle}
    </m.p>
  </>
)

interface AuthFooterProps {
  isDark: boolean
}

const AuthFooter = ({ isDark }: AuthFooterProps) => (
  <m.div
    className={cn('border-t pt-6', THEME_CLASSES.border(isDark))}
    initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}>
    <p
      className={cn(
        'text-center text-[13px]',
        THEME_CLASSES.text.tertiary(isDark),
      )}>
      {COPY.TERMS_PREFIX}{' '}
      <Link href={ROUTES.TERMS} className={THEME_CLASSES.link}>
        {COPY.TERMS_LINK}
      </Link>{' '}
      and{' '}
      <Link href={ROUTES.PRIVACY} className={THEME_CLASSES.link}>
        {COPY.PRIVACY_LINK}
      </Link>
    </p>
    <p
      className={cn(
        'mt-4 text-center text-[13px]',
        THEME_CLASSES.text.tertiary(isDark),
      )}>
      {COPY.NEED_HELP} {COPY.CONTACT_SUPPORT}{' '}
      <a href={`mailto:${COPY.SUPPORT_EMAIL}`} className={THEME_CLASSES.link}>
        {COPY.SUPPORT_EMAIL}
      </a>
    </p>
  </m.div>
)

interface EmailInputFormProps {
  email: string
  isLoading: boolean
  error: string | null
  isDark: boolean
  onEmailChange: (value: string) => void
  onSubmit: (e?: FormEvent) => void
}

const EmailInputForm = ({
  email,
  isLoading,
  error,
  isDark,
  onEmailChange,
  onSubmit,
}: EmailInputFormProps) => (
  <m.form onSubmit={onSubmit} className='h-full'>
    <div className='flex h-full flex-col'>
      <m.div
        initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}>
        <InputWithButton
          type='email'
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={COPY.EMAIL_PLACEHOLDER}
          autoFocus
          autoComplete='email'
          disabled={isLoading}
          isDark={isDark}
          variant='surface'
          size='medium'
          shape='capsule'
          iconLeft={<RiMailSendLine className='h-[18px] w-[18px]' />}
          buttonText={isLoading ? COPY.SENDING : COPY.CONTINUE}
          onButtonClick={() => onSubmit()}
          buttonDisabled={!isValidEmail(email) || isLoading}
          buttonLoading={isLoading}
          buttonIcon={<RiArrowRightCircleLine className='h-[15px] w-[15px]' />}
          error={error || undefined}
          aria-label='Email address'
        />
      </m.div>

      <div className='mt-auto pt-10'>
        <AuthFooter isDark={isDark} />
      </div>
    </div>
  </m.form>
)

interface PhoneInputFormProps {
  phone: string
  isLoading: boolean
  error: string | null
  isDark: boolean
  onPhoneChange: (value: string) => void
  onSubmit: (e?: FormEvent) => void
}

const PhoneInputForm = ({
  phone,
  isLoading,
  error,
  isDark,
  onPhoneChange,
  onSubmit,
}: PhoneInputFormProps) => (
  <m.form onSubmit={onSubmit} className='h-full'>
    <div className='flex h-full flex-col'>
      <m.div
        initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}>
        <InputWithButton
          type='tel'
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder={COPY.PHONE_PLACEHOLDER}
          autoFocus
          autoComplete='tel'
          disabled={isLoading}
          isDark={isDark}
          variant='surface'
          size='medium'
          shape='capsule'
          iconLeft={<RiPhoneLine className='h-[18px] w-[18px]' />}
          buttonText={isLoading ? COPY.SENDING : COPY.CONTINUE}
          onButtonClick={() => onSubmit()}
          buttonDisabled={!isValidPhone(phone) || isLoading}
          buttonLoading={isLoading}
          buttonIcon={<RiArrowRightCircleLine className='h-[15px] w-[15px]' />}
          error={error || undefined}
          aria-label='Phone number'
        />
      </m.div>

      <m.div
        className='mt-2'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}>
        <p
          className={cn(
            'text-[12px]',
            isDark ? 'text-foreground/40' : 'text-[#999999]',
          )}>
          Enter in E.164 format (e.g. +1234567890)
        </p>
      </m.div>

      <div className='mt-auto pt-10'>
        <AuthFooter isDark={isDark} />
      </div>
    </div>
  </m.form>
)

interface OtpVerificationFormProps {
  otpValues: string[]
  isLoading: boolean
  error: string | null
  isDark: boolean
  lockoutRemaining: number
  onOtpChange: (values: string[]) => void
  onChangeEmail: () => void
  onResendCode: () => void
  onSubmit: (e: FormEvent) => void
}

const OtpVerificationForm = ({
  otpValues,
  isLoading,
  error,
  isDark,
  lockoutRemaining,
  onOtpChange,
  onChangeEmail,
  onResendCode,
  onSubmit,
}: OtpVerificationFormProps) => {
  const isComplete = isOtpComplete(otpValues)
  const isLockedOut = lockoutRemaining > 0
  const lockoutSeconds = Math.ceil(lockoutRemaining / 1000)
  const displayError = isLockedOut
    ? `Too many attempts. Try again in ${lockoutSeconds}s`
    : error

  return (
    <m.form onSubmit={onSubmit} className='h-full'>
      <div className='flex h-full flex-col'>
        <div className='space-y-8'>
          <m.div
            className='flex justify-center'
            initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.25,
            }}>
            <OtpInput
              value={otpValues}
              onChange={onOtpChange}
              error={displayError}
              isLoading={isLoading || isLockedOut}
              isDark={isDark}
            />
          </m.div>

          {!isComplete && (
            <m.div
              className='flex justify-center'
              initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.3,
              }}>
              <Button
                type='submit'
                variant='secondary'
                size='small'
                disabled={!isComplete}
                loading={isLoading}
                iconRight={
                  !isLoading && (
                    <RiArrowRightCircleLine className='h-[15px] w-[15px]' />
                  )
                }
                aria-label='Verify code'>
                {isLoading ? COPY.VERIFYING : COPY.VERIFY}
              </Button>
            </m.div>
          )}

          <m.div
            className='flex items-center justify-center gap-4'
            initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.35,
            }}>
            <m.button
              type='button'
              onClick={onChangeEmail}
              className={cn(
                'text-[13px] transition-colors',
                isDark
                  ? 'text-foreground/50 hover:text-foreground/70'
                  : 'text-black/50 hover:text-black/70',
              )}
              whileTap={{ scale: 0.95 }}
              aria-label='Change email address'>
              {COPY.CHANGE_EMAIL}
            </m.button>
            <span
              className={cn('text-[13px]', THEME_CLASSES.text.muted(isDark))}
              aria-hidden='true'>
              ·
            </span>
            <m.button
              type='button'
              onClick={onResendCode}
              disabled={isLoading}
              className={cn(
                'text-[13px] transition-colors',
                isDark
                  ? 'text-foreground/50 hover:text-foreground/70'
                  : 'text-black/50 hover:text-black/70',
                isLoading && 'cursor-not-allowed opacity-40',
              )}
              whileTap={{ scale: 0.95 }}
              aria-label='Resend verification code'>
              {COPY.RESEND_CODE}
            </m.button>
          </m.div>
        </div>

        <div className='mt-auto pt-10'>
          <AuthFooter isDark={isDark} />
        </div>
      </div>
    </m.form>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SignInPage() {
  // Hooks
  const {
    isAuthenticated,
    requestOTP,
    verifyOTP,
    requestPhoneOTP,
    verifyPhoneOTP,
    isLoading,
    error,
    signInWithOAuth,
  } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State - pre-fill email from search params (e.g., from invitation flow)
  const emailParam = searchParams.get('email') || ''
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    emailParam ? 'email' : 'initial',
  )
  const [emailStep, setEmailStep] = useState<EmailStep>('input')
  const [email, setEmail] = useState(emailParam)
  const [phone, setPhone] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [otpValues, setOtpValues] = useState<string[]>(createOtpArray())

  // Brute-force protection state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVerifyingRef = useRef(false)

  // Redirect if authenticated — use full page navigation when redirect param exists
  // to ensure session is read fresh from localStorage on the destination page
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect')
      if (redirect) {
        window.location.href = redirect
      } else {
        router.push(ROUTES.AFTER_AUTH)
      }
    }
  }, [isAuthenticated, router, searchParams])

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const remaining = Math.max(0, lockedUntil - Date.now())
      setLockoutRemaining(remaining)
      if (remaining <= 0) {
        setLockedUntil(null)
        setFailedAttempts(0)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  // Handlers
  const handleProviderClick = useCallback(
    (providerId: AuthProvider) => {
      if (providerId === 'email') {
        setAuthMethod('email')
        setEmailStep('input')
      } else if (providerId === 'phone') {
        setAuthMethod('phone')
        setPhoneStep('input')
      } else {
        const redirect = searchParams.get('redirect') || undefined
        signInWithOAuth(providerId, redirect)
      }
    },
    [signInWithOAuth, searchParams],
  )

  const handleEmailSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      if (!isValidEmail(email)) return

      await requestOTP(email)
      setEmailStep('otp')
    },
    [email, requestOTP],
  )

  const handlePhoneSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      if (!isValidPhone(phone)) return

      await requestPhoneOTP(phone)
      setPhoneStep('otp')
    },
    [phone, requestPhoneOTP],
  )

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil

  const handleVerifyResult = useCallback(
    async (code: string) => {
      if (isVerifyingRef.current || isLockedOut) return
      isVerifyingRef.current = true
      try {
        const success =
          authMethod === 'phone'
            ? await verifyPhoneOTP(phone, code)
            : await verifyOTP(email, code)
        if (!success) {
          const newAttempts = failedAttempts + 1
          setFailedAttempts(newAttempts)
          if (newAttempts >= CONFIG.MAX_VERIFY_ATTEMPTS) {
            setLockedUntil(Date.now() + CONFIG.LOCKOUT_DURATION_MS)
          }
        }
      } finally {
        isVerifyingRef.current = false
      }
    },
    [
      authMethod,
      email,
      phone,
      verifyOTP,
      verifyPhoneOTP,
      failedAttempts,
      isLockedOut,
    ],
  )

  const handleOtpChange = useCallback(
    (newValues: string[]) => {
      setOtpValues(newValues)

      // Clear any pending auto-submit
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current)
        verifyTimeoutRef.current = null
      }

      // Auto-submit when complete — redirect is handled by isAuthenticated effect
      if (isOtpComplete(newValues) && !isLockedOut) {
        verifyTimeoutRef.current = setTimeout(() => {
          verifyTimeoutRef.current = null
          handleVerifyResult(newValues.join(''))
        }, CONFIG.OTP_AUTO_SUBMIT_DELAY)
      }
    },
    [handleVerifyResult, isLockedOut],
  )

  const handleOtpSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isOtpComplete(otpValues) || isLockedOut) return

      await handleVerifyResult(otpValues.join(''))
    },
    [otpValues, handleVerifyResult, isLockedOut],
  )

  const handleBack = useCallback(() => {
    if (authMethod === 'email') {
      if (emailStep === 'otp') {
        setEmailStep('input')
        setOtpValues(createOtpArray())
        setFailedAttempts(0)
        setLockedUntil(null)
      } else {
        setAuthMethod('initial')
        setEmail('')
      }
    } else if (authMethod === 'phone') {
      if (phoneStep === 'otp') {
        setPhoneStep('input')
        setOtpValues(createOtpArray())
        setFailedAttempts(0)
        setLockedUntil(null)
      } else {
        setAuthMethod('initial')
        setPhone('')
      }
    }
  }, [authMethod, emailStep, phoneStep])

  const handleChangeEmail = useCallback(() => {
    setEmailStep('input')
    setOtpValues(createOtpArray())
    setFailedAttempts(0)
    setLockedUntil(null)
  }, [])

  const handleChangePhone = useCallback(() => {
    setPhoneStep('input')
    setOtpValues(createOtpArray())
    setFailedAttempts(0)
    setLockedUntil(null)
  }, [])

  const handleResendCode = useCallback(async () => {
    setOtpValues(createOtpArray())
    if (authMethod === 'phone') {
      await requestPhoneOTP(phone)
    } else {
      await requestOTP(email)
    }
  }, [authMethod, email, phone, requestOTP, requestPhoneOTP])

  // Memoized values
  const currentTitle = useMemo(() => {
    if (authMethod === 'initial') return COPY.INITIAL_TITLE
    if (authMethod === 'phone') {
      return phoneStep === 'input'
        ? COPY.PHONE_INPUT_TITLE
        : COPY.PHONE_OTP_TITLE
    }
    if (emailStep === 'input') return COPY.EMAIL_INPUT_TITLE
    return COPY.EMAIL_OTP_TITLE
  }, [authMethod, emailStep, phoneStep])

  const currentSubtitle = useMemo(() => {
    if (authMethod === 'phone') {
      return phoneStep === 'input'
        ? COPY.PHONE_INPUT_SUBTITLE
        : COPY.PHONE_OTP_SUBTITLE(phone)
    }
    if (emailStep === 'input') return COPY.EMAIL_INPUT_SUBTITLE
    return COPY.EMAIL_OTP_SUBTITLE(email)
  }, [authMethod, emailStep, phoneStep, email, phone])

  // Already authenticated — show spinner while redirecting away
  if (isAuthenticated) {
    return <LoadingSpinner />
  }

  return (
    <div
      className={cn(
        'relative flex h-[100dvh] w-screen items-center justify-center',
        THEME_CLASSES.page(isDark),
      )}
      role='main'>
      <m.div
        className={cn(
          'mx-4 w-full max-w-[600px] overflow-hidden sm:mx-auto',
          THEME_CLASSES.container(isDark),
        )}
        {...ANIMATION_VARIANTS.container}
        layout>
        <AuthHeader isDark={isDark} />

        <m.div
          className='min-h-[480px] px-6 py-10 sm:px-8 sm:py-12'
          layout
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          {authMethod === 'initial' ? (
            <>
              <m.h1
                className={cn(
                  'mb-4 text-[17px] font-medium tracking-[-0.01em] sm:mb-5 sm:text-[18px]',
                  THEME_CLASSES.text.primary(isDark),
                )}
                initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.15,
                }}>
                {currentTitle}
              </m.h1>

              <OptionList
                options={authProviderOptions}
                onOptionClick={handleProviderClick}
                isDark={isDark}
                animated={true}
              />

              <AuthFooter isDark={isDark} />
            </>
          ) : authMethod === 'phone' ? (
            <>
              <BackButton onClick={handleBack} />

              <SectionHeader
                title={currentTitle}
                subtitle={currentSubtitle}
                isDark={isDark}
              />

              {phoneStep === 'input' ? (
                <PhoneInputForm
                  phone={phone}
                  isLoading={isLoading}
                  error={error}
                  isDark={isDark}
                  onPhoneChange={setPhone}
                  onSubmit={handlePhoneSubmit}
                />
              ) : (
                <OtpVerificationForm
                  otpValues={otpValues}
                  isLoading={isLoading}
                  error={error}
                  isDark={isDark}
                  lockoutRemaining={lockoutRemaining}
                  onOtpChange={handleOtpChange}
                  onChangeEmail={handleChangePhone}
                  onResendCode={handleResendCode}
                  onSubmit={handleOtpSubmit}
                />
              )}
            </>
          ) : (
            <>
              <BackButton onClick={handleBack} />

              <SectionHeader
                title={currentTitle}
                subtitle={currentSubtitle}
                isDark={isDark}
              />

              {emailStep === 'input' ? (
                <EmailInputForm
                  email={email}
                  isLoading={isLoading}
                  error={error}
                  isDark={isDark}
                  onEmailChange={setEmail}
                  onSubmit={handleEmailSubmit}
                />
              ) : (
                <OtpVerificationForm
                  otpValues={otpValues}
                  isLoading={isLoading}
                  error={error}
                  isDark={isDark}
                  lockoutRemaining={lockoutRemaining}
                  onOtpChange={handleOtpChange}
                  onChangeEmail={handleChangeEmail}
                  onResendCode={handleResendCode}
                  onSubmit={handleOtpSubmit}
                />
              )}
            </>
          )}
        </m.div>
      </m.div>
    </div>
  )
}
