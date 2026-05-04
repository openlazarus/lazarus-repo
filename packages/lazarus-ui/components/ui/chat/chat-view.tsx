'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DraggableTabs } from '@/components/ui/draggable-tabs'
import { MessageBar } from '@/components/ui/message-bar'
import { Attachment } from '@/components/ui/message-bar/hooks/use-attachments'
import { useAppEvents } from '@/hooks/core/use-app-events'
import {
  useActiveChatTab,
  useActiveChatTabId,
  useChatTabActions,
  useChatTabs,
  useTabStoreHydrated,
} from '@/hooks/core/use-chat-tabs'
import { useConversationActions } from '@/hooks/core/use-conversation'
import { useConversationMessages } from '@/hooks/core/use-conversation-messages'
import {
  useConversationError,
  useIsStreaming,
} from '@/hooks/core/use-conversation-streaming'
import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { useGetConversations } from '@/hooks/features/conversation/use-get-conversations'
import { useDropZone } from '@/hooks/ui/use-drop-zone'
import { useTheme } from '@/hooks/ui/use-theme'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useIdentity } from '@/state/identity'
import { useChatStore } from '@/store/chat-store'
import { useTabStore } from '@/store/tab-store'
import { TaggedItem } from '@/store/tag-store'

import { AgentSelectorDropdown } from './agent-selector-dropdown'
import { Chat } from './chat'
import { ConversationDropdown } from './conversation-dropdown'
import { ConversationLoader } from './conversation-loader'
import { ConversationTitleAutoGenerator } from './conversation-title-auto-generator'
import { PinnedExecutionPlan } from './pinned-execution-plan'
import { ChatMessage, ExecutionPlanTodo, MessageRole } from './types'

export interface ChatViewProps {
  className?: string
  messageBarId?: string
  autoFocus?: boolean
  showHelp?: boolean
  title?: string
  workspaceId?: string
  sessionId?: string
  onSessionChange?: (sessionId: string | null) => void

  // Additional ChatView features
  onActionClick?: (messageId: string, actionId: string) => void
  onTapbackClick?: (messageId: string, tapback: any) => void
  onTagClick?: (tag: any) => void
  showHeader?: boolean
  variant?: 'mobile' | 'desktop'
}

