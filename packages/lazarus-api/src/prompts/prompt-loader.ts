/**
 * Prompt Loader
 * Loads system prompts from markdown files in the prompts directory
 */

import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@utils/logger'

const log = createLogger('prompt-loader')

const PROMPTS_DIR = path.join(__dirname, '../../prompts')

/**
 * Load a system prompt from a markdown file
 *
 * @param promptPath - Path to prompt file relative to prompts directory (without .md extension)
 * @example loadPrompt('agents/main-agent')
 * @example loadPrompt('specialists/sqlite-specialist')
 */
const interpolatePromptVars = (content: string): string => {
  const apiBase = process.env.PUBLIC_API_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8000'
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  return content
    .replace(/\{\{LAZARUS_API_BASE\}\}/g, apiBase)
    .replace(/\{\{FRONTEND_URL\}\}/g, frontendUrl)
}

export async function loadPrompt(promptPath: string): Promise<string> {
  const fullPath = path.join(PROMPTS_DIR, `${promptPath}.md`)

  try {
    const content = await fs.readFile(fullPath, 'utf-8')
    return interpolatePromptVars(removeFrontmatter(content)).trim()
  } catch (error) {
    log.error({ err: error, fullPath, promptPath }, 'Failed to load prompt')
    throw new Error(`Prompt file not found: ${promptPath}.md`)
  }
}

/**
 * Load a prompt synchronously (for use in constructors)
 */
export function loadPromptSync(promptPath: string): string {
  const fullPath = path.join(PROMPTS_DIR, `${promptPath}.md`)

  try {
    const content = fsSync.readFileSync(fullPath, 'utf-8')
    return interpolatePromptVars(removeFrontmatter(content)).trim()
  } catch (error) {
    log.error({ err: error, fullPath, promptPath }, 'Failed to load prompt')
    throw new Error(`Prompt file not found: ${promptPath}.md`)
  }
}

/**
 * Remove YAML frontmatter from markdown content
 */
function removeFrontmatter(content: string): string {
  // Check if content starts with frontmatter delimiter
  if (!content.startsWith('---')) {
    return content
  }

  // Find the closing delimiter
  const lines = content.split('\n')
  let endIndex = -1

  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    // No closing delimiter found, return original
    return content
  }

  // Return content after frontmatter
  return lines.slice(endIndex + 1).join('\n')
}

/**
 * Get list of available prompts
 */
export async function listPrompts(): Promise<{ agents: string[]; specialists: string[] }> {
  const agentsDir = path.join(PROMPTS_DIR, 'agents')
  const specialistsDir = path.join(PROMPTS_DIR, 'specialists')

  const [agentFiles, specialistFiles] = await Promise.all([
    fs.readdir(agentsDir).catch(() => []),
    fs.readdir(specialistsDir).catch(() => []),
  ])

  const agents = agentFiles
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => f.replace('.md', ''))

  const specialists = specialistFiles
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => f.replace('.md', ''))

  return { agents, specialists }
}

/**
 * Prompt cache for performance
 */
const promptCache = new Map<string, string>()

/**
 * Load prompt with caching
 */
export async function loadPromptCached(promptPath: string): Promise<string> {
  if (promptCache.has(promptPath)) {
    return promptCache.get(promptPath)!
  }

  const prompt = await loadPrompt(promptPath)
  promptCache.set(promptPath, prompt)
  return prompt
}

/**
 * Clear prompt cache (useful for development/hot reload)
 */
export function clearPromptCache(): void {
  promptCache.clear()
}

/**
 * Reload a specific prompt (clears cache and loads fresh)
 */
export async function reloadPrompt(promptPath: string): Promise<string> {
  promptCache.delete(promptPath)
  return loadPromptCached(promptPath)
}
