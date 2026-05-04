'use client'

import { RiLoginCircleLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import React from 'react'
import { useInView } from 'react-intersection-observer'

import { Button } from '@/components/ui/button'
import Logo from '@/components/ui/logo'
import { useIsMounted } from '@/hooks/utils/use-is-mounted'

// Animation variants
const fadeInUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
}

// Component for animated text sections
interface AnimatedTextProps {
  children: React.ReactNode
  className: string
  delay?: number
  inView?: boolean
}

const AnimatedText = React.memo(
  ({ children, className, delay = 0, inView = true }: AnimatedTextProps) => (
    <m.div
      initial='hidden'
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeInUpVariants}
      custom={delay}
      className={className}>
      {children}
    </m.div>
  ),
)
AnimatedText.displayName = 'AnimatedText'

// Header component
const Header = React.memo(() => (
  <header className='w-full px-6 py-6 sm:px-8 sm:py-7 md:px-10 md:py-8 lg:py-10'>
    <div className='mx-auto max-w-5xl'>
      <a href='/' className='inline-block'>
        <Logo size='medium' />
      </a>
    </div>
  </header>
))
Header.displayName = 'Header'

// Footer component
const Footer = React.memo(() => (
  <footer className='w-full border-t border-[hsla(var(--lazarus-gray-300)/0.1)] px-6 py-6 sm:px-8 sm:py-7 md:px-10 md:py-8'>
    <div className='mx-auto max-w-5xl text-center text-sm text-[hsl(var(--lazarus-gray-400))]'>
      ©{new Date().getFullYear()} Lazarus Labs, LLC. All rights reserved.
    </div>
  </footer>
))
Footer.displayName = 'Footer'

// Main error content component
interface ErrorContentProps {
  inView: boolean
}

const ErrorContent = React.memo(({ inView }: ErrorContentProps) => (
  <div className='flex flex-col items-center text-center'>
    <AnimatedText
      className='mb-4 text-sm font-medium uppercase tracking-wider text-[hsl(var(--lazarus-gray-400))] sm:mb-5 md:mb-6'
      inView={inView}>
      Error 404
    </AnimatedText>

    <AnimatedText
      className='mb-6 text-4xl font-semibold leading-tight tracking-tight text-[hsl(var(--lazarus-gray-800))] sm:mb-8 sm:text-5xl md:mb-10 md:text-6xl'
      delay={0.1}
      inView={inView}>
      Sorry, we couldn't find the page you're&nbsp;looking&nbsp;for
    </AnimatedText>

    <AnimatedText
      className='mb-10 max-w-2xl text-lg text-[hsl(var(--lazarus-gray-500))] sm:mb-12 md:mb-14'
      delay={0.2}
      inView={inView}>
      The page may have been moved, deleted, or the URL might be incorrect.
    </AnimatedText>

    <div className='flex w-full flex-col items-center justify-center gap-6 sm:flex-row sm:gap-4 md:gap-8'>
      <m.div
        initial='hidden'
        animate={inView ? 'visible' : 'hidden'}
        variants={fadeInUpVariants}
        custom={0.3}
        className='order-1 sm:order-2'>
        <Button href='/' iconLeft={<RiLoginCircleLine className='h-4 w-4' />}>
          Return home
        </Button>
      </m.div>

      <m.div
        initial='hidden'
        animate={inView ? 'visible' : 'hidden'}
        variants={fadeInUpVariants}
        custom={0.3}
        className='order-2 sm:order-1'>
        <Button href='mailto:support@openlazarus.ai' variant='link'>
          Contact support
        </Button>
      </m.div>
    </div>
  </div>
))
ErrorContent.displayName = 'ErrorContent'

/**
 * ErrorPage component for 404 pages
 * @returns {React.FC} A React functional component
 */
export default function ErrorPage() {
  // Client-side rendering guard
  const isMounted = useIsMounted()

  // Intersection observer for animations
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  if (!isMounted) return null

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <Header />

      <main
        ref={ref}
        className='flex grow flex-col items-center justify-center px-6 py-12 sm:px-8 sm:py-16 md:px-10 md:py-20 lg:py-24'>
        <div className='mx-auto max-w-3xl px-4 sm:px-6 md:px-0'>
          <ErrorContent inView={inView} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
