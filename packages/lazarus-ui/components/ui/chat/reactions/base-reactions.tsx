import * as m from 'motion/react-m'
import { memo } from 'react'

// 3D Accept reaction component with advanced animations
export function AcceptReaction() {
  return (
    <div className='reaction-icon-wrapper accept'>
      {/* 3D Card effect base */}
      <m.div
        className='reaction-3d-base'
        animate={{
          rotateX: [0, -8, 0, 4, 0],
          rotateY: [0, 12, 4, -4, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          times: [0, 0.2, 0.5, 0.8, 1],
        }}>
        <m.div className='reaction-3d-icon'>
          <m.svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            initial={{ opacity: 0, y: 5 }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))',
            }}
            transition={{
              delay: 0.1,
              duration: 0.4,
            }}>
            <m.path
              d='M4 12.4L9.5 18L20 7'
              stroke='white'
              strokeWidth='4'
              strokeLinecap='round'
              strokeLinejoin='round'
              initial={{
                pathLength: 0,
                strokeDasharray: 30,
                strokeDashoffset: 30,
              }}
              animate={{
                pathLength: 1,
                strokeDashoffset: 0,
              }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
            />
          </m.svg>
        </m.div>
      </m.div>
    </div>
  )
}

// 3D Reject reaction component with advanced animations
export function RejectReaction() {
  return (
    <div className='reaction-icon-wrapper reject'>
      {/* 3D Card effect base */}
      <m.div
        className='reaction-3d-base'
        animate={{
          rotateX: [0, 8, 0, -4, 0],
          rotateY: [0, -12, -4, 4, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          times: [0, 0.2, 0.5, 0.8, 1],
        }}>
        <m.div className='reaction-3d-icon'>
          <m.svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            initial={{ opacity: 0, y: 5 }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))',
            }}
            transition={{
              delay: 0.1,
              duration: 0.4,
            }}>
            <m.path
              d='M18 6L6 18'
              stroke='white'
              strokeWidth='4'
              strokeLinecap='round'
              strokeLinejoin='round'
              initial={{
                pathLength: 0,
                strokeDasharray: 20,
                strokeDashoffset: 20,
              }}
              animate={{
                pathLength: 1,
                strokeDashoffset: 0,
              }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
            />
            <m.path
              d='M6 6L18 18'
              stroke='white'
              strokeWidth='4'
              strokeLinecap='round'
              strokeLinejoin='round'
              initial={{
                pathLength: 0,
                strokeDasharray: 20,
                strokeDashoffset: 20,
              }}
              animate={{
                pathLength: 1,
                strokeDashoffset: 0,
              }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.35,
              }}
            />
          </m.svg>
        </m.div>
      </m.div>
    </div>
  )
}

// Accept animation particles effect
function AcceptParticles() {
  return (
    <div className='accept-particles-container'>
      {Array.from({ length: 8 }).map((_, i) => (
        <m.div
          key={i}
          className='accept-particle'
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#33a9fd',
            top: '50%',
            left: '50%',
            zIndex: 10,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            x: [0, Math.cos(i * (Math.PI / 4)) * 20],
            y: [0, Math.sin(i * (Math.PI / 4)) * 20],
            transition: {
              duration: 0.8,
              ease: 'easeOut',
            },
          }}
        />
      ))}
    </div>
  )
}

// Enhanced Reaction Bubble Component
export interface ReactionBubbleProps {
  reaction: 'accept' | 'reject' | null
}

export function ReactionBubble({ reaction }: ReactionBubbleProps) {
  if (!reaction) return null

  const isAccept = reaction === 'accept'

  return (
    <div className='reaction-bubble-perspective'>
      <m.div
        className={`reaction-bubble ${reaction}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          transition: {
            type: 'spring',
            stiffness: 500,
            damping: 15,
            delayChildren: 0.3,
          },
        }}
        whileTap={{
          scale: 0.9,
          transition: { duration: 0.1 },
        }}>
        {isAccept ? <AcceptReaction /> : <RejectReaction />}

        {/* Dynamic shadow for 3D effect */}
        <m.div
          className={`reaction-shadow ${reaction}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: 0.25,
            scale: 1.05,
            transition: { duration: 0.5 },
          }}
        />

        {/* Only show particles for accept */}
        {isAccept && <AcceptParticles />}
      </m.div>
    </div>
  )
}

// Typing Indicator Component with iMessage style
export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <m.div
      className='typing-indicator'
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.2 },
      }}
      exit={{ opacity: 0 }}>
      <m.span
        initial={{ y: 0 }}
        animate={{
          y: [0, -3, 0],
          opacity: [0.6, 1, 0.6],
          transition: {
            duration: 1.3,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 0,
          },
        }}
      />
      <m.span
        initial={{ y: 0 }}
        animate={{
          y: [0, -3, 0],
          opacity: [0.6, 1, 0.6],
          transition: {
            duration: 1.3,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 0,
            delay: 0.2,
          },
        }}
      />
      <m.span
        initial={{ y: 0 }}
        animate={{
          y: [0, -3, 0],
          opacity: [0.6, 1, 0.6],
          transition: {
            duration: 1.3,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 0,
            delay: 0.4,
          },
        }}
      />
    </m.div>
  )
})

// Tapback component (new iMessage reaction)
export interface TapbackProps {
  type:
    | 'thumbsUp'
    | 'thumbsDown'
    | 'heart'
    | 'haha'
    | 'exclamation'
    | 'question'
}

export function Tapback({ type }: TapbackProps) {
  // This would implement the iMessage tapback feature
  return (
    <m.div
      className='tapback'
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 15,
        },
      }}>
      {type === 'thumbsUp' && '+1'}
      {type === 'thumbsDown' && '-1'}
      {type === 'heart' && '<3'}
      {type === 'haha' && 'LOL'}
      {type === 'exclamation' && '!!'}
      {type === 'question' && '?'}
    </m.div>
  )
}
