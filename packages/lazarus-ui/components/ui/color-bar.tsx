'use client'

import * as m from 'motion/react-m'

import { COLORS } from '@/constants/system'

const colorBarVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.8,
    },
  },
  hover: {
    transition: {
      staggerChildren: 0.08,
      staggerDirection: 1,
      repeat: Infinity,
    },
  },
}

const colorBarItemVariants = {
  initial: { scaleX: 0, scaleY: 1 },
  animate: {
    scaleX: 1,
    scaleY: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  hover: {
    scaleY: [1, 1.8, 1],
    filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
    transition: {
      duration: 1.5,
      ease: [0.76, 0, 0.24, 1],
      repeat: Infinity,
    },
  },
}

interface ColorBarProps {
  className?: string
  animated?: boolean
  position?: 'fixed' | 'absolute'
}

export function ColorBar({
  className = '',
  animated = true,
  position = 'absolute',
}: ColorBarProps) {
  return (
    <div className={`${position} left-0 right-0 top-0 z-[9999] ${className}`}>
      {animated ? (
        <m.div
          className='pointer-events-none flex h-[5px] w-full'
          variants={colorBarVariants}
          initial='initial'
          animate='animate'
          whileHover='hover'>
          {COLORS.colorBarColors.map((color, index) => (
            <m.div
              key={index}
              variants={colorBarItemVariants}
              className='h-full origin-bottom'
              style={{
                backgroundColor: color,
                width: '16.67%',
                opacity: 0.9,
              }}
            />
          ))}
        </m.div>
      ) : (
        <div className='pointer-events-none flex h-[5px] w-full'>
          {COLORS.colorBarColors.map((color, index) => (
            <div
              key={index}
              className='h-full origin-bottom'
              style={{
                backgroundColor: color,
                width: '16.67%',
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
