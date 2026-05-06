'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  triggerAcceptAllChanges,
  triggerRejectAllChanges,
} from '@/hooks/features/document/use-document-edit'
import {
  getGlobalWorkflowState,
  useDocumentWorkflow,
} from '@/hooks/features/document/use-document-workflow'
import { useMindmapWorkflow } from '@/hooks/features/mindmap/use-mindmap-workflow'
import { Item } from '@/model/item'

import { ChatMessage, MessageTag } from '../types'
import {
  createActionMessage,
  createBackgroundActionMessage,
  createErrorMessage,
  createSelectedActionMessage,
  createTagMessage,
  createTextMessage,
} from '../utils/message-factory'

// Test scenarios
const TEST_SCENARIOS = [
  { id: 'error-message', label: 'Test error message' },
  { id: 'app-connection', label: 'Test app connection (app not connected)' },
  { id: 'sign-in-required', label: 'Test request to sign in to continue' },
  { id: 'quota-limit', label: 'Test quota limit (upgrade to Lazarus+)' },
  { id: 'pdf-conversion', label: 'Test document to PDF Conversion' },
  { id: 'document-editing', label: 'Test document creation and editing' },
  { id: 'mindmap-thinking', label: 'Think Deeply with Mind Maps' },
]

export interface UseMockChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (content: string, taggedItems?: Item[]) => Promise<void>
  selectAction: (messageId: string, actionId: string) => void
  revertAction: (messageId: string) => void
}

/**
 * Helper function to update background action status
 */
function updateBackgroundActionStatus(
  messages: ChatMessage[],
  status: 'executing' | 'success' | 'failed',
  description?: string,
): ChatMessage[] {
  const lastMessage = messages[messages.length - 1]
  if (lastMessage.variant.type === 'background-action') {
    return [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        variant: {
          ...lastMessage.variant,
          status,
          ...(description && { description }),
        },
      },
    ]
  }
  return messages
}

/**
 * useMockChat - Simplified hook for testing chat scenarios
 * Now using the new variant-based message system
 */
