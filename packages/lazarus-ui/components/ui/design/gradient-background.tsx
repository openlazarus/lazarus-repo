'use client'

interface BackgroundProps {
  pattern: 'radial' | 'linear' | 'mesh' | 'squares' | 'noise' | 'flow'
  theme?: 'purple' | 'blue' | 'green'
  className?: string
}

const themeConfigs = {
  purple: {
    gradient: 'from-purple-900/20 via-black to-black',
    accent: 'rgba(147, 51, 234, 0.1)',
  },
  blue: {
    gradient: 'from-blue-900/20 via-black to-black',
    accent: 'rgba(59, 130, 246, 0.1)',
  },
  green: {
    gradient: 'from-emerald-900/20 via-black to-black',
    accent: 'rgba(16, 185, 129, 0.1)',
  },
}

export default function Background({
  pattern,
  theme = 'purple',
  className = '',
}: BackgroundProps) {
  const { gradient, accent } = themeConfigs[theme]

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Base Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${gradient} mix-blend-soft-light`}
      />

      {/* Pattern Overlays */}
      {pattern === 'radial' && (
        <div className='absolute inset-0 animate-pulse-slow opacity-50'>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className='absolute rounded-full transition-transform'
              style={{
                width: `${200 + i * 200}px`,
                height: `${200 + i * 200}px`,
                border: `1px solid ${accent}`,
                left: `calc(50% - ${100 + i * 100}px)`,
                top: `calc(50% - ${100 + i * 100}px)`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `float ${3 + i}s ease-in-out infinite alternate`,
                transitionDuration: '3000ms',
              }}
            />
          ))}
        </div>
      )}

      {pattern === 'squares' && (
        <div
          className='absolute inset-0 opacity-30'
          style={{
            backgroundImage: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
            backgroundSize: '200px 200px',
          }}
        />
      )}

      {pattern === 'linear' && (
        <div
          className='absolute inset-0 opacity-30'
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 1px, transparent 1px, transparent 40px), 
                             repeating-linear-gradient(0deg, ${accent} 0px, ${accent} 1px, transparent 1px, transparent 40px)`,
          }}
        />
      )}

      {pattern === 'mesh' && (
        <div className='absolute inset-0 opacity-30'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>
      )}

      {pattern === 'noise' && (
        <div
          className='absolute inset-0 opacity-40'
          style={{
            filter: 'contrast(170%) brightness(1000%)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'soft-light',
          }}
        />
      )}

      {pattern === 'flow' && (
        <div className='absolute inset-0 opacity-30'>
          <div
            className='absolute inset-0 animate-flow'
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 40px,
                  ${accent} 40px,
                  ${accent} 41px
                ),
                repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 40px,
                  ${accent} 40px,
                  ${accent} 41px
                )
              `,
              backgroundSize: '200% 200%',
            }}
          />
        </div>
      )}
    </div>
  )
}
