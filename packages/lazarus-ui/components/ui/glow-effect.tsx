import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'

interface GlowEffectProps {
  className?: string
  intensity?: 'light' | 'medium' | 'strong'
  color?: 'blue' | 'purple' | 'mixed'
}

export const GlowEffect = ({
  className,
  intensity = 'medium',
  color = 'blue',
}: GlowEffectProps) => {
  // Map intensity to opacity values
  const intensityMap = {
    light: [0.05, 0.08, 0.05],
    medium: [0.1, 0.15, 0.1],
    strong: [0.2, 0.25, 0.2],
  }

  // Map color to gradient values
  const colorMap = {
    blue: `
      radial-gradient(circle at 20% 50%, rgba(0, 152, 252, ${intensityMap[intensity][1]}), transparent 25%),
      radial-gradient(circle at 80% 50%, rgba(59, 130, 246, ${intensityMap[intensity][1]}), transparent 25%)
    `,
    purple: `
      radial-gradient(circle at 20% 50%, rgba(147, 51, 234, ${intensityMap[intensity][1]}), transparent 25%),
      radial-gradient(circle at 80% 50%, rgba(192, 132, 252, ${intensityMap[intensity][1]}), transparent 25%)
    `,
    mixed: `
      radial-gradient(circle at 15% 50%, rgba(0, 152, 252, ${intensityMap[intensity][1]}), transparent 25%),
      radial-gradient(circle at 85% 50%, rgba(147, 51, 234, ${intensityMap[intensity][1]}), transparent 25%)
    `,
  }

  return (
    <m.div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[18px]',
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: intensityMap[intensity] }}
      transition={{ duration: 3, repeat: Infinity }}
      style={{
        background: colorMap[color],
      }}
    />
  )
}