export function useMockChat(): UseMockChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const messageCount = useRef(0)

  // Add document workflow hook
  const documentWorkflow = useDocumentWorkflow()

  // Add mindmap workflow hook
  const mindmapWorkflow = useMindmapWorkflow()

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = createTextMessage(
      'assistant',
      "Hello Lazarus team! Please select which scenario you'd like to test:",
    )

    const actionMessage = createActionMessage(TEST_SCENARIOS)

    setMessages([welcomeMessage, actionMessage])
  }, [])

  // Convert Item to MessageTag
  const itemToMessageTag = (item: Item): MessageTag => {
    return {
      id: item.id,
      type: item.type as 'app' | 'file' | 'conversation',
      name: item.name,
      title: (item as any).title,
      icon: item.icon,
      preview: (item as any).preview,
      fileType: (item as any).fileType,
      app_type: (item as any).app_type,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    }
  }

  // Handle scenario responses
  const handleScenarioResponse = useCallback(
    async (scenario: string, userMessage: string, taggedItems?: Item[]) => {
      setIsLoading(true)

      // Simulate typing delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      let responseMessages: ChatMessage[] = []

      switch (scenario) {
        case 'error-message':
          // Return an error message
          responseMessages = [
            createErrorMessage(
              'Failed to process your request. Please try again.',
              true,
            ),
          ]
          break

        case 'app-connection':
          // Check if message contains app tag or has tagged apps
          const hasAppTag =
            userMessage.toLowerCase().includes('@app') ||
            userMessage.includes('#app') ||
            (taggedItems && taggedItems.some((item) => item.type === 'app'))

          if (!hasAppTag) {
            responseMessages = [
              createTextMessage(
                'assistant',
                'Please tag an app using @ or # to test the app connection scenario.',
              ),
            ]
          } else {
            // Find the app name if tagged
            const taggedApp = taggedItems?.find((item) => item.type === 'app')
            const appName = taggedApp ? taggedApp.name : 'the app'

            responseMessages = [
              createTextMessage(
                'assistant',
                `I noticed you mentioned ${appName}. To use ${appName} with Lazarus, you'll need to connect it first.`,
              ),
              createActionMessage([
                {
                  id: 'connect-app',
                  label: `Connect ${appName}`,
                  type: 'option',
                },
                {
                  id: 'continue-without',
                  label: 'Continue without connecting',
                  type: 'option',
                },
              ]),
            ]
          }
          break

        case 'sign-in-required':
          messageCount.current += 1
          if (messageCount.current >= 3) {
            responseMessages = [
              createTextMessage(
                'assistant',
                "You've reached the message limit for anonymous users. Please sign in to continue chatting with unlimited messages.",
              ),
              createActionMessage([
                { id: 'sign-in', label: 'Sign in to continue', type: 'option' },
                {
                  id: 'learn-more',
                  label: 'Learn more about Lazarus',
                  type: 'option',
                },
              ]),
            ]
          } else {
            responseMessages = [
              createTextMessage(
                'assistant',
                `Message ${messageCount.current} of 3 for anonymous users. ${3 - messageCount.current} messages remaining before sign-in is required.`,
              ),
            ]
          }
          break

        case 'quota-limit':
          responseMessages = [
            createTextMessage(
              'assistant',
              "You've reached your monthly quota limit. Upgrade to Lazarus+ for unlimited messages and premium features.",
            ),
            createActionMessage([
              {
                id: 'upgrade-now',
                label: 'Upgrade to Lazarus+',
                type: 'option',
              },
              { id: 'view-plans', label: 'View Plans', type: 'option' },
            ]),
          ]
          break

        case 'pdf-conversion':
          // Check if there are any file tags
          const hasFileTag =
            taggedItems && taggedItems.some((item) => item.type === 'file')

          if (hasFileTag) {
            const taggedFile = taggedItems?.find((item) => item.type === 'file')
            responseMessages = [
              createTextMessage(
                'assistant',
                `I'll help you convert "${taggedFile?.name}" to PDF. Processing now...`,
              ),
              createBackgroundActionMessage('converting to PDF'),
            ]

            // Simulate progress and completion
            setTimeout(async () => {
              // Wait 2 seconds then mark as complete
              await new Promise((resolve) => setTimeout(resolve, 2000))
              setMessages((prev) =>
                updateBackgroundActionStatus(
                  prev,
                  'success',
                  'Conversion complete!',
                ),
              )

              const completeMessage = createTextMessage(
                'assistant',
                `Successfully converted "${taggedFile?.name}" to PDF!`,
              )
              setMessages((prev) => [...prev, completeMessage])
            }, 100)
          } else {
            responseMessages = [
              createTextMessage(
                'assistant',
                'I can help you convert documents to PDF. Please select the type of conversion you need:',
              ),
              createActionMessage([
                {
                  id: 'convert-word',
                  label: 'Convert Word to PDF',
                  type: 'option',
                },
                {
                  id: 'convert-excel',
                  label: 'Convert Excel to PDF',
                  type: 'option',
                },
                {
                  id: 'convert-image',
                  label: 'Convert Images to PDF',
                  type: 'option',
                },
                {
                  id: 'convert-html',
                  label: 'Convert HTML to PDF',
                  type: 'option',
                },
              ]),
            ]
          }
          break

        case 'document-editing':
          responseMessages = [
            createTextMessage(
              'assistant',
              `Perfect! I'll demonstrate document creation and editing. First, I'll create a new document for you.`,
            ),
            createBackgroundActionMessage('creating document', 'executing'),
          ]

          // Use the document workflow to actually create a document
          setTimeout(async () => {
            try {
              // Wait 1.5 seconds then try to create document
              await new Promise((resolve) => setTimeout(resolve, 1500))

              // Actually create the document using the workflow
              const newDocument = await documentWorkflow.createNewDocument()

              if (newDocument) {
                // Update to success
                setMessages((prev) =>
                  updateBackgroundActionStatus(
                    prev,
                    'success',
                    'Document created!',
                  ),
                )

                // Open the document in a tab (desktop only)
                await documentWorkflow.openDocumentInTab(newDocument)

                const documentCreatedMessage = createTextMessage(
                  'assistant',
                  `Document "${newDocument.name}" created successfully! ${documentWorkflow.state.currentDocument ? "I've opened it in a new tab and added some sample content." : "I've created it with sample content."} Now, let me show you how editing works.`,
                )
                setMessages((prev) => [...prev, documentCreatedMessage])
              } else {
                // Update to failed
                setMessages((prev) =>
                  updateBackgroundActionStatus(
                    prev,
                    'failed',
                    'Failed to create document',
                  ),
                )
                const errorMessage = createErrorMessage(
                  'Failed to create document. Please try again.',
                  true,
                )
                setMessages((prev) => [...prev, errorMessage])
                return
              }

              // Wait a moment then ask for edit request
              setTimeout(() => {
                const editRequestMessage = createTextMessage(
                  'assistant',
                  `Try requesting an edit! For example, you could ask me to:`,
                )
                const editOptionsMessage = createActionMessage([
                  {
                    id: 'edit-title',
                    label: 'Change the document title',
                    type: 'option',
                  },
                  {
                    id: 'add-section',
                    label: 'Add a new section',
                    type: 'option',
                  },
                  {
                    id: 'fix-grammar',
                    label: 'Fix grammar and style',
                    type: 'option',
                  },
                  {
                    id: 'custom-edit',
                    label: 'Make a custom edit request',
                    type: 'option',
                  },
                ])
                setMessages((prev) => [
                  ...prev,
                  editRequestMessage,
                  editOptionsMessage,
                ])
              }, 1500)
            } catch (error) {
              setMessages((prev) =>
                updateBackgroundActionStatus(
                  prev,
                  'failed',
                  'Something went wrong',
                ),
              )
              const errorMessage = createErrorMessage(
                'Something went wrong during document creation. Please try again.',
                true,
              )
              setMessages((prev) => [...prev, errorMessage])
            }
          }, 100)
          break

        case 'mindmap-thinking':
          responseMessages = [
            createTextMessage(
              'assistant',
              `Perfect! I'll help you design a comprehensive university essay structure using visual mind mapping. This approach helps you organize complex academic arguments, identify key themes, and create a logical flow for your paper.`,
            ),
            createActionMessage([
              {
                id: 'essay-structure',
                label: 'Design a university essay structure',
                type: 'option',
              },
            ]),
          ]
          break
      }

      // Handle tagged items in general responses
      if (!scenario && taggedItems && taggedItems.length > 0) {
        const itemNames = taggedItems.map((item) => item.name).join(', ')
        responseMessages = [
          createTextMessage(
            'assistant',
            `I see you've shared ${taggedItems.length} item${taggedItems.length > 1 ? 's' : ''}: ${itemNames}. How can I help you with ${taggedItems.length > 1 ? 'these' : 'this'}?`,
          ),
        ]
      }

      // Handle custom edit requests for document editing scenario
      if (selectedScenario === 'document-editing' && userMessage && !scenario) {
        // This is a custom edit request
        responseMessages = [
          createTextMessage(
            'assistant',
            `I'll apply your custom edit request: "${userMessage}"`,
          ),
          createBackgroundActionMessage('processing your edit', 'executing'),
        ]

        // Simulate custom edit processing
        setTimeout(async () => {
          try {
            await documentWorkflow.simulateEdit('custom')

            // Wait 2 seconds then complete
            await new Promise((resolve) => setTimeout(resolve, 2000))
            setMessages((prev) =>
              updateBackgroundActionStatus(
                prev,
                'success',
                'Custom edit complete!',
              ),
            )

            const editCompleteMessage = createTextMessage(
              'assistant',
              `Custom edit applied successfully! ${getGlobalWorkflowState().showDiff ? 'You can see the changes in the diff view with your requested modifications highlighted.' : 'Your requested changes have been applied to the document.'} You can accept, reject, or modify individual changes as needed.`,
            )
            setMessages((prev) => [...prev, editCompleteMessage])

            // Add accept/reject all options when diff is available with a small delay
            setTimeout(() => {
              const globalState = getGlobalWorkflowState()
              if (globalState.showDiff) {
                const diffActionsMessage = createActionMessage([
                  {
                    id: 'accept-all-changes',
                    label: 'Accept All Changes',
                    type: 'option',
                  },
                  {
                    id: 'reject-all-changes',
                    label: 'Reject All Changes',
                    type: 'option',
                  },
                  {
                    id: 'review-individually',
                    label: 'Review Changes Individually',
                    type: 'option',
                  },
                ])
                setMessages((prev) => [...prev, diffActionsMessage])
              } else {
              }
            }, 100)
          } catch (error) {
            setMessages((prev) =>
              updateBackgroundActionStatus(
                prev,
                'failed',
                'Failed to apply edit',
              ),
            )
            const errorMessage = createErrorMessage(
              'Failed to apply custom edit. Please try again.',
              true,
            )
            setMessages((prev) => [...prev, errorMessage])
          }
        }, 100)
      }

      // Handle custom mindmap creation and editing requests
      if (selectedScenario === 'mindmap-thinking' && userMessage && !scenario) {
        // Check if we have a current mindmap (for editing) or need to create one
        if (mindmapWorkflow.state.currentMindmap) {
          // This is a mindmap edit request
          responseMessages = [
            createTextMessage(
              'assistant',
              `I'll apply your changes to the essay structure mind map: "${userMessage}"`,
            ),
            createBackgroundActionMessage('updating mind map', 'executing'),
          ]

          // Simulate mindmap editing
          setTimeout(async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            setMessages((prev) =>
              updateBackgroundActionStatus(
                prev,
                'success',
                'Mind map updated!',
              ),
            )

            const editCompleteMessage = createTextMessage(
              'assistant',
              `Essay structure mind map updated successfully! Your requested changes have been applied:\n\n• ${userMessage}\n\nThe visual structure has been reorganized with auto-layout to maintain clarity. You can continue editing or export the final version.`,
            )

            const nextActionsMessage = createActionMessage([
              {
                id: 'make-another-edit',
                label: 'Make another edit',
                type: 'option',
              },
              {
                id: 'export-mindmap',
                label: 'Export mind map',
                type: 'option',
              },
              {
                id: 'design-new-essay',
                label: 'Design a new essay structure',
                type: 'option',
              },
            ])

            setMessages((prev) => [
              ...prev,
              editCompleteMessage,
              nextActionsMessage,
            ])
          }, 100)
        } else {
          // User is trying to create a custom essay structure
          responseMessages = [
            createTextMessage(
              'assistant',
              `To design an essay structure, please select "Design an essay structure" from the options above. This will create a visual mind map to help you organize your essay.`,
            ),
          ]
        }
      }

      if (responseMessages.length > 0) {
        setMessages((prev) => [...prev, ...responseMessages])
      }

      setIsLoading(false)
    },
    [
      documentWorkflow,
      mindmapWorkflow.state.currentMindmap,
      mindmapWorkflow,
      selectedScenario,
    ],
  )

  // Send a message
  const sendMessage = useCallback(
    async (content: string, taggedItems?: Item[]) => {
      if (!content.trim() || isLoading) return

      // Use the same timestamp for all messages sent together
      const timestamp = new Date()

      // Create user message with the shared timestamp
      const userMessage = createTextMessage('user', content.trim())
      userMessage.timestamp = timestamp

      // Create a single tag message for all tagged items (if any)
      const tagMessages: ChatMessage[] = []
      if (taggedItems && taggedItems.length > 0) {
        const messageTags = taggedItems.map(itemToMessageTag)

        // Create a single tag message with all tags
        const tagMessage = createTagMessage(messageTags[0], 'user')
        // Add all tags to the variant (properly typed)
        if (tagMessage.variant.type === 'tag') {
          tagMessage.variant = {
            ...tagMessage.variant,
            tags: messageTags,
          }
        }
        tagMessage.timestamp = timestamp
        tagMessages.push(tagMessage)
      }

      // Add all messages (tags first, then text)
      setMessages((prev) => [...prev, ...tagMessages, userMessage])

      // If a scenario is selected, handle the response
      if (selectedScenario) {
        await handleScenarioResponse(selectedScenario, content, taggedItems)
      } else if (taggedItems && taggedItems.length > 0) {
        // If no scenario but has tagged items, provide a response
        await handleScenarioResponse('', content, taggedItems)
      } else {
        // No scenario selected, remind user to select one
        setIsLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const reminderMessage = createTextMessage(
          'assistant',
          'Please select a test scenario from the options above to continue.',
        )

        setMessages((prev) => [...prev, reminderMessage])
        setIsLoading(false)
      }
    },
    [isLoading, selectedScenario, handleScenarioResponse],
  )

  // Handle action selection
  const selectAction = useCallback(
    async (messageId: string, actionId: string) => {
      // Find the message and action
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      const message = messages[messageIndex]

      if (!message || message.variant.type !== 'action') return

      const action = message.variant.actions.find((a) => a.id === actionId)
      if (!action) return

      // Mark the action as selected in the original message
      setMessages((prev) =>
        prev.map((msg, idx) => {
          if (idx === messageIndex && msg.variant.type === 'action') {
            return {
              ...msg,
              variant: {
                ...msg.variant,
                selectedActionId: actionId,
              },
            }
          }
          return msg
        }),
      )

      // Check if this is a test scenario selection
      const isScenarioSelection = TEST_SCENARIOS.some((s) => s.id === actionId)

      if (isScenarioSelection) {
        setSelectedScenario(actionId)

        // Reset message count for sign-in scenario
        if (actionId === 'sign-in-required') {
          messageCount.current = 0
        }
      }

      // Create a user message for the selected action
      const userActionMessage = createSelectedActionMessage(
        action.label,
        messageId,
      )

      setMessages((prev) => [...prev, userActionMessage])

      // Add AI response after action selection
      if (isScenarioSelection) {
        setIsLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        const scenario = TEST_SCENARIOS.find((s) => s.id === actionId)
        let confirmMessage: ChatMessage

        // Provide specific instructions based on the scenario
        switch (actionId) {
          case 'app-connection':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". To test this, tag an app using @ or # (e.g., @Slack, @Gmail, @Notion) and I'll show you the connection flow.`,
            )
            break
          case 'pdf-conversion':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". To test this, tag a file using @ or # (e.g., @report.docx, @presentation.pptx) and I'll demonstrate the PDF conversion process.`,
            )
            break
          case 'sign-in-required':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". Send me a few messages and I'll show you what happens when anonymous users reach their message limit.`,
            )
            break
          case 'error-message':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". Send me any message and I'll demonstrate how error states are handled in the chat.`,
            )
            break
          case 'quota-limit':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". Send me a message and I'll show you the upgrade prompt that appears when users hit their quota.`,
            )
            break
          case 'document-editing':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". I'll demonstrate the full document creation and editing workflow - from creating a new document, opening it in a tab (on desktop), adding content, and then showing how AI-powered editing works with visual diff comparisons.`,
            )
            break
          case 'mindmap-thinking':
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". I'll demonstrate how AI can help design sophisticated university essay structures through visual mind mapping. This approach helps organize complex academic arguments, identify research gaps, and create logical flow from introduction to conclusion - perfect for academic writing at the university level.`,
            )
            break
          default:
            confirmMessage = createTextMessage(
              'assistant',
              `Great! You've selected "${scenario?.label}". Send me a message to test this scenario.`,
            )
        }

        setMessages((prev) => [...prev, confirmMessage])
        setIsLoading(false)
      } else {
        // Handle other action responses
        setIsLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Handle specific action responses
        if (actionId === 'sign-in') {
          const signInMessage = createTextMessage(
            'assistant',
            'Redirecting you to sign in... (In a real app, this would open the sign-in modal or redirect to the sign-in page)',
          )
          setMessages((prev) => [...prev, signInMessage])
        } else if (actionId === 'learn-more') {
          const learnMoreMessage = createTextMessage(
            'assistant',
            'Lazarus is your AI-powered workspace that helps you organize, search, and interact with all your digital content. Sign up to get unlimited messages, file uploads, app integrations, and more!',
          )
          setMessages((prev) => [...prev, learnMoreMessage])
        } else if (actionId === 'connect-app') {
          const connectMessage = createTextMessage(
            'assistant',
            'Redirecting you to connect the app... (In a real app, this would open the app connection/OAuth flow)',
          )
          setMessages((prev) => [...prev, connectMessage])
        } else if (actionId === 'continue-without') {
          const continueMessage = createTextMessage(
            'assistant',
            'No problem! You can always connect apps later from your settings. For now, I can help you with other tasks or you can try a different scenario.',
          )
          setMessages((prev) => [...prev, continueMessage])
        } else if (actionId === 'upgrade-now') {
          const upgradeMessage = createTextMessage(
            'assistant',
            'Redirecting you to upgrade... (In a real app, this would open the pricing/upgrade page)',
          )
          setMessages((prev) => [...prev, upgradeMessage])
        } else if (actionId === 'view-plans') {
          const plansMessage = createTextMessage(
            'assistant',
            'Here are our plans:\n\n**Lazarus Free**: 100 messages/month, basic features\n**Lazarus+**: $19/month - Unlimited messages, all app integrations, priority support\n**Lazarus Pro**: $49/month - Everything in Plus + API access, custom workflows',
          )
          setMessages((prev) => [...prev, plansMessage])
        } else if (actionId.includes('convert')) {
          // Show progress for conversion actions
          const backgroundAction = createBackgroundActionMessage(
            'converting document',
            'executing',
          )
          setMessages((prev) => [...prev, backgroundAction])

          // Simulate completion
          setTimeout(async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            setMessages((prev) =>
              updateBackgroundActionStatus(
                prev,
                'success',
                'Conversion complete!',
              ),
            )

            const completeMessage = createTextMessage(
              'assistant',
              `Successfully converted your document to PDF!`,
            )
            setMessages((prev) => [...prev, completeMessage])
          }, 100)
        } else if (actionId === 'edit-title') {
          const backgroundAction = createBackgroundActionMessage(
            'editing document title',
            'executing',
          )
          setMessages((prev) => [...prev, backgroundAction])

          // Use document workflow to simulate the edit
          setTimeout(async () => {
            try {
              // Simulate the edit using the workflow
              await documentWorkflow.simulateEdit('edit-title')

              // Wait then complete
              await new Promise((resolve) => setTimeout(resolve, 2000))
              setMessages((prev) =>
                updateBackgroundActionStatus(prev, 'success', 'Edit complete!'),
              )

              const editCompleteMessage = createTextMessage(
                'assistant',
                `Document title updated! ${getGlobalWorkflowState().showDiff ? 'You can see the changes highlighted in the diff view in the document tab.' : 'The changes have been applied to the document.'} You can accept or reject individual changes, or accept all changes at once.`,
              )
              setMessages((prev) => [...prev, editCompleteMessage])

              // Add accept/reject all options when diff is available with a small delay
              setTimeout(() => {
                const globalState = getGlobalWorkflowState()
                if (globalState.showDiff) {
                  const diffActionsMessage = createActionMessage([
                    {
                      id: 'accept-all-changes',
                      label: 'Accept All Changes',
                      type: 'option',
                    },
                    {
                      id: 'reject-all-changes',
                      label: 'Reject All Changes',
                      type: 'option',
                    },
                    {
                      id: 'review-individually',
                      label: 'Review Changes Individually',
                      type: 'option',
                    },
                  ])
                  setMessages((prev) => [...prev, diffActionsMessage])
                } else {
                }
              }, 100)
            } catch (error) {
              setMessages((prev) =>
                updateBackgroundActionStatus(
                  prev,
                  'failed',
                  'Failed to edit document',
                ),
              )
              const errorMessage = createErrorMessage(
                'Failed to edit document. Please try again.',
                true,
              )
              setMessages((prev) => [...prev, errorMessage])
            }
          }, 100)
        } else if (actionId === 'add-section') {
          const backgroundAction = createBackgroundActionMessage(
            'adding new section',
            'executing',
          )
          setMessages((prev) => [...prev, backgroundAction])

          setTimeout(async () => {
            try {
              await documentWorkflow.simulateEdit('add-section')

              await new Promise((resolve) => setTimeout(resolve, 2000))
              setMessages((prev) =>
                updateBackgroundActionStatus(prev, 'success', 'Section added!'),
              )

              const editCompleteMessage = createTextMessage(
                'assistant',
                `New section added to the document! ${getGlobalWorkflowState().showDiff ? 'The changes are shown in the diff view with additions highlighted in green.' : 'The new section has been added to the document.'}`,
              )
              setMessages((prev) => [...prev, editCompleteMessage])

              // Add accept/reject all options when diff is available with a small delay
              setTimeout(() => {
                const globalState = getGlobalWorkflowState()
                if (globalState.showDiff) {
                  const diffActionsMessage = createActionMessage([
                    {
                      id: 'accept-all-changes',
                      label: 'Accept All Changes',
                      type: 'option',
                    },
                    {
                      id: 'reject-all-changes',
                      label: 'Reject All Changes',
                      type: 'option',
                    },
                    {
                      id: 'review-individually',
                      label: 'Review Changes Individually',
                      type: 'option',
                    },
                  ])
                  setMessages((prev) => [...prev, diffActionsMessage])
                } else {
                }
              }, 100)
            } catch (error) {
              setMessages((prev) =>
                updateBackgroundActionStatus(
                  prev,
                  'failed',
                  'Failed to add section',
                ),
              )
              const errorMessage = createErrorMessage(
                'Failed to add section. Please try again.',
                true,
              )
              setMessages((prev) => [...prev, errorMessage])
            }
          }, 100)
        } else if (actionId === 'fix-grammar') {
          const backgroundAction = createBackgroundActionMessage(
            'fixing grammar and style',
            'executing',
          )
          setMessages((prev) => [...prev, backgroundAction])

          setTimeout(async () => {
            try {
              await documentWorkflow.simulateEdit('fix-grammar')

              await new Promise((resolve) => setTimeout(resolve, 2000))
              setMessages((prev) =>
                updateBackgroundActionStatus(prev, 'success', 'Grammar fixed!'),
              )

              const editCompleteMessage = createTextMessage(
                'assistant',
                `Grammar and style improvements applied! ${getGlobalWorkflowState().showDiff ? 'Multiple changes are highlighted in the diff view showing the before and after versions.' : 'The improvements have been applied to the document.'}`,
              )
              setMessages((prev) => [...prev, editCompleteMessage])

              // Add accept/reject all options when diff is available with a small delay
              setTimeout(() => {
                const globalState = getGlobalWorkflowState()
                if (globalState.showDiff) {
                  const diffActionsMessage = createActionMessage([
                    {
                      id: 'accept-all-changes',
                      label: 'Accept All Changes',
                      type: 'option',
                    },
                    {
                      id: 'reject-all-changes',
                      label: 'Reject All Changes',
                      type: 'option',
                    },
                    {
                      id: 'review-individually',
                      label: 'Review Changes Individually',
                      type: 'option',
                    },
                  ])
                  setMessages((prev) => [...prev, diffActionsMessage])
                } else {
                }
              }, 100)
            } catch (error) {
              setMessages((prev) =>
                updateBackgroundActionStatus(
                  prev,
                  'failed',
                  'Failed to fix grammar',
                ),
              )
              const errorMessage = createErrorMessage(
                'Failed to fix grammar. Please try again.',
                true,
              )
              setMessages((prev) => [...prev, errorMessage])
            }
          }, 100)
        } else if (actionId === 'custom-edit') {
          const customEditMessage = createTextMessage(
            'assistant',
            `Great! For a custom edit, just type your request in natural language. For example:\n\n• "Make the tone more professional"\n• "Add bullet points to the key features section"\n• "Shorten the introduction paragraph"\n• "Fix any spelling errors"\n\nWhat would you like me to edit?`,
          )
          setMessages((prev) => [...prev, customEditMessage])
        } else if (actionId === 'essay-structure') {
          // Handle essay structure mindmap creation
          const mindmapTopic = 'Climate Change and Environmental Policy'

          const creatingMessage = createTextMessage(
            'assistant',
            `Perfect! I'll create a comprehensive university essay structure for "${mindmapTopic}". This mind map will help you organize your academic arguments, evidence, and flow.`,
          )
          setMessages((prev) => [...prev, creatingMessage])

          // Simulate creation using workflow
          setTimeout(async () => {
            // Create the mindmap using the workflow
            const newMindmap =
              await mindmapWorkflow.createNewMindmap(mindmapTopic)

            if (newMindmap) {
              // Open the mindmap in a tab (desktop only)
              await mindmapWorkflow.openMindmapInTab(newMindmap)

              const completeMessage = createTextMessage(
                'assistant',
                `University essay structure created! I've designed a comprehensive mind map with:\n\n- **Introduction** - Hook, thesis, and roadmap\n- **Literature Review** - Theoretical framework and research gap\n- **Methodology** - Research design and ethical considerations\n- **Analysis** - Key findings and critical discussion\n- **Conclusion** - Implications and future research\n\nEach section includes detailed subsections to guide your writing process. You can now expand, modify, or reorganize any part of the structure.`,
              )

              const nextActionsMessage = createActionMessage([
                {
                  id: 'edit-mindmap-structure',
                  label: 'Modify the structure',
                  type: 'option',
                },
                {
                  id: 'add-mindmap-branch',
                  label: 'Add more sections',
                  type: 'option',
                },
                {
                  id: 'change-mindmap-style',
                  label: 'Change visual style',
                  type: 'option',
                },
                {
                  id: 'export-mindmap',
                  label: 'Export mind map',
                  type: 'option',
                },
              ])

              setMessages((prev) => [
                ...prev,
                completeMessage,
                nextActionsMessage,
              ])
            } else {
              const errorMessage = createErrorMessage(
                'Failed to create mind map. Please try again.',
                true,
              )
              setMessages((prev) => [...prev, errorMessage])
            }
          }, 100)
        } else if (actionId === 'edit-mindmap-structure') {
          const editStructureMessage = createTextMessage(
            'assistant',
            `I can help you modify the mind map structure. What changes would you like to make? For example:\n\n• "Remove the Ethics branch from Challenges"\n• "Combine Benefits and Future into one section"\n• "Add more detail to the Planning phase"\n• "Simplify the overall structure"\n\nDescribe your desired changes:`,
          )
          setMessages((prev) => [...prev, editStructureMessage])
        } else if (actionId === 'add-mindmap-branch') {
          const addBranchMessage = createTextMessage(
            'assistant',
            `Where would you like to add a new branch? Please specify:\n\n• The parent node (e.g., "Add to Benefits section")\n• The new branch name (e.g., "Cost Reduction")\n• Any sub-branches if needed\n\nFor example: "Add 'Environmental Impact' branch under 'Future Implications' with sub-items 'Carbon Footprint' and 'Sustainability'"`,
          )
          setMessages((prev) => [...prev, addBranchMessage])
        } else if (actionId === 'change-mindmap-style') {
          const styleMessage = createTextMessage(
            'assistant',
            `I can change the visual style of your mind map. Choose a style:`,
          )
          const styleOptionsMessage = createActionMessage([
            {
              id: 'style-minimal',
              label: 'Minimal & Clean',
              type: 'option',
            },
            {
              id: 'style-colorful',
              label: 'Vibrant & Colorful',
              type: 'option',
            },
            {
              id: 'style-professional',
              label: 'Professional & Corporate',
              type: 'option',
            },
            {
              id: 'style-creative',
              label: 'Creative & Playful',
              type: 'option',
            },
          ])
          setMessages((prev) => [...prev, styleMessage, styleOptionsMessage])
        } else if (actionId === 'export-mindmap') {
          const exportMessage = createTextMessage(
            'assistant',
            `Exporting mind map as image... (In a real app, this would generate a high-resolution PNG or SVG file of your mind map)`,
          )
          setMessages((prev) => [...prev, exportMessage])
        } else if (actionId.startsWith('style-')) {
          const styleName = actionId.replace('style-', '')
          const applyingStyleMessage = createBackgroundActionMessage(
            `applying ${styleName} style`,
            'executing',
          )
          setMessages((prev) => [...prev, applyingStyleMessage])

          setTimeout(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1500))
            setMessages((prev) =>
              updateBackgroundActionStatus(prev, 'success', 'Style applied!'),
            )

            const styleCompleteMessage = createTextMessage(
              'assistant',
              `Mind map style updated to "${styleName}"! The visual appearance has been refreshed with new colors and styling while maintaining the same structure.`,
            )
            setMessages((prev) => [...prev, styleCompleteMessage])
          }, 100)
        } else if (actionId === 'accept-all-changes') {
          const acceptAllMessage = createTextMessage(
            'assistant',
            'All changes have been accepted! The document has been updated with all the suggested modifications.',
          )
          setMessages((prev) => [...prev, acceptAllMessage])

          // Trigger accept all changes in the editor
          triggerAcceptAllChanges()
        } else if (actionId === 'reject-all-changes') {
          const rejectAllMessage = createTextMessage(
            'assistant',
            'All changes have been rejected. The document remains in its original state.',
          )
          setMessages((prev) => [...prev, rejectAllMessage])

          // Trigger reject all changes in the editor
          triggerRejectAllChanges()
        } else if (actionId === 'review-individually') {
          const reviewMessage = createTextMessage(
            'assistant',
            `Perfect! You can now review each change individually in the document. Use ⌘Y to accept or ⌘N to reject highlighted changes. Click on any highlighted text to focus on it, then use the keyboard shortcuts.`,
          )
          setMessages((prev) => [...prev, reviewMessage])
        } else if (actionId === 'make-another-edit') {
          const anotherEditMessage = createTextMessage(
            'assistant',
            `What else would you like to change in the mind map? You can:\n\n• Add or remove branches\n• Rename nodes\n• Reorganize the structure\n• Change connections\n• Modify the hierarchy\n\nDescribe your changes:`,
          )
          setMessages((prev) => [...prev, anotherEditMessage])
        } else if (actionId === 'design-new-essay') {
          // Reset the current mindmap
          mindmapWorkflow.resetWorkflow()

          const newEssayMessage = createTextMessage(
            'assistant',
            `Let's design a new essay structure! I'll create another mind map to help you organize your thoughts.`,
          )
          const essayOptionsMessage = createActionMessage([
            {
              id: 'essay-structure',
              label: 'Design an essay structure',
              type: 'option',
            },
          ])
          setMessages((prev) => [...prev, newEssayMessage, essayOptionsMessage])
        } else {
          const responseMessage = createTextMessage(
            'assistant',
            `You selected "${action.label}". Processing your request...`,
          )
          setMessages((prev) => [...prev, responseMessage])
        }

        setIsLoading(false)
      }
    },
    [messages],
  )

  // Handle action revert
  const revertAction = useCallback(
    async (messageId: string) => {
      // Find the action selection message
      const messageIndex = messages.findIndex((m) => m.id === messageId)
      const actionMessage = messages[messageIndex]

      if (!actionMessage || actionMessage.variant.type !== 'selected-action')
        return

      // Find the original action message that was selected
      const originalMessageId = actionMessage.variant.originalMessageId

      // Reset the selectedActionId on the original action message
      setMessages((prev) => {
        // First, reset the action message
        const updatedMessages = prev.map((msg) => {
          if (msg.id === originalMessageId && msg.variant.type === 'action') {
            return {
              ...msg,
              variant: {
                ...msg.variant,
                selectedActionId: null,
              },
            }
          }
          return msg
        })

        // Then remove the selected action message and any messages after it
        return updatedMessages.slice(0, messageIndex)
      })

      // No feedback message - just revert silently
    },
    [messages, documentWorkflow, mindmapWorkflow],
  )

  return {
    messages,
    isLoading,
    sendMessage,
    selectAction,
    revertAction,
  }
}
