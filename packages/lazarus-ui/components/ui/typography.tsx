'use client'

import { ReactNode } from 'react'

import { TYPOGRAPHY, TypographyVariant } from '@/lib/design-system/ui-constants'

import { AnimatedText } from './animated-text'

interface TypographyProps {
  variant: TypographyVariant
  children: ReactNode
  animated?: boolean
  delay?: number
  className?: string
}

// Responsive typography configurations
const responsiveStyles: Record<TypographyVariant, string> = {
  display: 'text-[48px] sm:text-[64px] md:text-[80px] lg:text-[96px]',
  h1: 'text-[32px] sm:text-[40px] md:text-[48px] lg:text-[56px]',
  h1Dashboard: 'text-[28px] sm:text-[32px] md:text-[36px] lg:text-[40px]',
  h2: 'text-[28px] sm:text-[36px] md:text-[44px] lg:text-[56px]',
  h2Dashboard: 'text-[17px]',
  h3: 'text-[24px] sm:text-[28px] md:text-[30px] lg:text-[32px]',
  h3Dashboard: 'text-[18px] sm:text-[19px] md:text-[20px]',
  h4: 'text-[20px] sm:text-[22px] md:text-[24px] lg:text-[26px]',
  h4Dashboard: 'text-[16px] sm:text-[17px] md:text-[18px]',
  bodyLarge: 'text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px]',
  bodyLargeRegular: 'text-[18px] sm:text-[20px] md:text-[22px] lg:text-[24px]',
  body: 'text-[15px] sm:text-[16px] md:text-[17px]',
  bodyRegular: 'text-[15px] sm:text-[16px] md:text-[17px]',
  bodyMono: 'text-[14px] sm:text-[15px] md:text-[16px] font-mono',
  caption: 'text-[11px] sm:text-[12px] md:text-[13px]',
  captionMono: 'text-[10px] sm:text-[11px] md:text-[12px] font-mono',
}

export function Typography({
  variant,
  children,
  animated = false,
  delay = 0.1, // Small default delay to ensure animation is visible
  className = '',
}: TypographyProps) {
  const styles = TYPOGRAPHY.variants[variant]

  if (!styles) {
    console.error(
      `Typography variant "${variant}" not found in TYPOGRAPHY.variants`,
    )
    // Fallback to body variant if the requested variant doesn't exist
    const fallbackStyles = TYPOGRAPHY.variants.body
    const style = {
      fontWeight: fallbackStyles.fontWeight,
      letterSpacing: fallbackStyles.letterSpacing,
      lineHeight: fallbackStyles.lineHeight,
    }
    return (
      <div style={style} className={`${responsiveStyles.body} ${className}`}>
        {children}
      </div>
    )
  }

  const style = {
    fontWeight: styles.fontWeight,
    letterSpacing: styles.letterSpacing,
    lineHeight: styles.lineHeight,
    ...('textTransform' in styles && { textTransform: styles.textTransform }),
    ...('fontFamily' in styles && { fontFamily: styles.fontFamily }),
  }

  const responsiveClass = responsiveStyles[variant]

  if (animated && typeof children === 'string') {
    const animationType =
      variant === 'display'
        ? 'display'
        : variant === 'body' ||
            variant === 'bodyRegular' ||
            variant === 'bodyLarge' ||
            variant === 'bodyLargeRegular' ||
            variant === 'bodyMono'
          ? 'paragraph'
          : 'word'

    return (
      <div style={style} className={`${responsiveClass} ${className}`}>
        <AnimatedText text={children} type={animationType} delay={delay} />
      </div>
    )
  }

  return (
    <div style={style} className={`${responsiveClass} ${className}`}>
      {children}
    </div>
  )
}
