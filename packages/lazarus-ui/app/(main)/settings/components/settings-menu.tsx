'use client'

import * as m from 'motion/react-m'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'

interface SettingsMenuProps {
  currentSection: string
}

export function SettingsMenu({ currentSection }: SettingsMenuProps) {
  const router = useRouter()

  const updateSection = (section: string) => {
    // Update URL without full page reload
    const url = new URL(window.location.href)
    url.searchParams.set('section', section)
    window.history.pushState({}, '', url)

    // Force router to recognize the change
    router.refresh()
  }

  return (
    <div className='space-y-1.5 px-2'>
      {/* Back to home button */}
      <m.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className='mb-4 mt-4'>
        <m.button
          type='button'
          onClick={() => router.push('/')}
          whileHover={{
            x: 4,
            backgroundColor: 'hsl(var(--border))',
            transition: { duration: 0.2 },
          }}
          whileTap={{ opacity: 0.8 }}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors',
            'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]',
          )}>
          <i className='ri-arrow-left-line text-base'></i>
          <span>Back to home</span>
        </m.button>
      </m.div>

      {/* Divider */}
      <div className='mb-3 border-t border-[hsl(var(--border))]' />

      <button
        type='button'
        onClick={() => updateSection('account')}
        className={cn(
          'w-full rounded-lg px-4 py-2 text-left text-sm transition-colors',
          currentSection === 'account' || !currentSection
            ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
        )}>
        Account
      </button>
      <button
        type='button'
        onClick={() => updateSection('credits')}
        className={cn(
          'w-full rounded-lg px-4 py-2 text-left text-sm transition-colors',
          currentSection === 'credits'
            ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
        )}>
        Credits
      </button>
      <button
        type='button'
        onClick={() => updateSection('developer')}
        className={cn(
          'w-full rounded-lg px-4 py-2 text-left text-sm transition-colors',
          currentSection === 'developer'
            ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
        )}>
        Developer
      </button>
    </div>
  )
}
