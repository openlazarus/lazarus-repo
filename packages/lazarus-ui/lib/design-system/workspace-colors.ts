/**
 * Workspace color palette
 * Elegant gradient colors with white blend - soft, pastel-like colors
 * that are professional and compatible with the design system.
 */
export const WORKSPACE_COLORS = [
  '#7DD3FC', // Sky blue (light, airy)
  '#C4B5FD', // Lavender (soft purple)
  '#FCA5A5', // Rose (soft red)
  '#FDBA74', // Peach (warm orange)
  '#FDE047', // Lemon (soft yellow)
  '#86EFAC', // Mint (soft green)
  '#A5B4FC', // Periwinkle (blue-purple)
  '#F9A8D4', // Pink (soft magenta)
] as const

export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number]

/**
 * Get a random workspace color from the palette
 */
export function getRandomWorkspaceColor(): WorkspaceColor {
  const randomIndex = Math.floor(Math.random() * WORKSPACE_COLORS.length)
  return WORKSPACE_COLORS[randomIndex]
}

/**
 * Check if a color is a valid workspace color
 */
export function isWorkspaceColor(color: string): color is WorkspaceColor {
  return WORKSPACE_COLORS.includes(color as WorkspaceColor)
}
