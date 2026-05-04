'use client'

import {
  RiArrowLeftLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import Logo from '@/components/ui/logo'

/**
 * OAuth Callback Page
 *
 * The user lands here after completing an MCP OAuth authorization flow.
 * The backend redirects to this page with query params indicating the result.
 *
 * Query params:
 *   - status:  'success' | 'error'
 *   - server:  Name of the MCP server that was authorized (e.g. "notion")
 *   - message: Error description (when status=error)
 */

// ─── Animation variants ──────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
}

// ─── Content component (uses useSearchParams, must be in Suspense) ───────────

function OAuthCallbackContent() {
  const searchParams = useSearchParams()

  const status = searchParams.get('status')
  const server = searchParams.get('server')
  const message = searchParams.get('message')

  const isSuccess = status === 'success'
  const serverName = server
    ? server.charAt(0).toUpperCase() + server.slice(1)
    : 'Service'

  return (
    <div className='flex min-h-screen flex-col bg-[hsl(var(--lazarus-gray-100))]'>
      {/* Header */}
      <header className='w-full px-6 py-6 sm:px-8 sm:py-7'>
        <div className='mx-auto max-w-5xl'>
          <a href='/' className='inline-block'>
            <Logo size='medium' />
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className='flex grow flex-col items-center justify-center px-6 pb-24'>
        <div className='w-full max-w-md'>
          {/* Card */}
          <m.div
            initial='hidden'
            animate='visible'
            className='overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm'>
            {/* Status icon banner */}
            <div
              className={`flex items-center justify-center py-10 ${
                isSuccess
                  ? 'bg-gradient-to-b from-green-50 to-white'
                  : 'bg-gradient-to-b from-red-50 to-white'
              }`}>
              <m.div variants={scaleIn}>
                {isSuccess ? (
                  <div className='flex h-20 w-20 items-center justify-center rounded-full bg-green-100'>
                    <RiCheckboxCircleLine className='h-10 w-10 text-green-600' />
                  </div>
                ) : (
                  <div className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100'>
                    <RiCloseCircleLine className='h-10 w-10 text-red-600' />
                  </div>
                )}
              </m.div>
            </div>

            {/* Text content */}
            <div className='px-8 pb-8 pt-2 text-center'>
              <m.h1
                variants={fadeIn}
                custom={0.1}
                initial='hidden'
                animate='visible'
                className='mb-2 text-xl font-semibold text-[hsl(var(--lazarus-gray-800))]'>
                {isSuccess ? `${serverName} Connected` : 'Authorization Failed'}
              </m.h1>

              <m.p
                variants={fadeIn}
                custom={0.2}
                initial='hidden'
                animate='visible'
                className={`mb-6 text-sm leading-relaxed ${
                  isSuccess
                    ? 'text-[hsl(var(--lazarus-gray-500))]'
                    : 'text-red-600/80'
                }`}>
                {isSuccess
                  ? 'Authorization successful. You can close this tab and return to the Lazarus dashboard.'
                  : message ||
                    'Something went wrong. Please try again from the dashboard.'}
              </m.p>

              <m.div
                variants={fadeIn}
                custom={0.3}
                initial='hidden'
                animate='visible'>
                <a
                  href='/'
                  className='inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--lazarus-gray-900))] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90'>
                  <RiArrowLeftLine className='h-4 w-4' />
                  Back to Dashboard
                </a>
              </m.div>
            </div>
          </m.div>

          {/* Footer text */}
          <m.p
            variants={fadeIn}
            custom={0.4}
            initial='hidden'
            animate='visible'
            className='mt-6 text-center text-xs text-[hsl(var(--lazarus-gray-400))]'>
            &copy;{new Date().getFullYear()} Lazarus Labs, LLC. All rights
            reserved.
          </m.p>
        </div>
      </main>
    </div>
  )
}

// ─── Loading fallback ────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--lazarus-gray-100))]'>
      <Logo size='medium' />
    </div>
  )
}

// ─── Page export (wraps content in Suspense for useSearchParams) ─────────────

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  )
}
