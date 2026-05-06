'use client'

import { Button } from '@/components/ui/button'
import { CreateModal } from '@/components/ui/modal'
import { useCopyToClipboard } from '@/hooks/ui/interaction/use-copy-to-clipboard'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface WebhookUrlModalProps {
  webhookUrl: string
  onClose: () => void
}

export function WebhookUrlModal({ webhookUrl, onClose }: WebhookUrlModalProps) {
  const { isDark } = useTheme()
  const { isCopied, copyToClipboard } = useCopyToClipboard()

  return (
    <CreateModal
      isOpen={true}
      isDark={isDark}
      onClose={onClose}
      title='App Signal created'
      size='md'>
      <div className='space-y-4'>
        <p
          className={cn(
            'text-[13px]',
            isDark ? 'text-white/50' : 'text-black/45',
          )}>
          Copy your webhook URL to use in your app.
        </p>

        <div
          className={cn(
            'rounded-lg border p-3',
            isDark
              ? 'border-white/[0.08] bg-white/[0.03]'
              : 'border-black/[0.06] bg-black/[0.02]',
          )}>
          <p
            className={cn(
              'break-all font-mono text-[12px]',
              isDark ? 'text-white/70' : 'text-black/60',
            )}>
            {webhookUrl}
          </p>
        </div>

        <Button
          type='button'
          variant='secondary'
          size='small'
          onClick={() => copyToClipboard(webhookUrl)}
          className='w-full'>
          {isCopied ? 'Copied!' : 'Copy URL'}
        </Button>

        <div className='flex justify-end pt-1'>
          <Button type='button' variant='active' size='small' onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </CreateModal>
  )
}
