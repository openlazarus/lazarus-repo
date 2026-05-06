import { KnowledgeStorageService } from '@domains/knowledge/repository/knowledge-storage.service'
import { KnowledgeArtifact } from '@domains/knowledge/types/knowledge.types'
import { createLogger } from '@utils/logger'

const log = createLogger('memory-prompt-builder')

const storage = new KnowledgeStorageService()

/**
 * Build the "Your Memory" section injected into agent system prompts.
 * Always returns tool guidance so agents know memory tools exist, even on an
 * empty memory. Failures degrade to an empty string — never throws.
 */
export async function buildMemoryBlock(workspaceId: string, agentId: string): Promise<string> {
  try {
    const [tagCounts, wsRecent, agentPrivate] = await Promise.all([
      storage.listTags(workspaceId, agentId, 'both').catch(() => []),
      storage
        .searchKnowledge(workspaceId, { limit: 10 })
        .catch(() => ({ artifacts: [] as KnowledgeArtifact[] })),
      storage
        .searchKnowledge(workspaceId, { limit: 15 }, agentId)
        .catch(() => ({ artifacts: [] as KnowledgeArtifact[] })),
    ])

    const lines: string[] = ['\n## Your Memory\n']

    if (tagCounts.length > 0) {
      lines.push('### Tag vocabulary (existing tags, use these when searching)')
      for (const { tag, count } of tagCounts.slice(0, 30)) {
        lines.push(`- ${tag} (${count})`)
      }
      lines.push('')
    }

    if (wsRecent.artifacts.length > 0) {
      lines.push('### Recent workspace knowledge (shared)')
      const byRecency = [...wsRecent.artifacts].sort((a, b) =>
        (b.updatedAt || '').localeCompare(a.updatedAt || ''),
      )
      for (const artifact of byRecency.slice(0, 10)) {
        const importance = artifact.metadata?.importance ? ` [${artifact.metadata.importance}]` : ''
        const preview =
          (artifact.content || '').split('\n').find((l: string) => l.trim().length > 0) || ''
        lines.push(`- [${artifact.type}] ${artifact.title}${importance} — ${preview.slice(0, 120)}`)
      }
      lines.push('')
    }

    if (agentPrivate.artifacts.length > 0) {
      lines.push('### Your private memory (this agent only)')
      for (const artifact of agentPrivate.artifacts.slice(0, 15)) {
        const preview =
          (artifact.content || '').split('\n').find((l: string) => l.trim().length > 0) || ''
        lines.push(`- [${artifact.type}] ${artifact.title} — ${preview.slice(0, 120)}`)
      }
      lines.push('')
    }

    const noMemoryYet =
      tagCounts.length === 0 &&
      wsRecent.artifacts.length === 0 &&
      agentPrivate.artifacts.length === 0
    if (noMemoryYet) {
      lines.push(
        "You don't have any saved memories yet. Start building your knowledge: when the user shares something worth remembering across conversations (facts, decisions, preferences, events), save it with `memory_save`.",
        '',
      )
    }

    lines.push('### Memory tools (always available to you)')
    lines.push(
      '- `memory_save({scope, type, title, content, tags, importance})` — Persist knowledge. Default scope is `workspace` (shared); use `agent` for things specific to your own interactions. Types: event, concept, pattern, context.',
      '- `memory_search({query, types?, tags?, scope?})` — Search existing memory before creating duplicates. Default scope is `both` (workspace + your private memory).',
      '- `memory_read({artifactId})` — Read a specific memory.',
      '- `memory_update({artifactId, scope, content?, tags?, importance?})` — Prefer this over creating a new artifact when the topic already exists.',
      '- `memory_list_tags({scope?})` — Discover existing tags before filtering a search.',
      '- `memory_delete({artifactId, scope, userConfirmed})` — **Use sparingly.** Never delete autonomously. When you see contradictory info, tell the user the existing memory and ask before deleting. The tool refuses unless `userConfirmed: true`.',
    )

    return lines.join('\n')
  } catch (error) {
    log.warn({ err: error, agentId }, 'Failed to build memory block')
    return ''
  }
}
