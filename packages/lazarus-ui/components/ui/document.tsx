'use client'

import { RiArrowLeftLine } from '@remixicon/react'
import { useScroll, useSpring, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import { COLORS } from '@/constants/system'
import { cn } from '@/lib/utils'

interface DocumentSection {
  title: string
  content: React.ReactNode
  subsections?: {
    title: string
    content: React.ReactNode
  }[]
}

interface DocumentProps {
  title: string | React.ReactNode
  headerTitle?: React.ReactNode
  sections: DocumentSection[]
  backLink?: string
  lastUpdated?: string
}

export default function Document({
  title,
  headerTitle = 'Lazarus Docs',
  sections,
  backLink = '/',
  lastUpdated,
}: DocumentProps) {
  const router = useRouter()
  const { scrollYProgress } = useScroll()
  const [activeSection, setActiveSection] = useState<string>('')

  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // Create separate transform for each color bar
  const barProgresses = [
    useTransform(springProgress, [0, 1 / 6], [0, 1]),
    useTransform(springProgress, [1 / 6, 2 / 6], [0, 1]),
    useTransform(springProgress, [2 / 6, 3 / 6], [0, 1]),
    useTransform(springProgress, [3 / 6, 4 / 6], [0, 1]),
    useTransform(springProgress, [4 / 6, 5 / 6], [0, 1]),
    useTransform(springProgress, [5 / 6, 1], [0, 1]),
  ]

  // Update active section based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -80% 0px',
      },
    )

    sections.forEach((section) => {
      const element = document.getElementById(
        section.title.toLowerCase().replace(/\s+/g, '-'),
      )
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [sections])

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    if (window.history.length > 2) {
      router.back()
    } else {
      router.push(backLink)
    }
  }

  return (
    <div className='relative min-h-screen bg-black text-white'>
      {/* Fixed header with progress bar */}
      <div className='fixed left-0 right-0 top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-7xl items-center justify-between py-3'>
          <div className='flex items-center gap-x-4 sm:gap-x-8'>
            <button
              onClick={handleBack}
              className='group flex items-center space-x-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white/20 sm:px-6 sm:py-2'>
              <RiArrowLeftLine className='h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 sm:h-4 sm:w-4' />
              <span>Back</span>
            </button>
            <div className='flex items-center text-base font-semibold text-white sm:text-lg'>
              {headerTitle}
            </div>
          </div>
        </div>

        <m.div className='absolute bottom-0 left-0 right-0 flex h-0.5 w-full'>
          {COLORS.colorBarColors.map((color, index) => (
            <m.div
              key={index}
              style={{
                backgroundColor: color,
                width: '16.67%',
                scaleX: barProgresses[index],
                transformOrigin: '0%',
              }}
              className='h-full'
            />
          ))}
        </m.div>
      </div>

      {/* Main layout */}
      <div className='mx-auto flex max-w-7xl pt-16 sm:pt-20'>
        {/* Left sidebar - Table of Contents */}
        <div className='scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10 fixed hidden h-[calc(100vh-4rem)] w-[280px] overflow-y-auto pt-8 lg:block xl:w-[320px]'>
          <div className='mb-4 px-4 sm:mb-6'>
            <h2 className='text-lg font-semibold text-white/90 xl:text-xl'>
              {title}
            </h2>
          </div>
          <nav className='space-y-0.5 px-4'>
            {sections.map((section, index) => {
              const sectionId = section.title.toLowerCase().replace(/\s+/g, '-')
              return (
                <Link
                  key={index}
                  href={`#${sectionId}`}
                  className={cn(
                    'block rounded-md px-3 py-1.5 text-sm transition-colors sm:py-2',
                    'hover:bg-white/5 hover:text-white/90',
                    activeSection === sectionId
                      ? 'bg-white/5 text-white/90'
                      : 'text-white/60',
                  )}>
                  {section.title}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Main content */}
        <main className='min-w-0 flex-1 lg:pl-[280px] xl:pl-[320px]'>
          <div className='px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
            <div className='prose prose-invert prose-lg max-w-none'>
              <ScrollReveal>
                <h1 className='mb-12 bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:mb-16 sm:text-4xl'>
                  {title}
                </h1>
              </ScrollReveal>

              {sections.map((section, index) => (
                <ScrollReveal key={index}>
                  <section
                    id={section.title.toLowerCase().replace(/\s+/g, '-')}
                    className='mb-12 scroll-mt-24 sm:mb-16'>
                    <h2 className='mb-6 text-xl font-semibold text-white/90 sm:mb-8 sm:text-2xl'>
                      {section.title}
                    </h2>
                    <div className='text-base leading-relaxed text-white/70 sm:text-lg'>
                      {section.content}
                    </div>

                    {section.subsections?.map((subsection, subIndex) => (
                      <ScrollReveal key={subIndex}>
                        <div className='mt-6 sm:mt-8'>
                          <h3 className='mb-4 text-lg font-medium text-white/80 sm:mb-6 sm:text-xl'>
                            {subsection.title}
                          </h3>
                          <div className='text-base leading-relaxed text-white/70 sm:text-lg'>
                            {subsection.content}
                          </div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </section>
                </ScrollReveal>
              ))}

              {lastUpdated && (
                <ScrollReveal>
                  <section className='mt-16 border-t border-white/10 pt-6 sm:mt-24 sm:pt-8'>
                    <p className='text-xs text-white/40 sm:text-sm'>
                      Last Updated: {lastUpdated}
                    </p>
                  </section>
                </ScrollReveal>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function ScrollReveal({ children }: { children: React.ReactNode }) {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.8,
        ease: [0.21, 0.45, 0.32, 0.9],
      }}>
      {children}
    </m.div>
  )
}
