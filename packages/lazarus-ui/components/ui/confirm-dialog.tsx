'use client'

import { ConfirmModal } from './modal'

interface ConfirmDialogProps {
  isDark: boolean
  title: string
  message: string
  confirmText: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  variant?: 'danger' | 'default'
}

export const ConfirmDialog = ({
  isDark,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  isLoading,
  variant = 'danger',
}: ConfirmDialogProps) => (
  <ConfirmModal
    isOpen={true}
    isDark={isDark}
    onClose={onCancel}
    title={title}
    message={message}
    confirmText={confirmText}
    onConfirm={onConfirm}
    isLoading={isLoading}
    variant={variant === 'danger' ? 'destructive' : 'confirm'}
    showCloseButton={false}
  />
)
