'use client'

import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

export default function Curve() {
  const [height, setHeight] = useState(800)

  useEffect(() => {
    setHeight(window.innerHeight)
    const handleResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const initialPath = `M100 0 L100 ${height} Q-20 ${height / 2} 100 0`
  const targetPath = `M100 0 L100 ${height} Q100 ${height / 2} 100 0`

  const curve = {
    initial: {
      d: initialPath,
    },
    enter: {
      d: targetPath,
      transition: { duration: 1, ease: [0.76, 0, 0.24, 1] },
    },
    exit: {
      d: initialPath,
      transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] },
    },
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: '-100px',
        width: '100px',
        height: '100%',
        fill: 'hsl(30, 10%, 96%)',
        stroke: 'none',
        pointerEvents: 'none',
      }}>
      <m.path
        variants={curve}
        initial='initial'
        animate='enter'
        exit='exit'></m.path>
    </svg>
  )
}
