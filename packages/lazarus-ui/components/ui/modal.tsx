'use client'

import { RiCloseLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import React, { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import { Button } from './button'

// Animation configs for smooth Apple-like animations
const smoothEase = [0.32, 0.72, 0, 1] as const

// Base Modal Props
interface BaseModalProps {
  isOpen: boolean
  isDark: boolean
  onClose: () => void
  className?: string
  showCloseButton?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

// Modal variants
type ModalVariant = 'default' | 'create' | 'confirm' | 'destructive'

// Confirm Modal specific props
interface ConfirmModalProps extends Omit<BaseModalProps, 'children'> {
  variant: 'confirm' | 'destructive'
  title: string
  message: string
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  isLoading?: boolean
}

// Create Modal specific props
interface CreateModalProps extends Omit<BaseModalProps, 'children'> {
  variant: 'create'
  title: string
  subtitle?: string
  children: React.ReactNode
}

// Default Modal specific props
interface DefaultModalProps extends BaseModalProps {
  variant?: 'default'
}

// Union type for all modal props
export type ModalProps =
  | DefaultModalProps
  | CreateModalProps
  | ConfirmModalProps

// Base Modal Container Component
const ModalContainer = ({
  isOpen,
  isDark,
  onClose,
  className,
  showCloseButton = true,
  size = 'md',
  children,
}: BaseModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <m.div
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: smoothEase }}
      onClick={onClose}>
      <m.div
        ref={modalRef}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative w-full rounded-2xl p-6',
          sizeClasses[size],
          isDark ? 'bg-[#111112]' : 'bg-white',
          className,
        )}
        onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className={cn(
              'absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors',
              isDark
                ? 'text-white/60 hover:bg-white/10 hover:text-white/80'
                : 'text-black/40 hover:bg-black/5 hover:text-black/60',
            )}>
            <RiCloseLine className='h-5 w-5' />
          </button>
        )}

        {children}
      </m.div>
    </m.div>
  )
}

// Confirm/Destructive Modal Component
const ConfirmModalContent = ({
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  isLoading,
  variant,
  isDark,
}: Omit<ConfirmModalProps, 'isOpen'> & { onClose: () => void }) => (
  <>
    <h3
      className={cn(
        'mb-2 text-[16px] font-semibold',
        isDark ? 'text-foreground' : 'text-[#1a1a1a]',
      )}>
      {title}
    </h3>
    <p
      className={cn(
        'mb-6 text-[14px]',
        isDark ? 'text-foreground/70' : 'text-[#666666]',
      )}>
      {message}
    </p>
    <div className='flex gap-2'>
      <Button
        variant='secondary'
        size='medium'
        onClick={onClose}
        disabled={isLoading}
        className='flex-1'>
        {cancelText}
      </Button>
      <Button
        variant={variant === 'destructive' ? 'destructive' : 'active'}
        size='medium'
        onClick={onConfirm}
        loading={isLoading}
        className='flex-1'>
        {confirmText}
      </Button>
    </div>
  </>
)

// Create Modal Component
const CreateModalContent = ({
  title,
  subtitle,
  children,
  isDark,
}: Omit<CreateModalProps, 'isOpen' | 'onClose'> & {
  isDark: boolean
}) => (
  <>
    <h3
      className={cn(
        'mb-2 text-[16px] font-semibold',
        isDark ? 'text-foreground' : 'text-[#1a1a1a]',
      )}>
      {title}
    </h3>
    {subtitle && (
      <p
        className={cn(
          'mb-4 text-[14px]',
          isDark ? 'text-foreground/70' : 'text-[#666666]',
        )}>
        {subtitle}
      </p>
    )}
    {children}
  </>
)

// Main Modal Component with variant support
export const Modal = (props: ModalProps) => {
  const { isOpen, isDark, onClose, variant = 'default' } = props

  // Determine which content to render based on variant
  const renderContent = () => {
    switch (variant) {
      case 'confirm':
      case 'destructive':
        return (
          <ConfirmModalContent
            {...(props as ConfirmModalProps)}
            onClose={onClose}
          />
        )
      case 'create':
        return <CreateModalContent {...(props as CreateModalProps)} />
      default:
        return (props as DefaultModalProps).children
    }
  }

  return (
    <ModalContainer
      isOpen={isOpen}
      isDark={isDark}
      onClose={onClose}
      className={props.className}
      showCloseButton={
        props.showCloseButton !== undefined ? props.showCloseButton : true
      }
      size={props.size || 'md'}>
      {renderContent()}
    </ModalContainer>
  )
}

// Convenience exports for specific modal types
export const ConfirmModal = (
  props: Omit<ConfirmModalProps, 'variant'> & {
    variant?: 'confirm' | 'destructive'
  },
) => <Modal {...props} variant={props.variant || 'confirm'} />

export const CreateModal = (props: Omit<CreateModalProps, 'variant'>) => (
  <Modal {...props} variant='create' />
)

export const DefaultModal = (props: DefaultModalProps) => (
  <Modal {...props} variant='default' />
)
