import * as m from 'motion/react-m'
import Image from 'next/image'
import React, { useMemo } from 'react'

import { COLORS } from '@/constants/system'
import { cn } from '@/lib/utils'

// Types
type LogoSize = 'xs' | 'small' | 'medium' | 'large' | 'xl'
type LogoVariant = 'default' | 'light' | 'ball'

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: LogoSize
  variant?: LogoVariant
  className?: string
}

// Size mappings
const SIZE_CONFIG = {
  text: {
    xs: 'text-xs text-[var(--font-size-14)]',
    small: 'text-sm text-[var(--font-size-15)]',
    medium: 'text-lg text-[var(--font-size-22)]',
    large: 'text-2xl text-[var(--font-size-28)]',
    xl: 'text-3xl text-[var(--font-size-32)]',
  },
  spacing: {
    xs: 'mb-[0.5px]',
    small: 'mb-[0.75px]',
    medium: 'mb-[1px]',
    large: 'mb-[2.5px]',
    xl: 'mb-[4px]',
  },
  ball: {
    xs: 16,
    small: 20,
    medium: 24,
    large: 32,
    xl: 40,
  },
  colorBar: {
    xs: 'h-[3px]',
    small: 'h-[4px]',
    medium: 'h-[5px]',
    large: 'h-[6px]',
    xl: 'h-[7px]',
  },
} as const

// Animation variants
const useLogoAnimations = () => {
  const logoLine = {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: { duration: 0.3, ease: 'easeOut', delay: 0.2 },
    },
    hover: {
      scaleX: [1, 0.8, 1],
      transition: {
        duration: 1.5,
        ease: [0.76, 0, 0.24, 1],
        repeat: Infinity,
      },
    },
  }

  const colorBar = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.3,
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

  const colorBarItem = {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      scaleY: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
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

  const letter = {
    initial: { y: 0 },
    hover: (i: number) => ({
      y: [-2, 2, -2],
      rotate: [-1, 1, -1],
      transition: {
        duration: 2,
        ease: 'easeInOut',
        repeat: Infinity,
        delay: i * 0.06,
      },
    }),
  }

  return { logoLine, colorBar, colorBarItem, letter }
}

// Letter animation component for better reusability
const AnimatedText: React.FC<{ text: string }> = React.memo(({ text }) => {
  const { letter } = useLogoAnimations()

  return (
    <div className='relative inline-flex'>
      {text.split('').map((char, i) => (
        <m.span
          key={i}
          custom={i}
          variants={letter}
          initial='initial'
          className='relative inline-block'
          style={{ originY: 0.5 }}>
          {char}
        </m.span>
      ))}
    </div>
  )
})
AnimatedText.displayName = 'AnimatedText'

// Color bar component
const ColorBar: React.FC<{ height: string }> = React.memo(({ height }) => {
  const { colorBar, colorBarItem, logoLine } = useLogoAnimations()

  return (
    <>
      <m.div
        variants={logoLine}
        className={cn('absolute bottom-0 left-0 w-full', height)}
      />
      <m.div
        variants={colorBar}
        className={cn(
          'absolute bottom-0 left-0 flex w-full origin-left',
          height,
        )}>
        {COLORS.colorBarColors.map((color, index) => (
          <m.div
            key={index}
            variants={colorBarItem}
            className='h-full origin-bottom'
            style={{
              backgroundColor: color,
              width: '16.67%',
              opacity: 0.9,
              filter: 'brightness(1.1)',
            }}
          />
        ))}
      </m.div>
    </>
  )
})
ColorBar.displayName = 'ColorBar'

// Ball variant component
const BallLogo: React.FC<{
  size: LogoSize
  className?: string
  textColorClass: string
}> = React.memo(({ size, className, textColorClass }) => {
  return (
    <div className={cn(`flex items-center gap-1.5`, className)}>
      <div className='flex-shrink-0'>
        <Image
          src='/icons/favicon.png'
          alt='Lazarus Logo'
          width={SIZE_CONFIG.ball[size]}
          height={SIZE_CONFIG.ball[size]}
          className='rounded-full'
          priority
        />
      </div>
      <m.div
        initial='hidden'
        animate='visible'
        whileHover='hover'
        className={cn(SIZE_CONFIG.text[size], textColorClass, 'font-semibold')}>
        <AnimatedText text='Lazarus' />
      </m.div>
    </div>
  )
})
BallLogo.displayName = 'BallLogo'

// Main Logo component
const Logo = React.memo<LogoProps>(
  ({ size = 'medium', variant = 'default', className = '', ...props }) => {
    // Memoize text color to avoid recalculations
    const textColorClass = useMemo(
      () => (variant === 'light' ? 'text-white' : 'text-black'),
      [variant],
    )

    // Render ball variant
    if (variant === 'ball') {
      return (
        <BallLogo
          size={size}
          className={className}
          textColorClass={textColorClass}
          {...props}
        />
      )
    }

    // Render default/light variant
    return (
      <div
        className={cn(
          `flex items-center justify-center self-center`,
          className,
        )}
        {...props}>
        <m.div
          initial='hidden'
          animate='visible'
          whileHover='hover'
          className={cn(
            SIZE_CONFIG.text[size],
            textColorClass,
            'group relative flex cursor-pointer flex-col font-semibold',
          )}>
          <div
            className={cn(
              'flex flex-1 items-center',
              SIZE_CONFIG.spacing[size],
            )}>
            <AnimatedText text='Lazarus' />
          </div>
          <ColorBar height={SIZE_CONFIG.colorBar[size]} />
        </m.div>
      </div>
    )
  },
)
Logo.displayName = 'Logo'

export default Logo
