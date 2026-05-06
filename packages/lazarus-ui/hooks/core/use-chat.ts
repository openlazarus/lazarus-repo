import { useCallback, useMemo, useRef, useState } from 'react'

import {
  Conversation,
  createConversation as createConversationModel,
} from '@/model/conversation'
import { Item } from '@/model/item'
import {
  createMessage,
  Message,
  MessageAction,
  SelectedAction,
} from '@/model/message'
import { Tag } from '@/model/tag'
import { useIdentity } from '@/state/identity'
import { useStore } from '@/state/store'
import { useUIState } from '@/state/ui-state'

/**
 * Hook for chat interactions with backend
 * Integrates all message management functionality directly
 */
export function useChat() {
  const { repository, items, tags, setTags, setItems } = useStore()
  const { profile } = useIdentity()
  const { activeConversationId } = useUIState()

  // Get messages from Store items instead of local state
  const messages = useMemo(() => {
    if (!activeConversationId) return []

    const filteredMessages = Object.values(items)
      .filter(
        (item): item is Message =>
          item.type === 'message' &&
          (item as Message).conversationId === activeConversationId,
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

    return filteredMessages
  }, [items, activeConversationId])

  // Get conversations from Store items instead of local state
  const conversations = useMemo(() => {
    return Object.values(items)
      .filter((item): item is Conversation => item.type === 'conversation')
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
  }, [items])

  const [loading, setLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Track the last loaded conversation to prevent unnecessary reloads
  const lastLoadedConversationId = useRef<string | null>(null)

  // Current conversation
  const currentConversation = useMemo(() => {
    if (!activeConversationId) return null
    return conversations.find((c) => c.id === activeConversationId) || null
  }, [activeConversationId, conversations])

  // Data is loaded by Store provider, no need to load again here

  // Create a new conversation
  const createConversation = useCallback(
    async (title?: string): Promise<Conversation> => {
      try {
        // Use the imported factory function with the partial data
        const newConversation = createConversationModel({
          title: title || 'New Conversation',
        })

        const savedConversation =
          await repository.saveItem<Conversation>(newConversation)

        // Update Store items
        setItems((prev) => ({
          ...prev,
          [savedConversation.id]: savedConversation,
        }))

        return savedConversation
      } catch (error) {
        console.error('Failed to create conversation:', error)
        throw error
      }
    },
    [repository, setItems],
  )

  // Create tags for a message
  const createTagsForMessage = useCallback(
    async (messageId: string, taggedItemIds: string[]): Promise<Tag[]> => {
      // Early return if profile is not available
      if (!profile?.id) {
        console.warn('Cannot create tags: profile not available')
        return []
      }

      try {
        const newTags: Tag[] = []

        for (const itemId of taggedItemIds) {
          // Get the target item to populate tag metadata
          const targetItem = await repository.getItemById(itemId)

          const tag: Tag = {
            id:
              Date.now().toString(36) + Math.random().toString(36).substring(2),
            sourceId: messageId,
            targetId: itemId,
            createdAt: new Date().toISOString(),
            taggedBy: profile.id,
            // Set type and displayText based on target item
            type: targetItem?.type as Tag['type'],
            displayText: targetItem?.name
              ? `@${targetItem.name}`
              : `@${targetItem?.type}-${itemId.slice(-4)}`,
          }

          const savedTag = await repository.saveTag(tag)
          newTags.push(savedTag)

          // Update local tags state
          setTags((prev) => ({
            ...prev,
            [savedTag.id]: savedTag,
          }))
        }

        return newTags
      } catch (error) {
        console.error(`Failed to create tags for message ${messageId}:`, error)
        return []
      }
    },
    [repository, profile?.id, setTags],
  )

  // Get all items tagged by a message
  const getTaggedItems = useCallback(
    async (messageId: string): Promise<Item[]> => {
      try {
        // Get tags where message is the source
        const messageTags = await repository.getTagsBySourceId(messageId)

        // Get the actual items
        const taggedItems: Item[] = []

        for (const tag of messageTags) {
          const item = await repository.getItemById(tag.targetId)

          if (item) {
            taggedItems.push(item)
          }
        }

        return taggedItems
      } catch (error) {
        console.error(
          `Failed to get tagged items for message ${messageId}:`,
          error,
        )
        return []
      }
    },
    [repository],
  )

  // Send a message
  const sendMessage = useCallback(
    async (
      content: string,
      taggedItemIds?: string[],
      conversationId?: string,
    ): Promise<Message> => {
      try {
        setSendingMessage(true)

        // Ensure we have a conversation
        let targetConversationId =
          conversationId || activeConversationId || undefined

        if (!targetConversationId) {
          const conversation = await createConversation()
          targetConversationId = conversation.id
        }

        // Create and save the user message first (without tags)
        const userMessage = createMessage({
          content,
          role: 'user',
          conversationId: targetConversationId,
          status: 'sending',
          taggedItems: [], // Will be populated after creating tags
        })

        const savedUserMessage = await repository.saveItem<Message>(userMessage)

        // Create tag connections and get the Tag objects
        let messageTags: Tag[] = []
        if (taggedItemIds && taggedItemIds.length > 0) {
          messageTags = await createTagsForMessage(
            savedUserMessage.id,
            taggedItemIds,
          )
        }

        // Update message with the actual Tag objects and set status to sent
        const updatedMessage = {
          ...savedUserMessage,
          status: 'sent' as const,
          taggedItems: messageTags,
        }

        const finalMessage = await repository.saveItem<Message>(updatedMessage)

        // Update Store items
        setItems((prev) => ({
          ...prev,
          [finalMessage.id]: finalMessage,
        }))

        // Update the last loaded conversation ID to prevent reload
        lastLoadedConversationId.current = finalMessage.conversationId

        return finalMessage
      } catch (error) {
        console.error('Failed to send message:', error)
        throw error
      } finally {
        setSendingMessage(false)
      }
    },
    [
      repository,
      activeConversationId,
      createConversation,
      createTagsForMessage,
      setItems,
    ],
  )

  // Receive a message from the backend (e.g., via websocket)
  const receiveMessage = useCallback(
    async (messageData: Partial<Message>): Promise<Message> => {
      try {
        // Ensure tagged items are preserved
        const taggedItems = messageData.taggedItems || []

        const newMessage = createMessage({
          ...messageData,
          role: messageData.role || 'agent', // Use 'agent' to match database schema
          status: 'received',
          taggedItems,
        })

        const savedMessage = await repository.saveItem<Message>(newMessage)

        // If there are tagged items, also create tag connections
        if (taggedItems.length > 0) {
          const taggedItemIds = taggedItems.map((tag) => tag.targetId)
          await createTagsForMessage(savedMessage.id, taggedItemIds)
        }

        // Update conversation's lastActivity
        if (savedMessage.conversationId) {
          const conversation = await repository.getItemById<Conversation>(
            savedMessage.conversationId,
          )

          if (conversation) {
            await repository.saveItem<Conversation>({
              ...conversation,
              updatedAt: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
            })
          }
        }

        // Update Store items
        setItems((prev) => ({
          ...prev,
          [savedMessage.id]: savedMessage,
        }))

        // Update the last loaded conversation ID to prevent reload
        lastLoadedConversationId.current = savedMessage.conversationId

        return savedMessage
      } catch (error) {
        console.error('Failed to receive message:', error)
        throw error
      }
    },
    [repository, createTagsForMessage, setItems],
  )

  // Handle action clicks from messages
  const handleMessageAction = useCallback(
    async (action: any, messageId?: string) => {
      try {
        console.log('Action clicked:', action, 'messageId:', messageId)

        // NOTE: File changes are now handled by backend via Claude SDK tools

        switch (action.type) {
          case 'accept':
            if (messageId) {
              console.log('Handling general accept action')
              const message = await repository.getItemById<Message>(messageId)
              if (message) {
                const updatedMessage = {
                  ...message,
                  reaction: 'accept' as const,
                  selectedAction: {
                    action,
                    selectedAt: new Date().toISOString(),
                    canRestore: true,
                  } as SelectedAction,
                }
                await repository.saveItem<Message>(updatedMessage)
                setItems((prev) => ({
                  ...prev,
                  [updatedMessage.id]: updatedMessage,
                }))
              }
            }
            break

          case 'reject':
            if (messageId) {
              const message = await repository.getItemById<Message>(messageId)
              if (message) {
                const updatedMessage = {
                  ...message,
                  reaction: 'reject' as const,
                  selectedAction: {
                    action,
                    selectedAt: new Date().toISOString(),
                    canRestore: true,
                  } as SelectedAction,
                }
                await repository.saveItem<Message>(updatedMessage)
                setItems((prev) => ({
                  ...prev,
                  [updatedMessage.id]: updatedMessage,
                }))
              }
            }
            break

          case 'option':
            // Handle generic options - mark as selected and could send a response
            if (messageId) {
              const message = await repository.getItemById<Message>(messageId)
              if (message) {
                const updatedMessage = {
                  ...message,
                  selectedAction: {
                    action,
                    selectedAt: new Date().toISOString(),
                    canRestore: false,
                  } as SelectedAction,
                }
                await repository.saveItem<Message>(updatedMessage)
                setItems((prev) => ({
                  ...prev,
                  [updatedMessage.id]: updatedMessage,
                }))
              }
            }

            // Also send a response for options
            if (activeConversationId) {
              await receiveMessage({
                content: `You selected: ${action.label}`,
                role: 'agent',
                conversationId: activeConversationId,
                taggedItems: [],
              })
            }
            break

          default:
            console.log('Unknown action type:', action.type)
        }
      } catch (error) {
        console.error('Failed to handle message action:', error)
      }
    },
    [receiveMessage, activeConversationId, repository, setItems],
  )

  // Force reload messages for current conversation
  const reloadMessages = useCallback(async () => {
    if (!activeConversationId) return

    try {
      setLoading(true)
      const allMessages = await repository.getAllItems<Message>('message')
      const conversationMessages = allMessages.filter(
        (message) => message.conversationId === activeConversationId,
      )

      // Sort by creation time
      conversationMessages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

      // Convert array to Record<string, Item> for setItems
      const messagesRecord = conversationMessages.reduce(
        (acc, message) => ({
          ...acc,
          [message.id]: message,
        }),
        {} as Record<string, Item>,
      )

      setItems((prev) => ({
        ...prev,
        ...messagesRecord,
      }))
      lastLoadedConversationId.current = activeConversationId
    } catch (error) {
      console.error('Failed to reload messages:', error)
    } finally {
      setLoading(false)
    }
  }, [activeConversationId, repository, setItems])

  // Custom action helpers with specific labels
  const customActions = {
    acceptAll: (data?: any): MessageAction => ({
      id: `accept-${Date.now()}`,
      type: 'accept',
      label: 'Accept',
      data,
    }),
    reject: (data?: any): MessageAction => ({
      id: `reject-${Date.now()}`,
      type: 'reject',
      label: 'Reject',
      data,
    }),
    option: (id: string, label: string, data?: any): MessageAction => ({
      id: `option-${id}-${Date.now()}`,
      type: 'option',
      label,
      data,
    }),
  }

  return {
    messages,
    conversations,
    currentConversation,
    loading,
    sendingMessage,
    createConversation,
    sendMessage,
    receiveMessage,
    getTaggedItems,
    reloadMessages,
    handleMessageAction,
  }
}