export const ChatView = memo<ChatViewProps>(
  ({
    className,
    messageBarId = 'chat-message-bar',
    autoFocus = false,
    showHelp = false,
    title = '',
    workspaceId: initialWorkspaceId,
    sessionId: initialSessionId,
    onSessionChange,
    onActionClick,
    onTapbackClick,
    onTagClick,
    showHeader = true,
    variant = 'desktop',
  }) => {
    const { isDark } = useTheme()
    const { profile, activeWorkspaceId } = useIdentity()
    const { emit } = useAppEvents<{ chatFilesDropped: { files: File[] } }>()
    const { dropZoneProps } = useDropZone({
      onFilesDropped: (files) => emit('chatFilesDropped', { files }),
    })
    const router = useRouter()
    const searchParams = useSearchParams()
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
      'lazarus',
    )
    const [selectedAgentName, setSelectedAgentName] =
      useState<string>('Lazarus')

    // Track if we've handled URL params to prevent re-running
    const hasHandledUrlParams = useRef(false)

    // Log workspace selection for debugging
    useEffect(() => {
      if (activeWorkspaceId) {
        console.log(
          '[ChatView] Using workspace from Identity:',
          activeWorkspaceId,
        )
      } else {
        console.warn('[ChatView] No workspace selected in Identity state')
      }
    }, [activeWorkspaceId])

    const [respondedPermissions, setRespondedPermissions] = useState<
      Map<string, { allowed: boolean; reason?: string }>
    >(new Map())
    const [pinnedExecutionPlan, setPinnedExecutionPlan] = useState<{
      title: string
      todos: ExecutionPlanTodo[]
      toolId?: string
    } | null>(null)

    // Track initialization to prevent endless tab creation
    const hasInitializedTabs = useRef(false)

    // Load conversation list for current workspace (for history dropdown)
    const { data: conversationsData, mutate: loadConversations } =
      useGetConversations(activeWorkspaceId || undefined)
    const conversationList = conversationsData?.conversations ?? []

    // Pending auto-title generation request (set when a new conversation is
    // created; rendered as a one-shot child component below).
    const [pendingAutoTitle, setPendingAutoTitle] = useState<{
      conversationId: string
      tabId: string
    } | null>(null)

    // Get tab store state and actions using optimized hooks
    const tabs = useChatTabs()
    const activeTabId = useActiveChatTabId()
    const activeTab = useActiveChatTab()
    const hasTabStoreHydrated = useTabStoreHydrated()
    const {
      createTab,
      closeTab,
      switchTab,
      updateTab,
      linkTabToConversation,
      reorderTabs,
    } = useChatTabActions()

    // Get chat store configuration and actions
    const setConfig = useChatStore((state) => state.setConfig)
    const setEventHandlers = useChatStore((state) => state.setEventHandlers)
    const {
      sendMessage,
      ensureConversation,
      createConversation,
      deleteConversation: deleteConversationState,
      cancelStream,
      sendPermissionResponse,
      sendAskUserQuestionResponse,
    } = useConversationActions(activeWorkspaceId || '')

    // Get active conversation ID from active tab
    const activeConversationId = activeTab?.conversationId || null

    // Get active conversation state using optimized hooks
    const messages = useConversationMessages(activeConversationId)
    const isStreaming = useIsStreaming(activeConversationId)
    const conversationError = useConversationError(activeConversationId)

    // Sync selected agent from the active tab — needed on refresh/hydration
    // when the tab is restored from localStorage with an agent other than lazarus.
    useEffect(() => {
      if (!activeTab) return
      if (activeTab.agentId && activeTab.agentId !== selectedAgentId) {
        setSelectedAgentId(activeTab.agentId)
        setSelectedAgentName(activeTab.agentName || 'Lazarus')
      }
    }, [
      activeTab?.id,
      activeTab?.agentId,
      activeTab?.agentName,
      selectedAgentId,
    ])

    // Configure chat store with workspace and agent (only when they change)
    useEffect(() => {
      setConfig({
        workspaceId: activeWorkspaceId,
        agentId: selectedAgentId || undefined,
        mcpServers: undefined,
        systemPrompt: undefined,
        maxTurns: 100,
        temperature: 0.7,
        requirePermissions: true,
      })
    }, [activeWorkspaceId, selectedAgentId, setConfig])

    // Set event handlers once on mount
    useEffect(() => {
      setEventHandlers({
        onError: (conversationId, error) => {
          console.error(`[Conversation ${conversationId}] Error:`, error)
        },
        onPermissionRequest: (conversationId, request) => {
          console.log(
            `[Conversation ${conversationId}] Permission request:`,
            request,
          )
        },
        onConversationCreated: async (conversationId, sessionId, title) => {
          console.log('[ChatView] Conversation created:', conversationId, title)

          // Link the current tab to the new conversation
          // Use the store's getActiveTab() since activeTab from hook might be stale in callback
          const currentActiveTab = useTabStore.getState().getActiveTab()
          const currentActiveTabId = currentActiveTab?.id

          const existingConvId = currentActiveTab?.conversationId
          const isTempOrEmpty =
            !existingConvId || existingConvId.startsWith('temp_')
          if (currentActiveTab && isTempOrEmpty) {
            linkTabToConversation(currentActiveTab.id, conversationId, title)
          }

          // Reload conversation list
          await loadConversations()

          // Schedule background title generation via the one-shot child component
          if (currentActiveTabId) {
            setPendingAutoTitle({ conversationId, tabId: currentActiveTabId })
          }
        },
      })
    }, [setEventHandlers, loadConversations, linkTabToConversation])

    // Handle conversation selection from dropdown
    const handleSelectConversation = useCallback(
      async (conversationId: string | null) => {
        if (conversationId) {
          // Check if we already have a tab for this conversation
          const existingTab = tabs.find(
            (t) => t.conversationId === conversationId,
          )

          if (existingTab) {
            // Switch to existing tab and update selected agent to match
            switchTab(existingTab.id)
            if (existingTab.agentId !== undefined) {
              setSelectedAgentId(existingTab.agentId)
              setSelectedAgentName(existingTab.agentName || 'Lazarus')
            }
          } else {
            // Create new tab and load conversation
            const conversation = conversationList.find(
              (c) => c.id === conversationId,
            )
            const title = conversation?.title || 'New chat'
            const agentId = conversation?.agentId || 'lazarus'
            const agentName = conversation?.agentName || 'Lazarus'

            // Create tab with agent info from conversation
            const tabId = createTab(conversationId, agentId, agentName)
            updateTab(tabId, { title })

            // Update selected agent to match the conversation's agent
            setSelectedAgentId(agentId)
            setSelectedAgentName(agentName)

            // Ensure the conversation slot exists in the store; the actual
            // fetch is handled by <ConversationLoader> mounted below when
            // activeConversationId becomes this id.
            ensureConversation(conversationId)
          }
        } else {
          // Create new chat tab
          createTab(null)
        }
      },
      [
        tabs,
        conversationList,
        createTab,
        switchTab,
        updateTab,
        ensureConversation,
      ],
    )

    // Called by ConversationListItem after it has successfully deleted the
    // conversation on the workspace API. We just clean up local state here.
    const handleConversationDeleted = useCallback(
      (conversationId: string) => {
        const tabToClose = tabs.find((t) => t.conversationId === conversationId)
        if (tabToClose) {
          closeTab(tabToClose.id)
        }
        deleteConversationState(conversationId)
        // Refresh list cache
        loadConversations()
      },
      [tabs, closeTab, deleteConversationState, loadConversations],
    )

    // Convert API messages to UI format
    const chatMessages = useMemo<ChatMessage[]>(() => {
      console.log('[ChatView] Converting messages:', {
        messageCount: messages.length,
      })

      const converted = messages
        .filter((msg) => msg.content || msg.variant || msg.role)
        .map((msg): ChatMessage => {
          // Check if this is a permission message
          if (msg.role === 'permission' && msg.variant?.type === 'permission') {
            return {
              id: msg.id,
              role: msg.role as MessageRole,
              timestamp: msg.timestamp,
              variant: msg.variant,
              metadata: {
                ...msg.metadata,
                permissionResponse: respondedPermissions.get(
                  msg.variant.request.requestId,
                ),
              },
            }
          }

          // Check if message already has a variant (for special message types)
          if (msg.variant) {
            return {
              id: msg.id,
              role: msg.role as MessageRole,
              timestamp: msg.timestamp,
              variant: msg.variant,
              metadata: {
                ...msg.metadata,
                toolCalls: msg.toolCalls,
                isStreaming: msg.isStreaming,
              },
            }
          }

          // Convert regular text messages
          return {
            id: msg.id,
            role: msg.role as MessageRole,
            timestamp: msg.timestamp,
            variant: {
              type: 'text' as const,
              content: msg.content || '',
              status: msg.isStreaming ? 'sending' : 'sent',
            },
            metadata: {
              ...msg.metadata,
              toolCalls: msg.toolCalls,
              isStreaming: msg.isStreaming,
            },
          }
        })

      console.log('[ChatView] Final converted messages:', converted.length)
      return converted
    }, [messages, respondedPermissions])

    const uploadAttachment = useCallback(
      async (file: File, workspaceId: string): Promise<string> => {
        const uploadPath = `uploads/${file.name}`
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', uploadPath)
        const baseUrl = getWorkspaceBaseUrl(workspaceId)
        await api.post(`${baseUrl}/api/workspaces/upload`, formData, {
          headers: { 'x-workspace-id': workspaceId },
        })
        return uploadPath
      },
      [],
    )

    const handleSendMessage = useCallback(
      async (
        text: string,
        taggedItems: TaggedItem[],
        attachments?: Attachment[],
      ) => {
        console.log('[ChatView] handleSendMessage called:', {
          text,
          activeConversationId,
          activeTab,
          profileId: profile?.id,
        })

        if (!profile?.id) {
          console.error('[ChatView] No user profile available')
          return
        }

        // For new chat tabs, create a temporary conversation ID
        let conversationId = activeConversationId

        if (!conversationId && activeTab) {
          // Generate temporary ID for new conversations
          conversationId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
          console.log(
            '[ChatView] Creating new conversation with temp ID:',
            conversationId,
          )

          // Create conversation in store
          createConversation(conversationId)
          console.log('[ChatView] Conversation created in store')

          // Link tab to this temporary ID (will be replaced when backend creates real ID)
          linkTabToConversation(activeTab.id, conversationId, 'New Chat')
          console.log('[ChatView] Tab linked to conversation')
        }

        if (!conversationId) {
          console.error('[ChatView] Cannot send message - no conversation ID')
          return
        }

        // Upload attachments in parallel and append file mentions
        let messageText = text
        if (attachments?.length && activeWorkspaceId) {
          const paths = await Promise.all(
            attachments.map((att) =>
              uploadAttachment(att.file, activeWorkspaceId),
            ),
          )
          const mentions = paths.map((p) => `@{file:${p}}`).join(' ')
          messageText = `${text}\n\n${mentions}`
        }

        console.log('[ChatView] Calling sendMessage with:', {
          conversationId,
          text: messageText,
          userId: profile.id,
          taggedItemsCount: taggedItems?.length || 0,
        })

        // Send message to the active conversation (with tagged items for UI display)
        await sendMessage(conversationId, messageText, profile.id, taggedItems)

        console.log('[ChatView] sendMessage completed')
      },
      [
        activeConversationId,
        activeTab,
        activeWorkspaceId,
        profile?.id,
        createConversation,
        linkTabToConversation,
        sendMessage,
        uploadAttachment,
      ],
    )

    const handlePermissionResponse = useCallback(
      async (
        sessionId: string,
        requestId: string,
        allowed: boolean,
        reason?: string,
      ) => {
        console.log('[ChatView] Permission response:', {
          sessionId,
          requestId,
          allowed,
          reason,
          activeConversationId,
        })

        // Track the response for UI (optimistic update)
        setRespondedPermissions((prev) => {
          const newMap = new Map(prev)
          newMap.set(requestId, { allowed, reason })
          return newMap
        })

        // Send the permission response to the backend
        if (activeConversationId) {
          try {
            await sendPermissionResponse(
              activeConversationId,
              sessionId,
              requestId,
              allowed,
              reason,
            )
            console.log('[ChatView] Permission response sent successfully')
          } catch (error) {
            console.error(
              '[ChatView] Failed to send permission response:',
              error,
            )
            // Revert the optimistic update on failure
            setRespondedPermissions((prev) => {
              const newMap = new Map(prev)
              newMap.delete(requestId)
              return newMap
            })
          }
        } else {
          console.warn(
            '[ChatView] Cannot send permission response - no active conversation',
          )
        }
      },
      [activeConversationId, sendPermissionResponse],
    )

    const handleAskUserQuestionResponse = useCallback(
      async (
        sessionId: string,
        requestId: string,
        answers: Record<string, string>,
      ) => {
        console.log('[ChatView] Ask-user question response:', {
          sessionId,
          requestId,
          answers,
          activeConversationId,
        })

        if (activeConversationId) {
          try {
            await sendAskUserQuestionResponse(
              activeConversationId,
              sessionId,
              requestId,
              answers,
            )
            console.log(
              '[ChatView] Ask-user question response sent successfully',
            )
          } catch (error) {
            console.error(
              '[ChatView] Failed to send ask-user question response:',
              error,
            )
          }
        } else {
          console.warn(
            '[ChatView] Cannot send ask-user question response - no active conversation',
          )
        }
      },
      [activeConversationId, sendAskUserQuestionResponse],
    )

    const handleNewChat = useCallback(
      (agentId?: string | null, agentName?: string) => {
        // Update selected agent if provided
        if (agentId !== undefined) {
          setSelectedAgentId(agentId)
          setSelectedAgentName(agentName || 'Lazarus')
        }
        // Create new tab with agent info
        createTab(
          null,
          agentId || selectedAgentId,
          agentName || selectedAgentName,
        )
      },
      [createTab, selectedAgentId, selectedAgentName],
    )

    const handleAgentSelect = useCallback(
      (agentId: string | null, agentName: string) => {
        // If same agent, do nothing
        if (agentId === selectedAgentId) return

        setSelectedAgentId(agentId)
        setSelectedAgentName(agentName)

        // If current chat is empty (no messages), just update the agent on the existing tab
        const currentMessages = activeConversationId
          ? useChatStore.getState().conversations.get(activeConversationId)
              ?.messages || []
          : []

        if (currentMessages.length === 0 && activeTabId) {
          updateTab(activeTabId, { agentId, agentName })
        } else {
          // Current chat has messages — create a new chat with the selected agent
          createTab(null, agentId, agentName)
        }
      },
      [
        selectedAgentId,
        activeConversationId,
        activeTabId,
        updateTab,
        createTab,
      ],
    )

    // Separate handler for creating new chat with current agent
    const handleNewChatClick = useCallback(() => {
      handleNewChat(selectedAgentId, selectedAgentName)
    }, [handleNewChat, selectedAgentId, selectedAgentName])

    // Reset initialization flag when workspace changes
    useEffect(() => {
      hasInitializedTabs.current = false
    }, [activeWorkspaceId])

    // Initialize with a default "New chat" tab - but ONLY after:
    // 1. Tab store has hydrated from localStorage (to avoid race conditions)
    // 2. Workspace is set
    // This prevents creating a new tab before workspace-specific tabs are loaded
    useEffect(() => {
      // Wait for tab store to hydrate from localStorage first
      if (!hasTabStoreHydrated) {
        console.log(
          '[ChatView] Waiting for tab store hydration before initializing tabs',
        )
        return
      }

      // Wait for workspace to be set before creating default tab
      if (!activeWorkspaceId) {
        console.log('[ChatView] Waiting for workspace before initializing tabs')
        return
      }

      // Only run once after tabs are loaded and still empty
      if (tabs.length === 0 && !hasInitializedTabs.current) {
        console.log(
          '[ChatView] Initializing with default New chat tab for workspace:',
          activeWorkspaceId,
        )
        hasInitializedTabs.current = true
        createTab(null)
      }
    }, [tabs.length, createTab, activeWorkspaceId, hasTabStoreHydrated])

    // Lazy load conversation when switching tabs
    useEffect(() => {
      if (!activeConversationId || !profile?.id) return

      // Don't try to load temporary conversation IDs from backend
      if (activeConversationId.startsWith('temp_')) {
        console.log(
          '[ChatView] Skipping backend load for temporary conversation:',
          activeConversationId,
        )
        return
      }

      // Ensure the conversation slot exists; the data fetch happens in
      // <ConversationLoader> mounted below.
      ensureConversation(activeConversationId)
    }, [activeConversationId, ensureConversation])

    // Update tab title when conversation title changes
    useEffect(() => {
      if (activeTab && activeConversationId) {
        const conversation = conversationList.find(
          (c) => c.id === activeConversationId,
        )
        if (conversation && conversation.title !== activeTab.title) {
          updateTab(activeTab.id, { title: conversation.title })
        }
      }
    }, [activeConversationId, conversationList, activeTab, updateTab])

    // Handle URL params for agent selection (e.g., from EmptyWorkspaceOverlay)
    // URL format: /?agent=workspace-designer&startDesign=true
    useEffect(() => {
      const agentFromUrl = searchParams.get('agent')
      const startDesign = searchParams.get('startDesign')

      // Only handle once and only if params are present
      if (
        !agentFromUrl ||
        !startDesign ||
        hasHandledUrlParams.current ||
        !activeWorkspaceId ||
        !profile?.id
      )
        return

      console.log('[ChatView] Handling URL params for agent:', agentFromUrl)
      hasHandledUrlParams.current = true

      // Map agent ID to display name
      const agentNameMap: Record<string, string> = {
        'workspace-designer': 'Workspace Designer',
        lazarus: 'Lazarus',
      }

      const agentName = agentNameMap[agentFromUrl] || agentFromUrl

      // Set the selected agent
      setSelectedAgentId(agentFromUrl)
      setSelectedAgentName(agentName)

      // Create a new chat tab with this agent and send initial message
      setTimeout(async () => {
        const tabId = createTab(null, agentFromUrl, agentName)

        // Clear URL params after handling
        const newUrl = window.location.pathname
        router.replace(newUrl)

        // For workspace-designer, auto-send a greeting to start the conversation
        if (agentFromUrl === 'workspace-designer') {
          // Small delay to ensure tab is created and linked
          setTimeout(async () => {
            // Get the tab's conversation ID or create a temp one
            const tab = useTabStore.getState().tabs.find((t) => t.id === tabId)
            let convId = tab?.conversationId

            if (!convId) {
              convId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
              createConversation(convId)
              linkTabToConversation(tabId, convId, 'Workspace Setup')
            }

            // Send initial message to start the conversation
            await sendMessage(
              convId,
              "Hi! I'd like help setting up my workspace. What templates do you have available?",
              profile.id,
            )
          }, 200)
        }
      }, 100)
    }, [
      searchParams,
      activeWorkspaceId,
      router,
      createTab,
      profile?.id,
      sendMessage,
      createConversation,
      linkTabToConversation,
    ])

    // Cleanup: Remove conversation state when tab is closed
    useEffect(() => {
      const tabConversationIds = new Set(
        tabs.map((tab) => tab.conversationId).filter(Boolean) as string[],
      )

      // When a tab is closed, clean up its conversation
      // This runs on tab changes, checking for removed tabs
      return () => {
        // Cleanup will be handled by tab store closeTab action
      }
    }, [tabs])

    // Handle tab switch
    const handleTabChange = useCallback(
      (tabId: string) => {
        switchTab(tabId)
      },
      [switchTab],
    )

    // Handle tab close
    const handleTabClose = useCallback(
      (tabId: string) => {
        const tab = tabs.find((t) => t.id === tabId)

        // Cancel any active stream
        if (tab?.conversationId) {
          cancelStream(tab.conversationId)
        }

        // Close tab (this will also update active tab if needed)
        closeTab(tabId)

        // Delete conversation state from memory
        if (tab?.conversationId) {
          deleteConversationState(tab.conversationId)
        }
      },
      [tabs, closeTab, cancelStream, deleteConversationState],
    )

    // Handle tabs reorder
    const handleTabsReorder = useCallback(
      (newTabs: any[]) => {
        const orderedTabIds = newTabs.map((tab) => tab.id)
        reorderTabs(orderedTabIds)
      },
      [reorderTabs],
    )

    // Convert chat tabs to draggable tabs format
    const draggableChatTabs = tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      closable: true,
      // Pass agent metadata for visual badge rendering
      agentId: tab.agentId,
      agentName: tab.agentName,
    }))

    return (
      <div className={cn('flex h-full flex-col', className)}>
        {/* Chat tabs header */}
        {showHeader && (
          <div className='relative z-50 flex items-center gap-2 bg-background pr-2 dark:bg-background-secondary'>
            {/* Tabs */}
            <div className='min-w-0 flex-1 overflow-hidden'>
              <DraggableTabs
                tabs={draggableChatTabs}
                activeTabId={activeTabId || undefined}
                onTabChange={handleTabChange}
                onTabClose={handleTabClose}
                onTabsReorder={handleTabsReorder}
                fontSize={13}
                isDark={isDark}
              />
            </div>

            {/* Action buttons */}
            <div className='flex flex-shrink-0 items-center gap-1'>
              {/* New Chat + Agent Selector */}
              <AgentSelectorDropdown
                workspaceId={activeWorkspaceId}
                userId={profile?.id || null}
                selectedAgentId={selectedAgentId}
                onAgentSelect={handleAgentSelect}
                onNewChat={handleNewChatClick}
                className='flex-shrink-0'
              />

              {/* History Button with dropdown */}
              <ConversationDropdown
                conversations={conversationList}
                currentConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onConversationDeleted={handleConversationDeleted}
                className='flex-shrink-0'
              />
            </div>
          </div>
        )}

        {/* Background title generation for newly-created conversations */}
        {pendingAutoTitle && (
          <ConversationTitleAutoGenerator
            conversationId={pendingAutoTitle.conversationId}
            onGenerated={(title) => {
              updateTab(pendingAutoTitle.tabId, { title })
              setPendingAutoTitle(null)
            }}
          />
        )}

        {/* Fetch active conversation metadata + messages when one is selected */}
        {activeWorkspaceId &&
          activeConversationId &&
          !activeConversationId.startsWith('temp_') && (
            <ConversationLoader
              workspaceId={activeWorkspaceId}
              conversationId={activeConversationId}
            />
          )}

        {/* Messages - using Chat component for better UI */}
        <div className='relative z-0 flex-1 overflow-hidden bg-background dark:bg-background-secondary'>
          {/* Pinned Execution Plan - from TodoWrite */}
          {pinnedExecutionPlan && (
            <PinnedExecutionPlan
              title={pinnedExecutionPlan.title}
              todos={pinnedExecutionPlan.todos}
              onClose={() => setPinnedExecutionPlan(null)}
            />
          )}

          {/* Chat Messages */}
          <Chat
            messages={chatMessages}
            isLoading={isStreaming}
            showTypingIndicator={isStreaming}
            onActionClick={onActionClick}
            onTapbackClick={onTapbackClick}
            onTagClick={onTagClick}
            onPermissionRespond={handlePermissionResponse}
            onAskUserQuestionRespond={handleAskUserQuestionResponse}
            className='h-full overflow-y-auto'
            containerClassName='h-full'
          />
        </div>

        {/* Enhanced Message Bar */}
        <div
          {...dropZoneProps}
          className='relative bg-background px-4 py-3 dark:bg-background-secondary'
          style={{
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}>
          <MessageBar
            messageBarId={messageBarId}
            onSubmit={handleSendMessage}
            autoFocus={autoFocus}
            showHelp={showHelp}
            initialText=''
            variant={variant}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    )
  },
)

ChatView.displayName = 'ChatView'
