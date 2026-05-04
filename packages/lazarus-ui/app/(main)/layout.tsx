/* eslint-disable no-console */
'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { WebhookUrlModal } from '@/components/features/agents/webhook-url-modal'
import { NoWorkspacesScreen } from '@/components/features/workspace/no-workspaces-screen'
import { WorkspacePreparingScreen } from '@/components/features/workspace/workspace-preparing-screen'
import { ChatView } from '@/components/ui/chat/chat-view'
import { MobileWorkspaceSelector } from '@/components/ui/chat/mobile-workspace-selector'
import Curve from '@/components/ui/design/curve'
import { PanelLeftCloseIcon } from '@/components/ui/icons/panel-left-close'
import { PanelLeftOpenIcon } from '@/components/ui/icons/panel-left-open'
import Spinner from '@/components/ui/spinner'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { useAuth } from '@/hooks/auth/use-auth'
import { AgentEvents, useAppEvents } from '@/hooks/core/use-app-events'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useIsMobile } from '@/hooks/ui/layout/use-media-query'
import { useResizableColumns } from '@/hooks/ui/use-resizable-column'
import { useTheme } from '@/hooks/ui/use-theme'
import { useAgentStatus } from '@/hooks/use-agent-status'
import { LAYOUT } from '@/lib/design-system/ui-constants'
import { cn } from '@/lib/utils'
import { useFileTabStore } from '@/store/file-tab-store'
import { useTabStore } from '@/store/tab-store'

import { WorkspaceSelector } from '../../components/features/dashboard/workspace-selector'
import { PendingInvitesModal } from '../../components/features/invitations/pending-invites-modal'
import { WaitlistModal } from '../../components/features/waitlist/waitlist-modal'
import { usePendingInvitations } from '../../hooks/features/invitations/use-pending-invitations'
import { UnifiedFileExplorer } from './files/components/unified-file-explorer'
import { SettingsMenu } from './settings/components/settings-menu'

const LoadingFallback = () => (
  <m.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
    className='flex h-full min-h-[400px] items-center justify-center'>
    <Spinner size='lg' />
  </m.div>
)

function MemoryLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDark, themeMode, setThemeMode } = useTheme()
  const { profile, signOut } = useAuth()
  const isMobile = useIsMobile()
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [showPendingInvites, setShowPendingInvites] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  useAppEvents<AgentEvents>({
    webhookCreated: (data) => setWebhookUrl(data.webhookUrl),
  })

  const { invitations } = usePendingInvitations()
  const pendingInvitesCount = invitations.length

  const { columnWidths, containerRef, startResize, isResizing } =
    useResizableColumns(LAYOUT.columnWidth.default)

  // Workspace and tab management
  const {
    workspaces,
    selectedWorkspace,
    selectWorkspace,
    refreshWorkspaces,
    isInitialized: workspaceInitialized,
  } = useWorkspace()

  const selectedStatus = (selectedWorkspace as { status?: string } | null)
    ?.status
  const showNoWorkspaces = workspaceInitialized && workspaces.length === 0
  const showPreparingWorkspace =
    workspaceInitialized &&
    !!selectedWorkspace &&
    selectedStatus !== undefined &&
    selectedStatus !== 'healthy'

  // Handle workspaceId URL param (e.g. after accepting an invitation)
  const pendingWorkspaceIdRef = useRef<string | null>(null)
  useEffect(() => {
    const targetWorkspaceId = searchParams?.get('workspaceId')
    if (!targetWorkspaceId) return

    pendingWorkspaceIdRef.current = targetWorkspaceId

    // Clean URL param immediately
    const url = new URL(window.location.href)
    url.searchParams.delete('workspaceId')
    router.replace(url.pathname + url.search, { scroll: false })

    // Refresh workspaces to include the newly joined one, then select it
    refreshWorkspaces().then(() => {
      if (pendingWorkspaceIdRef.current) {
        selectWorkspace(pendingWorkspaceIdRef.current)
        pendingWorkspaceIdRef.current = null
      }
    })
  }, [searchParams, router, refreshWorkspaces, selectWorkspace])

  // If workspace was set before the refresh completed, retry selection once workspaces are loaded
  useEffect(() => {
    if (workspaceInitialized && pendingWorkspaceIdRef.current) {
      selectWorkspace(pendingWorkspaceIdRef.current)
      pendingWorkspaceIdRef.current = null
    }
  }, [workspaceInitialized, selectWorkspace])

  // Real-time agent status from WebSocket (needs workspaceId for scoped broadcasts)
  const { tasks: executingTasks, dismissTask } = useAgentStatus(
    selectedWorkspace?.id,
  )
  const { setWorkspaceId: setFileTabWorkspaceId } = useFileTabStore()
  const { setWorkspaceId: setChatTabWorkspaceId } = useTabStore()

  // Sync workspace changes to tab stores for workspace-scoped tab persistence
  // IMPORTANT: Only sync when we have a valid workspace ID to prevent clearing tabs on initial load
  useEffect(() => {
    // Don't clear tabs when workspace is not yet loaded
    if (!selectedWorkspace?.id) {
      console.log(
        '[Layout] Waiting for workspace to load before syncing tab stores',
      )
      return
    }

    console.log(
      '[Layout] Syncing workspace to tab stores:',
      selectedWorkspace.id,
    )
    setFileTabWorkspaceId(selectedWorkspace.id)
    setChatTabWorkspaceId(selectedWorkspace.id)
  }, [selectedWorkspace?.id, setFileTabWorkspaceId, setChatTabWorkspaceId])

  const getActiveSection = () => {
    const path = pathname.split('/').pop()
    if (path === '' || path === '/') return 'files'
    return path
  }

  const activeSection = getActiveSection()

  // Show waitlist modal if user is on waitlist
  // DISABLED: Waitlist feature temporarily disabled
  // useEffect(() => {
  //   if (profile && profile.still_on_waitlist) {
  //     setShowWaitlist(true)
  //   }
  // }, [profile])

  // Handle file open from unified explorer
  const handleFileOpen = useCallback((file: any, workspace: any) => {
    // Simply dispatch the event - no navigation needed
    // The LayoutFileEditor is always mounted at the root route
    window.dispatchEvent(
      new CustomEvent('openFile', { detail: { file, workspace } }),
    )
  }, [])

  // Handle create new file from sidebar
  const handleCreateFile = useCallback(() => {
    // Dispatch event to open the create file dialog
    window.dispatchEvent(new CustomEvent('createNewFile'))
  }, [])

  if (showNoWorkspaces) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className='flex h-screen items-center justify-center bg-background text-foreground'>
        <NoWorkspacesScreen />
      </m.div>
    )
  }

  if (showPreparingWorkspace && selectedWorkspace) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className='flex h-screen items-center justify-center bg-background text-foreground'>
        <WorkspacePreparingScreen
          workspaceId={selectedWorkspace.id}
          status={
            selectedStatus as 'starting' | 'unhealthy' | 'healthy' | undefined
          }
        />
      </m.div>
    )
  }

  // Mobile-only view: Chat + Settings access
  if (isMobile) {
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        className='h-mobile-screen flex flex-col overflow-hidden bg-background text-foreground'
        suppressHydrationWarning>
        {/* Mobile Header with Settings Access */}
        <div
          className='flex items-center justify-between border-b border-[hsl(var(--border))] bg-background px-4 py-3'
          suppressHydrationWarning>
          <Image
            src={
              isDark ? '/brand/lazarus-dark.svg' : '/brand/lazarus-white.svg'
            }
            alt='Lazarus'
            width={100}
            height={40}
            className='h-10 w-auto'
            suppressHydrationWarning
          />
          <MobileWorkspaceSelector />
          <m.button
            whileTap={{
              scale: 0.94,
              transition: {
                duration: 0.1,
                ease: [0.4, 0, 0.2, 1],
              },
            }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              isMobileMenuOpen
                ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
                : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
            )}>
            <i className='ri-menu-line text-xl'></i>
          </m.button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: {
                  height: {
                    duration: 0.4,
                    ease: [0.34, 1.56, 0.64, 1] as any,
                  },
                  opacity: {
                    duration: 0.25,
                    delay: 0.15,
                    ease: [0.34, 1.56, 0.64, 1],
                  },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: {
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1] as any,
                  },
                  opacity: {
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  },
                },
              }}
              className='overflow-hidden border-b border-[hsl(var(--border))] bg-background'>
              <div className='space-y-1 p-4'>
                {/* User Profile */}
                <div
                  className='mb-4 flex items-center gap-3 px-3 py-2'
                  suppressHydrationWarning>
                  <div
                    className={cn(
                      'h-10 w-10 flex-shrink-0 overflow-hidden rounded-full',
                      isDark ? 'bg-white/10' : 'bg-black/5',
                    )}
                    suppressHydrationWarning>
                    {profile?.avatar && profile.avatar.trim() !== '' ? (
                      <img
                        src={profile.avatar}
                        alt=''
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-full w-full items-center justify-center text-sm font-semibold',
                          isDark ? 'text-white/60' : 'text-black/40',
                        )}
                        suppressHydrationWarning>
                        {profile?.first_name && profile?.last_name
                          ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
                          : profile?.email
                            ? profile.email[0].toUpperCase()
                            : 'U'}
                      </div>
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-xs text-[hsl(var(--text-tertiary))]'>
                      Signed in as
                    </div>
                    <div className='truncate text-sm font-semibold'>
                      {profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : profile?.email || 'User'}
                    </div>
                  </div>
                </div>

                {/* Settings Button */}
                <button
                  onClick={() => {
                    router.push('/settings')
                    setIsMobileMenuOpen(false)
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    'hover:bg-[hsl(var(--border))]',
                  )}>
                  <i className='ri-settings-3-line mr-2'></i>
                  Settings
                </button>

                {/* Pending Invites Button */}
                <button
                  onClick={() => {
                    setShowPendingInvites(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    'hover:bg-[hsl(var(--border))]',
                  )}>
                  <i className='ri-mail-line mr-2'></i>
                  Pending invites
                  {pendingInvitesCount > 0 && (
                    <span className='ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--lazarus-blue))] px-1.5 text-xs font-semibold text-white'>
                      {pendingInvitesCount}
                    </span>
                  )}
                </button>

                {/* Theme Selector */}
                <div className='flex items-center justify-between px-3 py-2'>
                  <span className='text-sm font-semibold'>Theme</span>
                  <ThemeSelector
                    value={themeMode}
                    onChange={setThemeMode}
                    isDark={isDark}
                  />
                </div>

                {/* Sign Out */}
                <button
                  onClick={() => signOut()}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    'text-red-500 hover:bg-red-500/10',
                  )}>
                  <i className='ri-logout-box-line mr-2'></i>
                  Sign Out
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Mobile Chat View - Full Screen */}
        <div className='flex-1 overflow-hidden'>
          <ChatView
            messageBarId='mobile-assistant-message-bar'
            autoFocus={false}
            showHelp={false}
            className='h-full'
            variant='mobile'
          />
        </div>

        {/* Waitlist Modal */}
        <WaitlistModal
          isOpen={showWaitlist}
          onCodeVerified={() => {
            setShowWaitlist(false)
            // Refetch profile to get updated waitlist status
            if (profile?.id) {
              window.location.reload()
            }
          }}
          isDark={isDark}
        />

        {/* Pending Invites Modal */}
        <PendingInvitesModal
          isOpen={showPendingInvites}
          onClose={() => setShowPendingInvites(false)}
          isDark={isDark}
        />
      </m.div>
    )
  }

  // Desktop view (existing layout)
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'flex h-screen overflow-hidden',
        'bg-background text-foreground',
        isResizing && 'select-none',
      )}>
      <div className='flex flex-1 overflow-hidden' ref={containerRef}>
        <AnimatePresence mode='wait'>
          {!isSidebarHidden && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: {
                  duration: 0.3,
                  ease: [0.34, 1.56, 0.64, 1],
                },
              }}
              className={cn(
                'relative flex flex-shrink-0 flex-col',
                'bg-background dark:bg-background-secondary',
              )}
              style={{ width: `${columnWidths.left}%`, overflow: 'visible' }}>
              <Curve />
              <div className='relative flex h-full flex-col overflow-hidden'>
                <div className='flex items-center justify-between px-4 py-4'>
                  <m.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.6,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}>
                    <m.button
                      whileHover={{
                        scale: 1.05,
                        transition: {
                          duration: 0.25,
                          ease: [0.34, 1.56, 0.64, 1],
                        },
                      }}
                      whileTap={{
                        scale: 0.95,
                        transition: {
                          duration: 0.1,
                          ease: [0.4, 0, 0.2, 1],
                        },
                      }}
                      onClick={() => setIsSidebarHidden(true)}
                      className={cn(
                        'flex h-8 w-8 translate-y-[2px] items-center justify-center rounded-lg transition-colors duration-200',
                        'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                      )}
                      aria-label='Hide sidebar'>
                      <PanelLeftCloseIcon size={18} />
                    </m.button>
                  </m.div>

                  <m.div
                    initial={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      duration: 0.7,
                      delay: 0.1,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    suppressHydrationWarning>
                    <Image
                      src={
                        isDark
                          ? '/brand/lazarus-dark.svg'
                          : '/brand/lazarus-white.svg'
                      }
                      alt='Lazarus'
                      width={100}
                      height={40}
                      className='h-6 w-auto'
                      suppressHydrationWarning
                    />
                  </m.div>
                </div>

                <div className='flex-1 overflow-y-auto px-2 py-4'>
                  {activeSection === 'settings' ? (
                    <div className='flex h-full flex-col'>
                      <SettingsMenu
                        currentSection={
                          searchParams?.get('section') || 'account'
                        }
                      />
                    </div>
                  ) : (
                    <div className='flex h-full flex-col'>
                      <div className='flex-1 overflow-hidden'>
                        <UnifiedFileExplorer
                          onFileOpen={handleFileOpen}
                          onCreateFile={handleCreateFile}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Workspace Selector - Above User Menu (always visible except in settings) */}
                {activeSection !== 'settings' && (
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.35,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    className='border-t border-[hsl(var(--border))]'>
                    <WorkspaceSelector isDark={isDark} />
                  </m.div>
                )}

                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className={cn('')}>
                  <m.button
                    whileTap={{
                      scale: 0.98,
                      transition: {
                        duration: 0.15,
                        ease: [0.4, 0, 0.2, 1],
                      },
                    }}
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={cn(
                      'w-full px-4 py-6 transition-colors duration-200',
                      'hover:bg-[hsl(var(--border))]',
                    )}>
                    <div className='flex items-center justify-between gap-3'>
                      <div
                        className='flex min-w-0 flex-1 items-center gap-3'
                        suppressHydrationWarning>
                        <div
                          className={cn(
                            'h-11 w-11 flex-shrink-0 overflow-hidden rounded-full',
                            isDark ? 'bg-white/10' : 'bg-black/5',
                          )}
                          suppressHydrationWarning>
                          {profile?.avatar && profile.avatar.trim() !== '' ? (
                            <img
                              src={profile.avatar}
                              alt=''
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div
                              className={cn(
                                'flex h-full w-full items-center justify-center text-sm font-semibold',
                                isDark ? 'text-white/60' : 'text-black/40',
                              )}
                              suppressHydrationWarning>
                              {profile?.first_name && profile?.last_name
                                ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
                                : profile?.email
                                  ? profile.email[0].toUpperCase()
                                  : 'U'}
                            </div>
                          )}
                        </div>
                        <div className='min-w-0 flex-1 text-left'>
                          <div
                            className={cn(
                              'text-xs',
                              'text-[hsl(var(--text-tertiary))]',
                            )}>
                            Signed in as
                          </div>
                          <div className='truncate text-[14px] font-semibold'>
                            {profile?.first_name && profile?.last_name
                              ? `${profile.first_name} ${profile.last_name}`
                              : profile?.email || 'User'}
                          </div>
                        </div>
                      </div>
                      <m.div
                        animate={{
                          rotate: isSettingsOpen ? 0 : 180,
                        }}
                        transition={{
                          duration: 0.4,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        className={cn(
                          'flex h-8 w-8 flex-shrink-0 items-center justify-center',
                          'text-[hsl(var(--text-secondary))]',
                        )}>
                        <svg
                          width={16}
                          height={16}
                          viewBox='0 0 16 16'
                          fill='none'>
                          <path
                            d='M4 6L8 10L12 6'
                            stroke='currentColor'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </m.div>
                    </div>
                  </m.button>

                  {/* Settings Menu */}
                  <AnimatePresence initial={false}>
                    {isSettingsOpen && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: 'auto',
                          opacity: 1,
                          transition: {
                            height: {
                              duration: 0.4,
                              ease: [0.34, 1.56, 0.64, 1],
                            },
                            opacity: {
                              duration: 0.25,
                              delay: 0.15,
                              ease: [0.34, 1.56, 0.64, 1],
                            },
                          },
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                          transition: {
                            height: {
                              duration: 0.3,
                              ease: [0.4, 0, 0.2, 1],
                            },
                            opacity: {
                              duration: 0.2,
                              ease: [0.4, 0, 0.2, 1],
                            },
                          },
                        }}
                        className='overflow-hidden'>
                        <div className='space-y-1 px-4 pb-3'>
                          <m.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{
                              delay: 0.05,
                              duration: 0.25,
                              ease: [0.34, 1.56, 0.64, 1],
                            }}>
                            <button
                              onClick={() => router.push('/settings')}
                              className={cn(
                                'w-full rounded-lg px-3 py-2 text-left text-[14px] font-semibold transition-all duration-200',
                                'hover:bg-[hsl(var(--border))] active:scale-[0.98]',
                              )}>
                              Settings
                            </button>
                          </m.div>

                          <m.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{
                              delay: 0.075,
                              duration: 0.25,
                              ease: [0.34, 1.56, 0.64, 1],
                            }}>
                            <button
                              onClick={() => setShowPendingInvites(true)}
                              className={cn(
                                'w-full rounded-lg px-3 py-2 text-left text-[14px] font-semibold transition-all duration-200',
                                'hover:bg-[hsl(var(--border))] active:scale-[0.98]',
                              )}>
                              <span className='flex items-center justify-between'>
                                <span>Pending invites</span>
                                {pendingInvitesCount > 0 && (
                                  <span className='inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--lazarus-blue))] px-1.5 text-xs font-semibold text-white'>
                                    {pendingInvitesCount}
                                  </span>
                                )}
                              </span>
                            </button>
                          </m.div>

                          <m.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{
                              delay: 0.1,
                              duration: 0.25,
                              ease: [0.34, 1.56, 0.64, 1],
                            }}
                            className='flex items-center justify-between px-3 py-2'>
                            <span className='text-[14px] font-semibold'>
                              Theme
                            </span>
                            <ThemeSelector
                              value={themeMode}
                              onChange={setThemeMode}
                              isDark={isDark}
                            />
                          </m.div>

                          <m.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{
                              delay: 0.15,
                              duration: 0.25,
                              ease: [0.34, 1.56, 0.64, 1],
                            }}>
                            <button
                              onClick={() => signOut()}
                              className={cn(
                                'w-full rounded-lg px-3 py-2 text-left text-[14px] font-semibold transition-all duration-200',
                                'text-red-500 hover:bg-red-500/10 active:scale-[0.98]',
                              )}>
                              Sign Out
                            </button>
                          </m.div>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </m.div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {!isSidebarHidden && (
          <div
            className={cn(
              'group relative cursor-col-resize',
              'after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[""]',
            )}
            style={{ width: '1px' }}
            onMouseDown={(e) => startResize('left', e)}>
            <div
              className={cn(
                'absolute inset-y-0 left-0 right-0 transition-all duration-200',
                'opacity-0',
              )}
            />
          </div>
        )}

        <m.div
          className={cn(
            'flex flex-1 flex-col overflow-hidden',
            'bg-card dark:bg-background',
          )}
          layout='position'
          transition={{
            layout: {
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            },
          }}>
          {isSidebarHidden && (
            <div className={cn('flex items-center justify-between px-6 py-4')}>
              <div className='flex items-center gap-4'>
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 28,
                    mass: 0.6,
                  }}>
                  <m.button
                    whileHover={{
                      scale: 1.05,
                      transition: {
                        duration: 0.25,
                        ease: [0.34, 1.56, 0.64, 1],
                      },
                    }}
                    whileTap={{
                      scale: 0.95,
                      transition: {
                        duration: 0.1,
                        ease: [0.4, 0, 0.2, 1],
                      },
                    }}
                    onClick={() => setIsSidebarHidden(false)}
                    className={cn(
                      'mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200',
                      'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                    )}
                    aria-label='Show sidebar'>
                    <PanelLeftOpenIcon size={18} />
                  </m.button>
                </m.div>

                <m.div
                  initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: 0.1,
                    duration: 0.6,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  suppressHydrationWarning>
                  <Image
                    src={
                      isDark
                        ? '/brand/lazarus-dark.svg'
                        : '/brand/lazarus-white.svg'
                    }
                    alt='Lazarus'
                    width={100}
                    height={40}
                    className='h-10 w-auto'
                    suppressHydrationWarning
                  />
                </m.div>
              </div>
            </div>
          )}

          <div className='flex flex-1 flex-col overflow-hidden'>
            {/* Global Execution Indicator - Commented out
            <GlobalExecutionIndicator
              tasks={executingTasks}
              isDark={isDark}
              onDismiss={dismissTask}
            />
            */}

            {/* Page Content */}
            <div className='flex-1 overflow-hidden'>
              <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
            </div>
          </div>
        </m.div>

        {activeSection !== 'settings' && (
          <>
            <div
              className={cn(
                'group relative cursor-col-resize',
                'after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[""]',
              )}
              style={{ width: '1px' }}
              onMouseDown={(e) => startResize('right', e)}>
              <div
                className={cn(
                  'absolute inset-y-0 left-0 right-0 transition-all duration-200',
                  'opacity-0',
                )}
              />
            </div>

            <m.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                x: {
                  type: 'spring',
                  stiffness: 280,
                  damping: 26,
                  mass: 0.7,
                  delay: 0.15,
                },
                opacity: {
                  duration: 0.6,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.15,
                },
              }}
              className={cn(
                'flex flex-shrink-0 flex-col',
                'bg-background dark:bg-background-secondary',
              )}
              style={{ width: `${columnWidths.right}%` }}>
              <ChatView
                messageBarId='memory-assistant-message-bar'
                autoFocus={false}
                showHelp={false}
                className='flex-1'
              />
            </m.div>
          </>
        )}
      </div>

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={showWaitlist}
        onCodeVerified={() => {
          setShowWaitlist(false)
          // Refetch profile to get updated waitlist status
          if (profile?.id) {
            window.location.reload()
          }
        }}
        isDark={isDark}
      />

      {/* Pending Invites Modal */}
      <PendingInvitesModal
        isOpen={showPendingInvites}
        onClose={() => setShowPendingInvites(false)}
        isDark={isDark}
      />

      {/* Webhook URL Modal */}
      {webhookUrl && (
        <WebhookUrlModal
          webhookUrl={webhookUrl}
          onClose={() => setWebhookUrl(null)}
        />
      )}
    </m.div>
  )
}

// Wrap in Suspense to handle useSearchParams()
export default function MemoryLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MemoryLayoutContent>{children}</MemoryLayoutContent>
    </Suspense>
  )
}
