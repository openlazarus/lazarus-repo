'use client'

import { useMemo } from 'react'

import type { PhoneStatusColor, PhoneStatusInfo } from '@/model'

const BADGE_CLASSES: Record<PhoneStatusColor, string> = {
  green: 'bg-green-500/20 text-green-500',
  yellow: 'bg-yellow-500/20 text-yellow-500',
  orange: 'bg-orange-500/20 text-orange-500',
  red: 'bg-red-500/20 text-red-500',
  gray: 'bg-white/10 text-white/60',
}

const DOT_CLASSES: Record<PhoneStatusColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-white/40',
}

const ACTION_CLASSES: Record<string, { dark: string; light: string }> = {
  red: {
    dark: 'bg-red-500/10 text-red-400',
    light: 'bg-red-500/10 text-red-600',
  },
  orange: {
    dark: 'bg-yellow-500/10 text-yellow-400',
    light: 'bg-yellow-500/10 text-yellow-600',
  },
  default: {
    dark: 'bg-blue-500/10 text-blue-400',
    light: 'bg-blue-500/10 text-blue-600',
  },
}

export function useWhatsAppStatus(phoneStatus: PhoneStatusInfo | undefined) {
  return useMemo(() => {
    if (!phoneStatus) return null

    const badgeClass = BADGE_CLASSES[phoneStatus.color]
    const dotClass = DOT_CLASSES[phoneStatus.color]

    const actionColorKey =
      phoneStatus.color === 'red' || phoneStatus.color === 'orange'
        ? phoneStatus.color
        : 'default'
    const actionClasses = ACTION_CLASSES[actionColorKey]

    return {
      label: phoneStatus.label,
      description: phoneStatus.description,
      action: phoneStatus.action,
      actionUrl: phoneStatus.actionUrl,
      canDo: phoneStatus.canDo,
      cannotDo: phoneStatus.cannotDo,
      badgeClass,
      dotClass,
      actionDarkClass: actionClasses.dark,
      actionLightClass: actionClasses.light,
      isReady: phoneStatus.readiness === 'ready',
      isBlocked: phoneStatus.readiness === 'blocked',
      isRestricted: phoneStatus.readiness === 'restricted',
      isPending: phoneStatus.readiness === 'pending_approval',
    }
  }, [phoneStatus])
}
