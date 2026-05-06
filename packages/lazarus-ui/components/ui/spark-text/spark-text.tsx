import React from 'react'

import styles from './spark-text.module.css'

interface SparkTextProps {
  text: string
  fontSize?: string
  fontWeight?: number
}

const SparkText: React.FC<SparkTextProps> = ({
  text = 'Lazarus is thinking ...',
  fontSize = 'text-5xl',
  fontWeight = 400,
}) => {
  return (
    <h2 className={`text-center ${fontSize}`} style={{ fontWeight }}>
      {text.split('').map((child, idx) => (
        <span className={styles.hoverText} key={idx}>
          {child}
        </span>
      ))}
    </h2>
  )
}

export default SparkText
