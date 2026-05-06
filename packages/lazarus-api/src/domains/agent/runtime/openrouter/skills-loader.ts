import { promises as fs } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { createLogger } from '@utils/logger'

const log = createLogger('openrouter-skills-loader')

export interface TSkill {
  name: string
  description: string
  whenToUse?: string
  body: string
  source: 'user' | 'project'
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw)
  if (!match) return { meta: {}, body: raw }
  const metaBlock = match[1] ?? ''
  const body = match[2] ?? ''
  const meta: Record<string, string> = {}
  for (const line of metaBlock.split('\n')) {
    const m = /^(\w+)\s*:\s*(.*)$/.exec(line.trim())
    if (m && m[1]) meta[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '').trim()
  }
  return { meta, body }
}

async function loadFromDir(dir: string, source: 'user' | 'project'): Promise<TSkill[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return []
  }
  const skills: TSkill[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue
    try {
      const raw = await fs.readFile(join(dir, entry), 'utf8')
      const { meta, body } = parseFrontmatter(raw)
      const name = meta.name || entry.replace(/\.md$/, '')
      const description = meta.description || ''
      skills.push({ name, description, whenToUse: meta.when_to_use, body: body.trim(), source })
    } catch (err) {
      log.warn({ err, file: entry }, 'failed to load skill')
    }
  }
  return skills
}

const cache = new Map<string, TSkill[]>()

export async function loadSkills(cwd?: string): Promise<TSkill[]> {
  const key = `${homedir()}::${cwd ?? ''}`
  const cached = cache.get(key)
  if (cached) return cached

  const userSkills = await loadFromDir(join(homedir(), '.claude', 'skills'), 'user')
  const projectSkills = cwd ? await loadFromDir(join(cwd, '.claude', 'skills'), 'project') : []

  const merged = new Map<string, TSkill>()
  for (const s of userSkills) merged.set(s.name, s)
  for (const s of projectSkills) merged.set(s.name, s) // project overrides user

  const list = [...merged.values()]
  cache.set(key, list)
  return list
}

export function renderSkillsBlock(skills: TSkill[]): string {
  if (skills.length === 0) return ''
  const lines = ['## Available Skills', '']
  for (const s of skills) {
    lines.push(`### ${s.name}`)
    if (s.description) lines.push(s.description)
    if (s.whenToUse) lines.push(`When to use: ${s.whenToUse}`)
    if (s.body) lines.push('', s.body)
    lines.push('')
  }
  return lines.join('\n')
}
