import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useChat } from '@/hooks/core/use-chat'
import { useQueryParams } from '@/hooks/data/use-query-params'
import { useUIState } from '@/state/ui-state'

// Define tab types here since removed from ui-state
export type TabType = 'ask' | 'workspace'

/**
 * A unified application navigation hook that handles all navigation concerns,
 * including studio navigation, conversation creation, and tab management.
 *
 * This hook follows design principle of providing a clean, focused API
 * that abstracts implementation details while maintaining clear responsibility.
 */
export function useAppNavigator(
  props: {
    initialConversationId?: string
    initialQuestion?: string
  } = {},
) {
  const { initialConversationId, initialQuestion } = props

  // Router and navigation
  const router = useRouter()
  const pathname = usePathname()
  const { queryParams, setQueryParams } = useQueryParams()

  // UI State context - remove tab state dependencies
  const { activeConversationId, setActiveConversationId } = useUIState()

  // Chat system
  const { conversations, currentConversation, sendMessage } = useChat()

  // Use ref to track the last processed conversation ID to prevent loops
  const lastProcessedConversationId = useRef<string | null>(null)

  // Derive active tab from URL - no state needed!
  const activeTab = useMemo((): TabType => {
    const tabParam = queryParams.tab as string
    if (tabParam === 'ask' || tabParam === 'workspace') {
      return tabParam
    }
    // Default to 'ask' if initialQuestion is provided, otherwise 'ask'
    return initialQuestion ? 'ask' : 'ask'
  }, [queryParams.tab, initialQuestion])

  // Sync URL conversation parameter with activeConversationId state
  // This is the single source of truth for conversation state
  useEffect(() => {
    if (typeof window === 'undefined') return

    const conversationIdFromUrl = queryParams.c as string | undefined

    // Only update if we haven't already processed this conversation ID
    if (conversationIdFromUrl !== lastProcessedConversationId.current) {
      lastProcessedConversationId.current = conversationIdFromUrl || null

      if (
        conversationIdFromUrl &&
        conversationIdFromUrl !== activeConversationId
      ) {
        // Set active conversation from URL
        setActiveConversationId(conversationIdFromUrl)
      } else if (!conversationIdFromUrl && activeConversationId) {
        // Clear active conversation if no 'c' parameter in URL
        setActiveConversationId(null)
      } else if (
        !conversationIdFromUrl &&
        !activeConversationId &&
        initialConversationId
      ) {
        // Set initial conversation if provided and no current state
        setActiveConversationId(initialConversationId)
        lastProcessedConversationId.current = initialConversationId
      }
    }
  }, [queryParams.c, initialConversationId, setActiveConversationId])

  /**
   * Navigate to the home screen
   */
  const navigateToHome = useCallback(() => {
    router.push('/')
  }, [router])

  /**
   * Navigate to the studio with optional parameters
   */
  const navigateToStudio = useCallback(
    (
      options: {
        conversationId?: string
        initialQuestion?: string
        activeTab?: TabType
      } = {},
    ) => {
      const newParams: Record<string, string> = {}

      // Set tab
      const tab = options.activeTab || 'ask'
      newParams.tab = tab

      // Set conversation ID if provided
      if (options.conversationId) {
        newParams.c = options.conversationId
      } else if (currentConversation) {
        newParams.c = currentConversation.id
      }

      // Set initial question if provided
      if (options.initialQuestion) {
        newParams.q = encodeURIComponent(options.initialQuestion)
      }

      // Only update query parameters - let the useEffect handle the state sync
      setQueryParams(newParams, { replace: false })
    },
    [currentConversation, setQueryParams],
  )

  /**
   * Create a new conversation and navigate to it
   * Note: Conversations are now managed by the chat system automatically
   */
  const createConversationAndNavigate = useCallback(
    async (text: string) => {
      if (!text.trim()) return null

      try {
        // Just send the message - conversation will be created automatically
        await sendMessage(text, [])

        // Navigate to studio with the initial question
        navigateToStudio({
          initialQuestion: text,
          activeTab: 'ask',
        })

        return null // Conversation will be created by backend
      } catch (error) {
        console.error('Failed to send message:', error)
        return null
      }
    },
    [navigateToStudio, sendMessage],
  )

  /**
   * Change the active tab in the studio
   */
  const changeStudioTab = useCallback(
    (tab: TabType) => {
      // Only update if different to avoid unnecessary navigation
      if (activeTab === tab) return

      // Only update URL if we're in the main app to prevent navigation
      if (
        pathname?.startsWith('/activity') ||
        pathname?.startsWith('/agents') ||
        pathname?.startsWith('/files') ||
        pathname?.startsWith('/sources')
      ) {
        const newParams: Record<string, string> = {
          ...queryParams,
          tab,
        }

        // If we have a current conversation, include it in the URL
        if (currentConversation) {
          newParams.c = currentConversation.id
        }

        // Update the URL without navigation - URL change triggers re-render only where needed
        setQueryParams(newParams, { replace: true })
      }
    },
    [activeTab, currentConversation, pathname, queryParams, setQueryParams],
  )

  /**
   * Start a new conversation
   * Note: Conversations are now managed by the chat system automatically
   */
  const startNewConversation = useCallback(async () => {
    try {
      // Clear active conversation
      setActiveConversationId(null)

      // Update query parameters to clear conversation
      const newParams = {
        tab: 'ask',
      }

      setQueryParams(newParams, { replace: true })

      return null // New conversation will be created when user sends first message
    } catch (error) {
      console.error('Failed to start new conversation:', error)
      return null
    }
  }, [setQueryParams, setActiveConversationId])

  // Provide information about the current navigation state
  const currentState = useMemo(
    () => ({
      screen:
        pathname?.startsWith('/activity') ||
        pathname?.startsWith('/agents') ||
        pathname?.startsWith('/files') ||
        pathname?.startsWith('/sources')
          ? 'app'
          : pathname || 'unknown',
      conversationId: currentConversation?.id,
      studioTab: activeTab,
    }),
    [pathname, currentConversation?.id, activeTab],
  )

  return {
    // Core navigation
    navigateToHome,
    navigateToStudio,

    // Conversation handling
    createConversationAndNavigate,
    startNewConversation,

    // Tab management
    changeStudioTab,

    // Current state
    currentState,

    // Tab state derived from URL
    activeTab,
    mounted: true, // Always return true since we handle SSR with typeof check
  }
}
