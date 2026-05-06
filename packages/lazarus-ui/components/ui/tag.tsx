'use client'

import * as m from 'motion/react-m'
import { memo } from 'react'

import { TagVariant } from '@/lib/design-system/types'
import { MOTION } from '@/lib/design-system/ui-constants'

interface TagProps {
  label: string
  variant?: TagVariant
  isDark?: boolean
}

export const Tag = memo(function Tag({
  label,
  variant = 'neutral',
  isDark = false,
}: TagProps) {
  const getTagClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#0098FC] text-white'
      case 'gradient':
        return 'bg-gradient-to-r from-[#0098FC] to-[#00D4FF] text-white'
      case 'outlined':
        return `border ${isDark ? 'border-white/20' : 'border-[#e5e5e7]'}`
      default:
        return isDark ? 'bg-white/[0.08]' : 'bg-[#fafafa]'
    }
  }

  return (
    <m.span
      className={`cursor-default rounded-full px-5 py-2 text-[13px] font-medium uppercase tracking-[0.02em] ${getTagClasses()}`}
      whileHover={{ y: -1 }}
      transition={MOTION.transitions.micro}>
      {label}
    </m.span>
  )
})
