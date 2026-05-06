import { useAnimation, useMotionValue, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

const PRECISE_SPRING = {
  type: 'spring',
  stiffness: 500,
  damping: 42,
  mass: 0.75,
  restSpeed: 0.5,
}

const LIGHT_SPRING = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.5,
}

const ULTRA_SPRING = {
  type: 'spring',
  stiffness: 800,
  damping: 45,
  mass: 0.4,
}

interface EncryptionToggleProps {
  showShortcut?: boolean
  isEncrypted?: boolean
  onToggle?: (value: boolean) => void
}

const EncryptionToggle: React.FC<EncryptionToggleProps> = ({
  showShortcut = true,
  isEncrypted: externalIsEncrypted,
  onToggle,
}) => {
  const [internalIsEncrypted, setInternalIsEncrypted] = useState(false)

  // Use external state if provided, otherwise use internal state
  const isEncrypted = externalIsEncrypted ?? internalIsEncrypted

  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const controls = useAnimation()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useTransform(mouseY, [-100, 100], [2, -2])
  const rotateY = useTransform(mouseX, [-100, 100], [-2, 2])

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    mouseX.set(x)
    mouseY.set(y)
  }

  useEffect(() => {
    if (isEncrypted) {
      controls.start('encrypted')
    } else {
      controls.start('decrypted')
    }
  }, [isEncrypted, controls])

  const itemVariants = {
    encrypted: { scale: 1.05 },
    decrypted: { scale: 0.95 },
  }

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isEncrypted)
    } else {
      setInternalIsEncrypted(!isEncrypted)
    }
  }

  return (
    <div className='relative flex flex-col items-center'>
      {/* Layered Ambient Effects */}
      <m.div
        className='absolute -inset-10'
        variants={{
          encrypted: {
            opacity: 0.15,
            scale: 1,
            background:
              'radial-gradient(70% 70% at 50% 50%, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 100%)',
            filter: 'blur(24px)',
          },
          decrypted: {
            opacity: 0,
            scale: 0.9,
            filter: 'blur(0px)',
          },
        }}
        animate={controls}
        transition={LIGHT_SPRING}
      />

      {/* Enhanced Depth Blur */}
      <m.div
        className='absolute -inset-6 rounded-2xl'
        style={{
          background:
            'radial-gradient(100% 100% at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 100%)',
          backdropFilter: 'blur(40px)',
        }}
        variants={{
          encrypted: { opacity: 0.08, scale: 1 },
          decrypted: { opacity: 0, scale: 0.95 },
        }}
        animate={controls}
        transition={PRECISE_SPRING}
      />

      {/* Main Button with 3D Perspective */}
      <m.button
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsPressed(false)
          mouseX.set(0)
          mouseY.set(0)
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={handleToggle}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          perspective: 800,
        }}
        className={`relative flex h-8 items-center gap-2 overflow-hidden rounded-lg ${
          isEncrypted
            ? 'bg-gradient-to-b from-white/[0.99] to-white/[0.97] dark:from-[#1C1C1E]/[0.99] dark:to-[#1C1C1E]/[0.97]'
            : 'bg-white/95 dark:bg-[#1C1C1E]/95'
        } `}
        animate={{
          width: isEncrypted ? 110 : 95,
          scale: isPressed ? 0.97 : 1,
          y: isPressed ? 0.5 : 0,
        }}
        transition={ULTRA_SPRING}>
        {/* Dynamic Glass Container */}
        <m.div
          className={`relative ml-1 flex h-6 w-6 items-center justify-center rounded-[7px] transition-all duration-300 ${
            isEncrypted
              ? 'bg-gradient-to-b from-sky-500/[0.14] via-indigo-500/[0.1] to-sky-500/[0.06]'
              : 'bg-transparent'
          } `}
          style={{
            transform: 'translateZ(0.5px)',
            boxShadow: isEncrypted
              ? 'inset 0 0.5px 0.5px rgba(255, 255, 255, 0.15), 0 0.5px 1.5px rgba(56, 189, 248, 0.2)'
              : 'none',
          }}
          animate={{
            scale: isEncrypted ? 1.05 : 1,
            rotateY: isPressed ? 25 : 0,
          }}
          transition={PRECISE_SPRING}>
          {/* Lock Icon */}
          <m.svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 20 20'
            className='h-4 w-4'
            style={{
              filter: isEncrypted
                ? 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.1))'
                : 'none',
              transform: 'translateZ(1px)',
            }}
            variants={itemVariants}
            animate={controls}
            transition={PRECISE_SPRING}>
            <defs>
              <linearGradient
                id='lockGradient'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='100%'>
                <stop offset='0%' stopColor='#0EA5E9' />
                <stop offset='45%' stopColor='#6366F1' />
                <stop offset='100%' stopColor='#818CF8' />
              </linearGradient>
            </defs>
            <m.path
              fillRule='evenodd'
              d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
              clipRule='evenodd'
              fill={isEncrypted ? 'url(#lockGradient)' : 'currentColor'}
              className={isEncrypted ? '' : 'text-gray-400 dark:text-gray-500'}
              animate={{
                rotate: isHovered ? (isEncrypted ? -8 : 8) : 0,
                scale: isPressed ? 0.9 : 1,
                opacity: isPressed ? 0.8 : 1,
              }}
              transition={ULTRA_SPRING}
              style={{ originX: 0.5, originY: 0.5 }}
            />
          </m.svg>

          {/* Premium Reflection Effect */}
          <m.div
            className='absolute inset-0 rounded-[7px]'
            style={{
              background:
                'linear-gradient(120deg, transparent, rgba(255,255,255,0.1), transparent)',
              transform: 'translateZ(0.75px)',
            }}
            animate={{
              opacity: isEncrypted ? 1 : 0,
              backgroundPosition: isHovered ? '150% 50%' : '50% 50%',
            }}
            transition={{
              opacity: PRECISE_SPRING,
              backgroundPosition: { duration: 0.8, ease: 'easeOut' },
            }}
          />
        </m.div>

        {/* Text Elements */}
        <div className='relative flex h-8 items-center'>
          <m.span
            key='encrypt'
            className='absolute left-0 text-[13px] font-medium tracking-tight text-gray-600/90 dark:text-gray-400/90'
            style={{ transform: 'translateZ(0.5px)' }}
            animate={{
              opacity: isEncrypted ? 0 : 1,
              scale: isPressed ? 0.98 : 1,
            }}
            transition={PRECISE_SPRING}>
            Encrypt
          </m.span>

          <m.div
            key='secured'
            className='absolute left-0 flex select-none items-center gap-1'
            style={{ transform: 'translateZ(0.5px)' }}
            animate={{
              opacity: isEncrypted ? 1 : 0,
              scale: isPressed ? 0.98 : 1,
            }}
            transition={PRECISE_SPRING}>
            <span className='bg-gradient-to-r from-[#0EA5E9] via-[#6366F1] to-[#818CF8] bg-clip-text text-[13px] font-medium tracking-tight text-transparent'>
              Secured
            </span>
            <m.svg
              width='14'
              height='14'
              viewBox='0 0 32 32'
              fill='none'
              style={{
                originX: 0.5,
                originY: 0.5,
                filter: 'drop-shadow(0 1px 1.5px rgba(99, 102, 241, 0.15))',
                transform: 'translateZ(0.75px)',
              }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{
                scale: isEncrypted ? [0.7, 1.15, 1] : 0.7,
                opacity: isEncrypted ? 1 : 0,
                rotate: isEncrypted ? [0, -12, 0] : 0,
              }}
              transition={{
                scale: {
                  times: [0, 0.5, 1],
                  ...PRECISE_SPRING,
                },
                rotate: {
                  times: [0, 0.5, 1],
                  ...PRECISE_SPRING,
                },
              }}>
              {/* checkmark */}
              <m.path
                d='M8 16.5L14 22.5L24 9.5'
                strokeWidth='3'
                strokeLinecap='round'
                strokeLinejoin='round'
                stroke='url(#checkmarkGradient)'
                style={{
                  originX: 0.5,
                  originY: 0.5,
                }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: isEncrypted ? [0, 1] : 0,
                  opacity: isEncrypted ? [0, 1] : 0,
                }}
                transition={{
                  pathLength: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                    mass: 0.4,
                    delay: 0.1,
                  },
                  opacity: {
                    duration: 0.1,
                    ease: 'easeOut',
                  },
                }}
              />
              {/* Inner glow effect */}
              <m.path
                d='M8 16.5L14 22.5L24 9.5'
                strokeWidth='3'
                strokeLinecap='round'
                strokeLinejoin='round'
                stroke='url(#checkmarkGlow)'
                style={{
                  position: 'absolute',
                  filter: 'blur(4px)',
                  opacity: 0.4,
                }}
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: isEncrypted ? [0, 1] : 0,
                  opacity: isEncrypted ? [0, 0.4] : 0,
                }}
                transition={{
                  pathLength: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                    mass: 0.4,
                    delay: 0.1,
                  },
                  opacity: {
                    duration: 0.1,
                    ease: 'easeOut',
                  },
                }}
              />
              {/* Outer glow effect */}
              <m.path
                d='M8 16.5L14 22.5L24 9.5'
                strokeWidth='4'
                strokeLinecap='round'
                strokeLinejoin='round'
                stroke='url(#checkmarkOuterGlow)'
                style={{
                  position: 'absolute',
                  filter: 'blur(8px)',
                  opacity: 0.15,
                }}
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: isEncrypted ? [0, 1] : 0,
                  opacity: isEncrypted ? [0, 0.15] : 0,
                }}
                transition={{
                  pathLength: {
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                    mass: 0.4,
                    delay: 0.05,
                  },
                  opacity: {
                    duration: 0.15,
                    ease: 'easeOut',
                  },
                }}
              />
              <defs>
                <linearGradient
                  id='checkmarkGradient'
                  x1='8'
                  y1='9.5'
                  x2='24'
                  y2='22.5'
                  gradientUnits='userSpaceOnUse'>
                  <stop offset='0%' stopColor='#38BDF8' />
                  <stop offset='50%' stopColor='#6366F1' />
                  <stop offset='100%' stopColor='#818CF8' />
                </linearGradient>
                <linearGradient
                  id='checkmarkGlow'
                  x1='8'
                  y1='9.5'
                  x2='24'
                  y2='22.5'
                  gradientUnits='userSpaceOnUse'>
                  <stop offset='0%' stopColor='#38BDF8' />
                  <stop offset='100%' stopColor='#6366F1' />
                </linearGradient>
                <linearGradient
                  id='checkmarkOuterGlow'
                  x1='8'
                  y1='9.5'
                  x2='24'
                  y2='22.5'
                  gradientUnits='userSpaceOnUse'>
                  <stop offset='0%' stopColor='#38BDF8' />
                  <stop offset='100%' stopColor='#818CF8' />
                </linearGradient>
              </defs>
            </m.svg>
          </m.div>
        </div>

        {/* Premium Hover Effect */}
        <m.div
          className='absolute inset-0 rounded-lg'
          style={{
            background:
              'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 100px)',
            transform: 'translateZ(0.25px)',
          }}
          animate={{
            opacity: isHovered && !isPressed ? 1 : 0,
            scale: isPressed ? 0.98 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      </m.button>
      {showShortcut && (
        <span className='pt-1 text-xxs text-gray-500'>
          <code className='rounded border border-gray-200 px-1 py-0.5 text-gray-400'>
            ⌘ + E
          </code>
        </span>
      )}
    </div>
  )
}

export default EncryptionToggle
