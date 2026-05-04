import * as m from 'motion/react-m'
import React from 'react'

import { COLORS } from '@/constants/system'
import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
}

const Spinner = ({ className, size = 'md', ...props }: SpinnerProps) => {
  // Convert size enum to pixel values
  const sizeInPixels = {
    sm: 16,
    md: 24,
    lg: 32,
  }[size]

  const borderSize = {
    sm: 2,
    md: 3,
    lg: 4,
  }[size]

  return (
    <div className={cn('relative', className)} {...props}>
      {/* Main Spinner */}
      <m.div
        initial={{ scale: 0, opacity: 0, filter: 'blur(10px)' }}
        animate={{
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          rotate: 360,
        }}
        exit={{ scale: 0, opacity: 0, filter: 'blur(10px)' }}
        transition={{
          scale: {
            type: 'spring',
            stiffness: 260,
            damping: 20,
            duration: 0.7,
          },
          opacity: { duration: 0.5 },
          filter: { duration: 0.6 },
          rotate: {
            duration: 2,
            repeat: Infinity,
            ease: [0.76, 0, 0.24, 1],
          },
        }}
        className='relative'
        style={{
          width: `${sizeInPixels}px`,
          height: `${sizeInPixels}px`,
        }}>
        {/* Color segments */}
        {COLORS.colorBarColors.map((color, index) => (
          <m.div
            key={index}
            className='absolute inset-0 rounded-full'
            style={{
              rotate: `${index * 60}deg`,
              borderWidth: `${borderSize}px`,
              borderColor: 'transparent',
              borderLeftColor: color,
              boxSizing: 'border-box',
              opacity: 0.9,
            }}
            initial={{ opacity: 0 }}
            animate={{
              rotate: [`${index * 60}deg`, `${index * 60 + 360}deg`],
              opacity: 0.9,
            }}
            transition={{
              opacity: {
                delay: 0.3 + index * 0.05,
                duration: 0.4,
              },
              rotate: {
                duration: 3,
                repeat: Infinity,
                ease: [0.76, 0, 0.24, 1],
                delay: index * 0.1,
              },
            }}
          />
        ))}
      </m.div>

      {/* Glow Effect */}
      <m.div
        className='absolute inset-0 rounded-full'
        style={{
          background: `radial-gradient(circle, ${COLORS.colorBarColors[0]}20 0%, transparent 70%)`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0, 0.3, 0.1, 0.3],
        }}
        transition={{
          opacity: {
            times: [0, 0.2, 0.5, 1],
            duration: 2.5,
          },
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      />
      <span className='sr-only'>Loading...</span>
    </div>
  )
}

export default Spinner
