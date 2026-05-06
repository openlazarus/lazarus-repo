import { useCallback, useState } from 'react'

interface UseCopyToClipboardOptions {
  timeout?: number
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UseCopyToClipboardReturn {
  isCopied: boolean
  copyToClipboard: (text: string) => Promise<void>
  resetCopiedState: () => void
}

/**
 * Hook for copying text to clipboard with feedback
 * @param options - Configuration options
 * @returns Object with copy function and state
 */
export const useCopyToClipboard = (
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn => {
  const { timeout = 2000, onSuccess, onError } = options
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        // Check if the Clipboard API is available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea')
          textArea.value = text
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()

          const successful = document.execCommand('copy')
          document.body.removeChild(textArea)

          if (!successful) {
            throw new Error('Failed to copy text using fallback method')
          }
        }

        setIsCopied(true)
        onSuccess?.()

        // Reset the copied state after timeout
        setTimeout(() => {
          setIsCopied(false)
        }, timeout)
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to copy to clipboard')
        onError?.(err)
        console.error('Copy to clipboard failed:', err)
      }
    },
    [timeout, onSuccess, onError],
  )

  const resetCopiedState = useCallback(() => {
    setIsCopied(false)
  }, [])

  return {
    isCopied,
    copyToClipboard,
    resetCopiedState,
  }
}
