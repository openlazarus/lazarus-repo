'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import { AccountSection } from '@/app/(main)/settings/components/account-section'
import { CreditsSection } from '@/app/(main)/settings/components/credits-section'
import { DeveloperSection } from '@/app/(main)/settings/components/developer-section'
import { DashboardPageLayout } from '@/components/features/dashboard'
import { useIsMobile } from '@/hooks/ui/layout/use-media-query'
import { cn } from '@/lib/utils'

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const section = searchParams.get('section') || 'account'
  const isMobile = useIsMobile()

  const renderSection = () => {
    switch (section) {
      case 'account':
        return <AccountSection />
      case 'credits':
        return <CreditsSection />
      case 'developer':
        return <DeveloperSection />
      default:
        return <AccountSection />
    }
  }

  const getTitle = () => {
    switch (section) {
      case 'account':
        return 'Account settings'
      case 'credits':
        return 'Credits & billing'
      case 'developer':
        return 'Developer'
      default:
        return 'Settings'
    }
  }

  // Mobile view with navigation tabs
  if (isMobile) {
    return (
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        {/* Mobile Settings Header with Back Button */}
        <div className='border-b border-[hsl(var(--border))] bg-background px-4 py-4'>
          <div className='mb-4 flex items-center gap-3'>
            <button
              onClick={() => router.push('/')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
              )}>
              <i className='ri-arrow-left-line text-lg'></i>
            </button>
            <h1 className='text-xl font-semibold'>{getTitle()}</h1>
          </div>

          {/* Mobile Navigation Tabs */}
          <div className='scrollbar-hide flex gap-2 overflow-x-auto pb-2'>
            <button
              onClick={() => router.push('/settings?section=account')}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                section === 'account'
                  ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
                  : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
              )}>
              Account
            </button>
            <button
              onClick={() => router.push('/settings?section=credits')}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                section === 'credits'
                  ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
                  : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
              )}>
              Credits
            </button>
            <button
              onClick={() => router.push('/settings?section=developer')}
              className={cn(
                'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                section === 'developer'
                  ? 'bg-[hsl(var(--input))] text-[hsl(var(--text-primary))]'
                  : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
              )}>
              Developer
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className='flex-1 overflow-y-auto px-4 py-6' key={section}>
          {renderSection()}
        </div>
      </div>
    )
  }

  // Desktop view (existing layout)
  return (
    <DashboardPageLayout
      title={getTitle()}
      showSearch={false}
      showFilter={false}
      showAdd={false}>
      <div className='px-6 py-6' key={section}>
        {renderSection()}
      </div>
    </DashboardPageLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
