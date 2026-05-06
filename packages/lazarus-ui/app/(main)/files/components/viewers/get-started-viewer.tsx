'use client'

import {
  RiArrowRightUpLine,
  RiFolderSharedLine,
  RiShieldKeyholeLine,
  RiTimeLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect } from 'react'

import { useAuth } from '@/hooks/auth/use-auth'
import { useTabs } from '@/hooks/core/use-tabs'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/store/workspace-store'
import { createClient } from '@/utils/supabase/client'

// Smooth easing curve for natural motion
const smoothEaseOut = [0.22, 1, 0.36, 1] as const

// Staggered container
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

// Fade up for text and inline elements
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEaseOut },
  },
}

// Concept column entrance (whileInView)
const conceptFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: smoothEaseOut },
  }),
}

interface GetStartedViewerProps {
  onComplete?: () => void
}

export function GetStartedViewer({ onComplete }: GetStartedViewerProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const { session } = useAuth()
  const { openFileTab } = useTabs()
  const updateWorkspace = useWorkspaceStore((state) => state.updateWorkspace)

  const workspaceId = selectedWorkspace?.id
  const userId = session?.user?.id

  // Mark onboarding as complete in the database
  const markOnboardingComplete = useCallback(async () => {
    if (!selectedWorkspace) return

    const supabase = createClient()
    await supabase
      .from('workspaces')
      .update({ needs_onboarding: false })
      .eq('id', selectedWorkspace.id)

    // Update local store as well
    updateWorkspace(selectedWorkspace.id, { needsOnboarding: false })
  }, [selectedWorkspace, updateWorkspace])

  // Mark onboarding complete when this component unmounts (tab closed)
  useEffect(() => {
    return () => {
      // Run on unmount - mark onboarding as complete
      if (selectedWorkspace) {
        const supabase = createClient()
        supabase
          .from('workspaces')
          .update({ needs_onboarding: false })
          .eq('id', selectedWorkspace.id)
          .then(() => {
            console.log(
              '[GetStartedViewer] Marked onboarding complete on unmount',
            )
          })
      }
    }
  }, [selectedWorkspace])

  const handleSkip = useCallback(async () => {
    await markOnboardingComplete()
    onComplete?.()
  }, [markOnboardingComplete, onComplete])

  const handleOpenAgentBuilder = useCallback(async () => {
    if (!workspaceId) return

    const fileId = `${workspaceId}/agent/new`
    await openFileTab(fileId, {
      name: 'New Agent',
      fileType: 'agent_create',
      scope: 'user',
      scopeId: userId || '',
    })
  }, [workspaceId, userId, openFileTab])

  const handleAskLazarus = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('prefillChatInput', {
        detail: { text: '', focus: true, highlight: true },
      }),
    )
  }, [])

  return (
    <div className='relative flex h-full flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto'>
        {/* Hero */}
        <m.div
          initial='hidden'
          animate='visible'
          variants={staggerContainer}
          className='flex flex-col items-center px-8 pt-12'>
          <m.h1
            variants={fadeUp}
            className={cn(
              'mb-4 text-center text-[32px] font-semibold tracking-[-0.03em]',
              isDark ? 'text-white' : 'text-black',
            )}>
            Create your first agent
          </m.h1>

          <m.p
            variants={fadeUp}
            className={cn(
              'mb-10 max-w-[380px] text-center text-[15px] leading-relaxed',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            Agents work autonomously in your workspace — reading files, using
            tools, and running on schedules you define.
          </m.p>

          {/* Two CTAs — primary button + text link */}
          <m.div variants={fadeUp} className='flex items-center gap-6'>
            <m.button
              onClick={handleOpenAgentBuilder}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.25, ease: smoothEaseOut }}
              className='rounded-full bg-[#0098FC] px-5 py-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#0088E0]'>
              Open Agent Builder
            </m.button>

            <button
              onClick={handleAskLazarus}
              className={cn(
                'group flex items-center gap-1 text-[13px] font-medium transition-colors duration-300',
                isDark
                  ? 'text-white/50 hover:text-white'
                  : 'text-black/50 hover:text-black',
              )}>
              Ask Lazarus
              <RiArrowRightUpLine className='h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
            </button>
          </m.div>
        </m.div>

        {/* Concepts — three columns, text only, no cards */}
        <m.div
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, margin: '-60px' }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0 },
            },
          }}
          className='mx-auto mt-24 w-full max-w-2xl px-8 pb-32'>
          <m.p
            variants={fadeUp}
            className={cn(
              'mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em]',
              isDark ? 'text-white/25' : 'text-black/25',
            )}>
            Key concepts
          </m.p>

          <div
            className={cn(
              'grid grid-cols-3 gap-px',
              isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]',
            )}>
            {/* Scheduled Work */}
            <m.div
              custom={0}
              variants={conceptFadeUp}
              className={cn(
                'flex flex-col px-6 py-6',
                isDark ? 'bg-[#09090b]' : 'bg-white',
              )}>
              <RiTimeLine
                className={cn(
                  'mb-3 h-[18px] w-[18px]',
                  isDark ? 'text-white/30' : 'text-black/30',
                )}
              />
              <span
                className={cn(
                  'mb-2 text-[15px] font-medium',
                  isDark ? 'text-white/70' : 'text-black/70',
                )}>
                Scheduled Work
              </span>
              <span
                className={cn(
                  'text-[13px] leading-relaxed',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                Agents run on cron schedules, respond to webhooks, or react to
                WhatsApp messages — all without manual intervention.
              </span>
            </m.div>

            {/* Guardrails */}
            <m.div
              custom={0.08}
              variants={conceptFadeUp}
              className={cn(
                'flex flex-col px-6 py-6',
                isDark ? 'bg-[#09090b]' : 'bg-white',
              )}>
              <RiShieldKeyholeLine
                className={cn(
                  'mb-3 h-[18px] w-[18px]',
                  isDark ? 'text-white/30' : 'text-black/30',
                )}
              />
              <span
                className={cn(
                  'mb-2 text-[15px] font-medium',
                  isDark ? 'text-white/70' : 'text-black/70',
                )}>
                Guardrails
              </span>
              <span
                className={cn(
                  'text-[13px] leading-relaxed',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                Control what agents can do with three permission presets across
                seven action categories.
              </span>
            </m.div>

            {/* Shared Files */}
            <m.div
              custom={0.16}
              variants={conceptFadeUp}
              className={cn(
                'flex flex-col px-6 py-6',
                isDark ? 'bg-[#09090b]' : 'bg-white',
              )}>
              <RiFolderSharedLine
                className={cn(
                  'mb-3 h-[18px] w-[18px]',
                  isDark ? 'text-white/30' : 'text-black/30',
                )}
              />
              <span
                className={cn(
                  'mb-2 text-[15px] font-medium',
                  isDark ? 'text-white/70' : 'text-black/70',
                )}>
                Shared Files
              </span>
              <span
                className={cn(
                  'text-[13px] leading-relaxed',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                Every agent reads and writes to the same workspace files in the
                sidebar — true collaboration.
              </span>
            </m.div>
          </div>
        </m.div>
      </div>

      {/* Bottom gradient overlay — brand blue fade */}
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-64'>
        {isDark ? (
          <>
            <div className='absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent' />
            <div className='absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent' />
            <div className='absolute inset-0 bg-gradient-to-t from-[#0098FC]/25 via-[#00D4FF]/[0.07] to-transparent' />
          </>
        ) : (
          <div
            className='absolute inset-0'
            style={{
              background:
                'linear-gradient(to top, #dbeafe, #eff6ff 40%, transparent)',
            }}
          />
        )}
      </div>

      {/* Skip link */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: smoothEaseOut }}
        className='absolute inset-x-0 bottom-0 z-20 flex justify-center pb-6'>
        <button
          onClick={handleSkip}
          className={cn(
            'text-[13px] font-medium transition-colors duration-300',
            isDark
              ? 'text-white/60 hover:text-white/90'
              : 'text-black/60 hover:text-black/90',
          )}>
          Skip for now
        </button>
      </m.div>
    </div>
  )
}

export default GetStartedViewer
