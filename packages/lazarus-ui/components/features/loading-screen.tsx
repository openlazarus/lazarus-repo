'use client'

import * as m from 'motion/react-m'
import React from 'react'

import Spinner from '@/components/ui/spinner'

const LoadingSpinner: React.FC = () => {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className='fixed inset-0 z-50 flex items-center justify-center bg-background'>
      <div className='flex flex-col items-center justify-center space-y-4'>
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1,
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
          className='text-[40px] font-semibold tracking-tight text-foreground'>
          Lazarus
        </m.div>
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.2,
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}>
          <Spinner size='lg' />
        </m.div>
      </div>
    </m.div>
  )
}

export default LoadingSpinner
