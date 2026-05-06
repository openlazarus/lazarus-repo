'use client'

import { useAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect } from 'react'

import { MOTION } from '@/lib/design-system/ui-constants'

export type AnimationTextType = 'word' | 'letter' | 'paragraph' | 'display'

interface AnimatedTextProps {
  text: string
  delay?: number
  stagger?: number
  type?: AnimationTextType
  className?: string
}

export function AnimatedText({
  text,
  delay = 0,
  stagger = 0.02,
  type = 'word',
  className = '',
}: AnimatedTextProps) {
  const controls = useAnimation()

  // Simple mount-based animation - always works
  useEffect(() => {
    const timer = setTimeout(() => {
      controls.start('visible')
    }, delay * 1000) // Convert delay to milliseconds

    return () => clearTimeout(timer)
  }, [controls, delay])

  const words = text.split(' ')
  const letters = text.split('')

  if (type === 'paragraph') {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    return (
      <span className={className}>
        {sentences.map((sentence, i) => (
          <m.span
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={controls}
            variants={{
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: MOTION.duration.complex / 1000,
              delay: i * 0.1,
              ease: MOTION.easing.default,
            }}>
            {sentence}
          </m.span>
        ))}
      </span>
    )
  }

  if (type === 'display' || type === 'letter') {
    return (
      <span className={className} style={{ display: 'inline-block' }}>
        {letters.map((letter, i) => (
          <m.span
            key={i}
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
            initial={{ opacity: 0, y: 10 }}
            animate={controls}
            variants={{
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: 0.4,
              delay: i * stagger,
              ease: MOTION.easing.default,
            }}>
            {letter}
          </m.span>
        ))}
      </span>
    )
  }

  return (
    <span className={className}>
      {words.map((word, i) => (
        <m.span
          key={i}
          style={{ display: 'inline-block', marginRight: '0.3em' }}
          initial={{ opacity: 0, y: 10 }}
          animate={controls}
          variants={{
            visible: { opacity: 1, y: 0 },
          }}
          transition={{
            duration: MOTION.duration.complex / 1000,
            delay: i * stagger,
            ease: MOTION.easing.default,
          }}>
          {word}
        </m.span>
      ))}
    </span>
  )
}
