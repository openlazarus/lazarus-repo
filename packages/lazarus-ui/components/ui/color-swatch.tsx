'use client'

import * as m from 'motion/react-m'
import { memo } from 'react'

import { ColorSwatchProps } from '@/lib/design-system/types'
import { MOTION } from '@/lib/design-system/ui-constants'

export const ColorSwatch = memo(function ColorSwatch({
  name,
  hex,
  rgb,
  className,
  isDarkSwatch = false,
}: ColorSwatchProps) {
  return (
    <m.div whileHover={{ y: -3 }} transition={MOTION.transitions.micro}>
      <div className={`mb-4 h-32 rounded-2xl ${className}`} />
      <p className='mb-1 text-[14px] font-medium tracking-[-0.01em]'>{name}</p>
      <p
        className={`mb-1 font-mono text-[12px] ${isDarkSwatch ? 'text-[#a1a1a6]' : 'text-[#6e6e73]'}`}>
        {hex}
      </p>
      <p
        className={`font-mono text-[11px] ${isDarkSwatch ? 'text-[#a1a1a6]' : 'text-[#86868b]'}`}>
        rgb({rgb})
      </p>
    </m.div>
  )
})
