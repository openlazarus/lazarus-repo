'use client'

import { useEffect } from 'react'

import { useGenerateConversationTitle } from '@/hooks/features/conversation/use-generate-conversation-title'

interface ConversationTitleAutoGeneratorProps {
  conversationId: string
  delayMs?: number
  onGenerated: (title: string) => void
}

/**
 * One-shot child component: instantiates `useGenerateConversationTitle`
 * for a fresh conversation id, fires the request after a delay (so the
 * conversation has accumulated some content), and reports the generated
 * title up. Renders nothing.
 */
export const ConversationTitleAutoGenerator = ({
  conversationId,
  delayMs = 5000,
  onGenerated,
}: ConversationTitleAutoGeneratorProps) => {
  const [generateTitle] = useGenerateConversationTitle(conversationId)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await generateTitle()
        if (data?.title) onGenerated(data.title)
      } catch (err) {
        console.log(
          '[ConversationTitleAutoGenerator] Title generation skipped:',
          err instanceof Error ? err.message : 'Unknown error',
        )
      }
    }, delayMs)
    return () => clearTimeout(timer)
  }, [generateTitle, onGenerated, delayMs])

  return null
}
