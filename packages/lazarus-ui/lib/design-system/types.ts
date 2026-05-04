export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'active'
  | 'destructive'
  | 'outline'
  | 'link'
export type ButtonSize = 'small' | 'medium' | 'large'
export type ButtonShape = 'pill' | 'rounded'

export type CardVariant = 'standard' | 'gradient' | 'outlined'

export type TagVariant = 'primary' | 'neutral' | 'gradient' | 'outlined'

export interface ColorSwatchProps {
  name: string
  hex: string
  rgb: string
  className: string
  isDarkSwatch?: boolean
}
