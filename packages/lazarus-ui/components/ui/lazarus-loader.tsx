'use client'

import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'

import Spinner from './spinner'

interface LazarusLoaderProps {
  size?: 'sm' | 'md'
}

export function LazarusLoader({ size = 'md' }: LazarusLoaderProps) {
  return (
    <m.div
      className='flex items-center justify-center gap-3'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}>
      <m.span
        className={cn(
          'font-semibold tracking-[-0.02em] text-foreground',
          size === 'sm' ? 'text-[13px]' : 'text-[15px]',
        )}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}>
        Lazarus
      </m.span>
      <Spinner size={size === 'sm' ? 'sm' : 'md'} />
    </m.div>
  )
}
