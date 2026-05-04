'use client'

import { RiCheckLine, RiCloseLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import Spinner from '@/components/ui/spinner'
import {
  usePendingInvitations,
  type PendingInvitation,
} from '@/hooks/features/invitations/use-pending-invitations'
import { cn } from '@/lib/utils'

interface PendingInvitesModalProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
}

const THEME_CLASSES = {
  text: {
    primary: (isDark: boolean) =>
      isDark ? 'text-foreground' : 'text-[#1a1a1a]',
    secondary: (isDark: boolean) =>
      isDark ? 'text-foreground/60' : 'text-[#666666]',
  },
  divider: (isDark: boolean) =>
    isDark ? 'border-white/10' : 'border-black/10',
} as const

// Generate initials from name
const getInitials = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '??'
}

// Generate a consistent color based on string
const getAvatarColor = (str: string) => {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

interface InvitationRowProps {
  invitation: PendingInvitation
  isDark: boolean
  onAccept: (code: string) => void
  onDecline: (id: string) => void
  isProcessing: boolean
  isLast: boolean
}

const InvitationRow = ({
  invitation,
  isDark,
  onAccept,
  onDecline,
  isProcessing,
  isLast,
}: InvitationRowProps) => {
  const inviterFirstName = invitation.profiles?.first_name
  const inviterLastName = invitation.profiles?.last_name
  const inviterEmail = invitation.profiles?.email
  const inviterAvatar = invitation.profiles?.avatar

  const inviterName =
    inviterFirstName && inviterLastName
      ? `${inviterFirstName} ${inviterLastName}`
      : inviterEmail || 'Someone'

  const initials = getInitials(inviterFirstName, inviterLastName, inviterEmail)
  const avatarColor = getAvatarColor(inviterEmail || inviterName)

  return (
    <m.div
      className={cn(
        'flex items-center gap-3 py-3',
        !isLast && 'border-b',
        !isLast && THEME_CLASSES.divider(isDark),
      )}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}>
      {/* Avatar */}
      {inviterAvatar ? (
        <Image
          src={inviterAvatar}
          alt={inviterName}
          width={36}
          height={36}
          className='h-9 w-9 flex-shrink-0 rounded-full object-cover'
        />
      ) : (
        <div
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium text-white',
            avatarColor,
          )}>
          {initials}
        </div>
      )}

      {/* Content */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span
            className={cn(
              'truncate text-[14px] font-medium',
              THEME_CLASSES.text.primary(isDark),
            )}>
            {invitation.workspaces?.name || 'Unknown workspace'}
          </span>
          <span
            className={cn(
              'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[12px]',
              isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/60',
            )}>
            {invitation.role}
          </span>
        </div>
        <p
          className={cn(
            'truncate text-[13px]',
            THEME_CLASSES.text.secondary(isDark),
          )}>
          from {inviterName}
        </p>
      </div>

      {/* Actions */}
      <div className='flex flex-shrink-0 items-center gap-1.5'>
        <Button
          variant='active'
          size='small'
          shape='pill'
          iconLeft={<RiCheckLine className='h-3.5 w-3.5' />}
          onClick={() => onAccept(invitation.code)}
          disabled={isProcessing}>
          Accept
        </Button>
        <button
          onClick={() => onDecline(invitation.id)}
          disabled={isProcessing}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
            isDark
              ? 'text-white/60 hover:bg-white/10 hover:text-white'
              : 'text-black/40 hover:bg-black/5 hover:text-black/60',
            isProcessing && 'cursor-not-allowed opacity-50',
          )}>
          <RiCloseLine className='h-4 w-4' />
        </button>
      </div>
    </m.div>
  )
}

export const PendingInvitesModal = ({
  isOpen,
  onClose,
  isDark,
}: PendingInvitesModalProps) => {
  const { invitations, loading, acceptInvitation, declineInvitation } =
    usePendingInvitations()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleAccept = async (code: string) => {
    try {
      setProcessingId(code)
      await acceptInvitation(code)
    } catch (error) {
      console.error('Failed to accept invitation:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (id: string) => {
    try {
      setProcessingId(id)
      await declineInvitation(id)
    } catch (error) {
      console.error('Failed to decline invitation:', error)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Modal isOpen={isOpen} isDark={isDark} onClose={onClose} size='md'>
      {/* Header */}
      <h3
        className={cn(
          'mb-1 text-[16px] font-semibold',
          THEME_CLASSES.text.primary(isDark),
        )}>
        Pending invitations
      </h3>
      <p
        className={cn(
          'mb-4 text-[14px]',
          THEME_CLASSES.text.secondary(isDark),
        )}>
        {invitations.length === 0
          ? 'No pending invitations'
          : `You have ${invitations.length} pending ${invitations.length === 1 ? 'invitation' : 'invitations'}`}
      </p>

      {/* Content */}
      {loading ? (
        <div className='flex items-center justify-center py-8'>
          <Spinner size='md' />
        </div>
      ) : invitations.length === 0 ? (
        <p
          className={cn(
            'py-6 text-center text-[14px]',
            THEME_CLASSES.text.secondary(isDark),
          )}>
          You're all caught up!
        </p>
      ) : (
        <div className='-mx-1 max-h-[300px] overflow-y-auto px-1'>
          {invitations.map((invitation, index) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              isDark={isDark}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={
                processingId === invitation.id ||
                processingId === invitation.code
              }
              isLast={index === invitations.length - 1}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}
