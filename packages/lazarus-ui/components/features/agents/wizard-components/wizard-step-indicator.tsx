'use client'

import { cn } from '@/lib/utils'

const STEPS = ['Identity', 'Plan', 'Guardrails']

interface WizardStepIndicatorProps {
  currentStep: number
  isDark: boolean
}

export function WizardStepIndicator({
  currentStep,
  isDark,
}: WizardStepIndicatorProps) {
  return (
    <div className='flex justify-end px-6 pt-6'>
      <div className='flex items-center gap-5'>
        {STEPS.map((label, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          const isActive = isCompleted || isCurrent

          return (
            <div key={label} className='flex flex-col items-center gap-1.5'>
              <span
                className={cn(
                  'text-[14px] font-semibold transition-colors duration-300',
                  isCurrent
                    ? isDark
                      ? 'text-white'
                      : 'text-[#1a1a1a]'
                    : isActive
                      ? isDark
                        ? 'text-white/50'
                        : 'text-black/50'
                      : isDark
                        ? 'text-white/25'
                        : 'text-black/25',
                )}>
                {label}
              </span>
              <div
                className={cn(
                  'h-[2px] w-full rounded-full transition-colors duration-500',
                  isActive
                    ? 'bg-[#0098FC]'
                    : isDark
                      ? 'bg-white/[0.06]'
                      : 'bg-black/[0.04]',
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
