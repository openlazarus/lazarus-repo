'use client'
import * as m from 'motion/react-m'
import { ClipboardEvent, KeyboardEvent, useRef } from 'react'

import { cn } from '@/lib/utils'

interface OtpInputProps {
  length?: number
  value: string[]
  onChange: (value: string[]) => void
  error?: string | null
  isLoading?: boolean
  isDark?: boolean
}

const OtpInput = ({
  length = 6,
  value,
  onChange,
  error,
  isLoading = false,
  isDark = false,
}: OtpInputProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, inputValue: string) => {
    // Only accept single digits
    const digit = inputValue.replace(/\D/g, '').slice(-1)

    const newOtp = [...value]
    newOtp[index] = digit
    onChange(newOtp)

    // Move to next input if value is entered
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()

      // If current input has value, clear it
      if (value[index]) {
        const newOtp = [...value]
        newOtp[index] = ''
        onChange(newOtp)
      }
      // If current input is empty, clear previous input and move focus
      else if (index > 0) {
        const newOtp = [...value]
        newOtp[index - 1] = ''
        onChange(newOtp)
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const digits = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)

    const newOtp = [...value]
    digits.split('').forEach((char, index) => {
      if (index < length) {
        newOtp[index] = char
      }
    })
    onChange(newOtp)

    // Focus last filled input or first empty input
    const lastFilledIndex = newOtp.findLastIndex((val) => val !== '')
    const focusIndex =
      lastFilledIndex < length - 1 ? lastFilledIndex + 1 : lastFilledIndex
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div className='space-y-3'>
      <div className='flex justify-center gap-2 sm:gap-2.5'>
        {[...Array(length)].map((_, i) => (
          <m.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: i * 0.05 },
            }}>
            <input
              ref={(el) => {
                inputRefs.current[i] = el
              }}
              type='text'
              inputMode='numeric'
              pattern='[0-9]*'
              maxLength={1}
              value={value[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={cn(
                'h-16 w-[55px] rounded-lg px-0 py-2 text-center text-[22px] font-semibold transition-all duration-200 ease-out sm:h-[72px] sm:w-16 sm:text-[24px]',
                'ring-2 ring-transparent focus:outline-none',
                '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                isDark
                  ? 'bg-white/[0.08] text-foreground placeholder:text-foreground/50'
                  : 'bg-[#fafafa] text-[#1d1d1f] placeholder:text-[#86868b]',
                !error && 'focus:ring-[#0098FC]',
                error && 'ring-red-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              autoFocus={i === 0}
              disabled={isLoading}
            />
          </m.div>
        ))}
      </div>
      {error && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
          className='text-sm text-red-500'>
          {error}
        </m.div>
      )}
    </div>
  )
}

export default OtpInput
