'use client'

import * as m from 'motion/react-m'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/spinner'
import { useAuth } from '@/hooks/auth/use-auth'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface InvitationData {
  id: string
  email: string
  workspaceId: string
  workspaceName: string
  role: string
  invitedBy: string
  code: string
}

const ROUTES = {
  DASHBOARD: '/',
} as const

const COPY = {
  BRAND: 'Lazarus',
  SUPPORT_EMAIL: 'support@openlazarus.ai',
  NEED_HELP: 'Need help?',
  CONTACT_SUPPORT: 'Contact',
} as const

const ANIMATION_VARIANTS = {
  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
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
  },
  link: 'text-[#0098fc] transition-opacity hover:opacity-80',
} as const

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
      {COPY.NEED_HELP} {COPY.CONTACT_SUPPORT}{' '}
      <a href={`mailto:${COPY.SUPPORT_EMAIL}`} className={THEME_CLASSES.link}>
        {COPY.SUPPORT_EMAIL}
      </a>
    </p>
  </m.div>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { session, isInitialized } = useAuth()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<InvitationData | null>(
    null,
  )
  const [accepting, setAccepting] = useState(false)

  // Redirect unauthenticated users to sign in first
  useEffect(() => {
    if (!isInitialized) return
    if (session) return

    const currentPath = `/accept-invitation?${searchParams.toString()}`
    router.push(`/signin?redirect=${encodeURIComponent(currentPath)}`)
  }, [isInitialized, session, searchParams, router])

  useEffect(() => {
    const fetchInvitation = async () => {
      // Wait for auth to initialize and ensure user is signed in
      if (!isInitialized || !session) return

      // Support both new code-based and legacy token-based invitations
      const code = searchParams.get('code')
      const legacyToken = searchParams.get('token')

      if (!code && !legacyToken) {
        setError('Invalid invitation link')
        setLoading(false)
        return
      }

      // Handle legacy token-based invitations (base64 encoded)
      if (legacyToken && !code) {
        try {
          const decoded = JSON.parse(
            Buffer.from(legacyToken, 'base64').toString(),
          )
          // Legacy format - redirect to sign in with workspace if it exists
          if (decoded.workspaceId) {
            setInvitationData({
              id: '',
              email: decoded.email,
              workspaceId: decoded.workspaceId,
              workspaceName:
                decoded.workspaceName || decoded.teamName || 'Workspace',
              role: decoded.role,
              invitedBy: decoded.invitedBy,
              code: legacyToken,
            })
            setLoading(false)
            return
          }
          setError(
            'This invitation link is outdated. Please request a new invitation.',
          )
          setLoading(false)
          return
        } catch {
          setError('Invalid invitation link')
          setLoading(false)
          return
        }
      }

      // Fetch invitation from database using code
      try {
        const { data: invitation, error: fetchError } = await supabase
          .from('workspace_invitations')
          .select(
            `
            id,
            email,
            workspace_id,
            role,
            invited_by,
            code,
            expires_at,
            accepted_at,
            declined_at,
            workspaces (id, name)
          `,
          )
          .eq('code', code)
          .single()

        if (fetchError || !invitation) {
          setError('Invitation not found')
          setLoading(false)
          return
        }

        // Check if already accepted or declined
        if (invitation.accepted_at) {
          setError('This invitation has already been accepted')
          setLoading(false)
          return
        }

        if (invitation.declined_at) {
          setError('This invitation has been declined')
          setLoading(false)
          return
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
          setError('This invitation has expired')
          setLoading(false)
          return
        }

        setInvitationData({
          id: invitation.id,
          email: invitation.email,
          workspaceId: invitation.workspace_id,
          workspaceName:
            (invitation.workspaces as { name: string })?.name || 'Workspace',
          role: invitation.role,
          invitedBy: invitation.invited_by,
          code: invitation.code,
        })
        setLoading(false)
      } catch (err) {
        console.error('Error fetching invitation:', err)
        setError('Failed to load invitation')
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [searchParams, supabase, isInitialized, session])

  const handleAccept = async () => {
    if (!invitationData) return

    setAccepting(true)
    setError(null)

    try {
      // If user is not logged in, redirect to sign in
      if (!session) {
        const code = searchParams.get('code')
        const redirectUrl = code
          ? `/accept-invitation?code=${code}`
          : `/accept-invitation?token=${searchParams.get('token')}`
        router.push(
          `/signin?email=${invitationData.email}&redirect=${encodeURIComponent(redirectUrl)}`,
        )
        return
      }

      // Check if user email matches invitation
      if (session.user.email !== invitationData.email) {
        setError(
          `Please sign in with ${invitationData.email} to accept this invitation`,
        )
        setAccepting(false)
        return
      }

      // Use the database function to accept the invitation
      const { data: result, error: acceptError } = await supabase.rpc(
        'accept_workspace_invitation',
        {
          p_invitation_code: invitationData.code,
        },
      )

      if (acceptError) {
        // Handle specific error messages
        if (acceptError.message.includes('already been accepted')) {
          setError('This invitation has already been accepted')
        } else if (acceptError.message.includes('expired')) {
          setError('This invitation has expired')
        } else if (acceptError.message.includes('different email')) {
          setError(
            `Please sign in with ${invitationData.email} to accept this invitation`,
          )
        } else {
          throw acceptError
        }
        setAccepting(false)
        return
      }

      // Redirect to the workspace
      if (result?.workspace_id) {
        router.push(`/?workspaceId=${result.workspace_id}`)
      } else {
        router.push('/')
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('Failed to accept invitation. Please try again.')
      setAccepting(false)
    }
  }

  if (loading) {
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
          {...ANIMATION_VARIANTS.container}>
          <AuthHeader isDark={isDark} />
          <div className='flex min-h-[480px] items-center justify-center px-6 py-10 sm:px-8 sm:py-12'>
            <Spinner size='lg' />
          </div>
        </m.div>
      </div>
    )
  }

  if (error) {
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
            <div className='flex h-full flex-col'>
              <div className='flex flex-1 flex-col items-center justify-center text-center'>
                <m.h1
                  className={cn(
                    'mb-4 text-[18px] font-medium tracking-[-0.01em] sm:text-[19px]',
                    THEME_CLASSES.text.primary(isDark),
                  )}
                  initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.15,
                  }}>
                  Invalid Invitation
                </m.h1>
                <m.p
                  className={cn(
                    'mb-8 text-[14px] font-light leading-relaxed sm:text-[15px]',
                    THEME_CLASSES.text.secondary(isDark),
                  )}
                  initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.2,
                  }}>
                  {error}
                </m.p>
                <m.div
                  initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.25,
                  }}>
                  <Button
                    onClick={() => router.push(ROUTES.DASHBOARD)}
                    variant='active'
                    size='medium'>
                    Go to Dashboard
                  </Button>
                </m.div>
              </div>

              <div className='mt-auto pt-10'>
                <AuthFooter isDark={isDark} />
              </div>
            </div>
          </m.div>
        </m.div>
      </div>
    )
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
          <div className='flex h-full flex-col'>
            <div className='flex flex-1 flex-col items-center justify-center text-center'>
              <m.h1
                className={cn(
                  'mb-4 text-[18px] font-medium tracking-[-0.01em] sm:text-[19px]',
                  THEME_CLASSES.text.primary(isDark),
                )}
                initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.15,
                }}>
                You're Invited!
              </m.h1>
              <m.p
                className={cn(
                  'mb-8 text-[14px] font-light leading-relaxed sm:text-[15px]',
                  THEME_CLASSES.text.secondary(isDark),
                )}
                initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.2,
                }}>
                You've been invited to collaborate on{' '}
                <strong>
                  {invitationData?.workspaceName || 'a workspace'}
                </strong>{' '}
                as {invitationData?.role === 'admin' ? 'an' : 'a'}{' '}
                <strong>{invitationData?.role}</strong>.
              </m.p>
              {!session && (
                <m.p
                  className={cn(
                    'mb-8 text-[13px]',
                    THEME_CLASSES.text.tertiary(isDark),
                  )}
                  initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.25,
                  }}>
                  You'll be redirected to sign in with {invitationData?.email}
                </m.p>
              )}
              <m.div
                initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.3,
                }}>
                <Button
                  onClick={handleAccept}
                  variant='active'
                  size='medium'
                  loading={accepting}
                  disabled={accepting}>
                  Accept Invitation
                </Button>
              </m.div>
            </div>

            <div className='mt-auto pt-10'>
              <AuthFooter isDark={isDark} />
            </div>
          </div>
        </m.div>
      </m.div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  const { isDark } = useTheme()

  return (
    <Suspense
      fallback={
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
            {...ANIMATION_VARIANTS.container}>
            <AuthHeader isDark={isDark} />
            <div className='flex min-h-[480px] items-center justify-center px-6 py-10 sm:px-8 sm:py-12'>
              <Spinner size='lg' />
            </div>
          </m.div>
        </div>
      }>
      <AcceptInvitationContent />
    </Suspense>
  )
}
