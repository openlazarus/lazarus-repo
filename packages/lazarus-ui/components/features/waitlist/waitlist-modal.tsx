'use client'

import * as m from 'motion/react-m'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import OtpInput from '@/components/ui/otp-input'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30_000

interface WaitlistModalProps {
  isOpen: boolean
  onCodeVerified: () => void
  isDark?: boolean
}

export function WaitlistModal({
  isOpen,
  onCodeVerified,
  isDark: isDarkProp,
}: WaitlistModalProps) {
  const { isDark: themeIsDark } = useTheme()
  const isDark = isDarkProp ?? themeIsDark
  const [code, setCode] = useState<string[]>(Array(6).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVerifyingRef = useRef(false)

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(Array(6).fill(''))
      setError(null)
      setIsVerifying(false)
      isVerifyingRef.current = false
    }
  }, [isOpen])

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

  const verifyCode = useCallback(
    async (codeString: string) => {
      if (isVerifyingRef.current || isLockedOut) return
      isVerifyingRef.current = true
      setIsVerifying(true)
      setError(null)

      try {
        const response = await fetch('/api/auth/verify-invite-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeString }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          const errorMsg = data.error || 'Invalid invite code'
          const newAttempts = failedAttempts + 1
          setFailedAttempts(newAttempts)
          if (newAttempts >= MAX_ATTEMPTS) {
            setLockedUntil(Date.now() + LOCKOUT_DURATION_MS)
          }
          setError(errorMsg)
          setCode(Array(6).fill(''))
          setIsVerifying(false)
          isVerifyingRef.current = false
          return
        }

        onCodeVerified()
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Failed to verify code. Please try again.'
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION_MS)
        }
        setError(errorMsg)
        setCode(Array(6).fill(''))
        setIsVerifying(false)
        isVerifyingRef.current = false
      }
    },
    [failedAttempts, isLockedOut, onCodeVerified],
  )

  const handleCodeChange = useCallback(
    (newCode: string[]) => {
      setCode(newCode)

      // Clear any pending auto-submit
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current)
        verifyTimeoutRef.current = null
      }

      const codeString = newCode.join('')
      if (
        codeString.length === 6 &&
        newCode.every((d) => d !== '') &&
        !isLockedOut
      ) {
        verifyTimeoutRef.current = setTimeout(() => {
          verifyTimeoutRef.current = null
          verifyCode(codeString)
        }, 500)
      }
    },
    [verifyCode, isLockedOut],
  )

  const lockoutSeconds = Math.ceil(lockoutRemaining / 1000)
  const displayError = isLockedOut
    ? `Too many attempts. Try again in ${lockoutSeconds}s`
    : error

  if (!isOpen) return null

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Glassy Backdrop - can see dashboard through it */}
      <div
        className={cn(
          'absolute inset-0 backdrop-blur-xl',
          isDark ? 'bg-black/20' : 'bg-white/20',
        )}
        style={{
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      />

      {/* Modal */}
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{
          duration: 0.3,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className={cn(
          'relative mx-6 w-full max-w-md rounded-2xl p-8 shadow-2xl',
          isDark
            ? 'bg-[#1d1d1f]/95 text-white backdrop-blur-xl'
            : 'bg-white/95 text-[#1d1d1f] backdrop-blur-xl',
        )}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}>
        {/* Header */}
        <div className='mb-6 text-center'>
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.1,
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}>
            <h2
              className={cn(
                'mb-3 text-2xl font-semibold tracking-tight',
                isDark ? 'text-white' : 'text-[#1d1d1f]',
              )}>
              You've found us early
            </h2>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15,
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}>
            <p
              className={cn(
                'text-[15px] leading-relaxed',
                isDark ? 'text-white/70' : 'text-[#86868b]',
              )}>
              Limited seats available as we perfect the experience for our
              founding users. You're on the list.
            </p>
          </m.div>
        </div>

        {/* Invite Code Section */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className='mb-6'>
          <label
            className={cn(
              'mb-3 block text-center text-sm font-medium',
              isDark ? 'text-white/80' : 'text-[#1d1d1f]/80',
            )}>
            Already have an invite? Claim your spot →
          </label>

          <div
            className='mx-auto max-w-[280px]'
            style={{ transform: 'scale(0.7)' }}>
            <OtpInput
              length={6}
              value={code}
              onChange={handleCodeChange}
              error={displayError}
              isLoading={isVerifying || isLockedOut}
              isDark={isDark}
            />
          </div>
        </m.div>

        {/* Benefits Section */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.25,
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className={cn(
            'rounded-xl p-5 text-center',
            isDark ? 'bg-white/5' : 'bg-[#f5f5f7]',
          )}>
          <p
            className={cn(
              'mb-3 text-sm font-semibold',
              isDark ? 'text-white/90' : 'text-[#1d1d1f]/90',
            )}>
            Get in sooner:
          </p>

          <Link
            href='https://x.com/thinklazarus'
            target='_blank'
            rel='noopener noreferrer'
            className={cn(
              'mb-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-center text-sm font-semibold leading-snug transition-all duration-200',
              'bg-[#0098FC] text-white hover:bg-[#0077CC]',
              'active:scale-[0.98]',
            )}>
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='currentColor'
              className='flex-shrink-0'>
              <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
            </svg>
            <span>Follow @thinklazarus on X for priority updates</span>
          </Link>

          <p
            className={cn(
              'mb-3 text-sm font-medium',
              isDark ? 'text-white/70' : 'text-[#1d1d1f]/70',
            )}>
            Founding members get lifetime perks
          </p>

          <p
            className={cn(
              'text-xs',
              isDark ? 'text-white/50' : 'text-[#86868b]',
            )}>
            We'll email you the moment we're ready
          </p>
        </m.div>
      </m.div>
    </m.div>
  )
}
