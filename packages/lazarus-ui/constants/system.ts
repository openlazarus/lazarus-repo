// constants/system.ts
export const COLORS = {
  colorBarColors: [
    '#0098FC', // Blue
    '#BF5AF2', // Purple
    '#FF375F', // Red
    '#FE9F0C', // Orange
    '#FFCC00', // Yellow
    '#31D158', // Green
  ].filter(Boolean), // Ensure no empty values
} as const

export const NAV_WIDTHS = {
  TABLET: '350px',
  DESKTOP: '650px',
  MOBILE: 'w-full',
} as const
