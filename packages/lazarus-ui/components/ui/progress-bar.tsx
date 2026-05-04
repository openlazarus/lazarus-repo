'use client'

import * as m from 'motion/react-m'

interface ProgressBarProps {
  label: string
  value: string
  percentage: number
  isDark?: boolean
  delay?: number
  isGradient?: boolean
}

export function ProgressBar({
  label,
  value,
  percentage,
  isDark = false,
  delay = 0,
  isGradient = false,
}: ProgressBarProps) {
  return (
    <div>
      <div className='mb-3 flex justify-between'>
        <span className='text-[16px] font-medium tracking-[-0.01em]'>
          {label}
        </span>
        <span className='text-[18px] font-semibold tracking-[-0.01em]'>
          {value}
        </span>
      </div>
      <div
        className={`h-[3px] w-full rounded-full ${
          isDark ? 'bg-white/10' : 'bg-[#e5e5e7]'
        }`}>
        <m.div
          className={`h-[3px] rounded-full ${
            isGradient
              ? 'bg-gradient-to-r from-[#0098FC] to-[#00D4FF]'
              : 'bg-[#0098FC]'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  )
}
