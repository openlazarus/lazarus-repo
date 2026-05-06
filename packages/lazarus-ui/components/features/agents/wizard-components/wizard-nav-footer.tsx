'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WizardNavFooterProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  onSubmit: () => void
  isSubmitting: boolean
  canProceed: boolean
  isDark: boolean
}

export function WizardNavFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  onSubmit,
  isSubmitting,
  canProceed,
  isDark,
}: WizardNavFooterProps) {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const isSkippable = currentStep > 0 // Steps 2 & 3 are skippable

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t px-6 py-4',
        isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
      )}>
      {/* Left side: Back button */}
      <div>
        {!isFirstStep && (
          <button
            type='button'
            onClick={onBack}
            disabled={isSubmitting}
            className={cn(
              'px-3 py-1.5 text-[13px] font-medium transition-colors',
              isDark
                ? 'text-white/50 hover:text-white/70'
                : 'text-black/50 hover:text-black/70',
            )}>
            Back
          </button>
        )}
      </div>

      {/* Right side: Skip + Next/Create */}
      <div className='flex items-center gap-3'>
        {isSkippable && !isLastStep && (
          <button
            type='button'
            onClick={onSkip}
            disabled={isSubmitting}
            className={cn(
              'px-3 py-1.5 text-[13px] font-medium transition-colors',
              isDark
                ? 'text-white/40 hover:text-white/60'
                : 'text-black/40 hover:text-black/60',
            )}>
            Skip
          </button>
        )}

        {isLastStep ? (
          <Button
            onClick={onSubmit}
            variant='active'
            size='small'
            loading={isSubmitting}
            disabled={isSubmitting}>
            Create agent
          </Button>
        ) : (
          <Button
            onClick={isSkippable ? onNext : onNext}
            variant='active'
            size='small'
            disabled={!canProceed || isSubmitting}>
            {isSkippable ? 'Next' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  )
}
