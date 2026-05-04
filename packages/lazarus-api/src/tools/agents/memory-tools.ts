/**
 * Memory Tools — agent-facing interface to the knowledge/memory system.
 *
 * Two layers:
 *  - workspace: `.knowledge/` — shared across all agents in the workspace.
 *  - agent:     `.agents/{agentId}/memory/` — private to this agent.
 *
 * Agents default to saving into the workspace layer so knowledge is shared
 * by default. Agents should choose scope="agent" only for private
 * per-agent context (preferences, behavior patterns, interaction history).
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { KnowledgeStorageService } from '@domains/knowledge/repository/knowledge-storage.service'
import type {
  ArtifactType,
  KnowledgeArtifact,
  TMemoryScope,
} from '@domains/knowledge/types/knowledge.types'
import { createLogger } from '@utils/logger'

const log = createLogger('memory-tools')

const knowledgeStorage = new KnowledgeStorageService()

function getContext() {
  const ctx = getExecutionContext()
  if (!ctx.agentId || !ctx.workspaceId) {
    throw new Error(
      `Memory tools require execution context: AGENT_ID=${ctx.agentId}, WORKSPACE_ID=${ctx.workspaceId}`,
    )
  }
  return ctx
}

function formatResponse(data: Record<string, unknown>): {
  content: { type: 'text'; text: string }[]
} {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function resolveAgentIdForScope(
  scope: TMemoryScope | 'workspace' | 'agent',
  agentId: string,
): string | undefined {
  if (scope === 'agent') return agentId
  if (scope === 'workspace') return undefined
  return undefined
}

const ArtifactTypeEnum = z.enum(['event', 'concept', 'pattern', 'context'])
const ImportanceEnum = z.enum(['low', 'medium', 'high'])
const SaveScopeEnum = z.enum(['workspace', 'agent'])
const ReadScopeEnum = z.enum(['workspace', 'agent', 'both'])

const memorySave = tool(
  'memory_save',
  'Save a piece of knowledge you want to remember. Defaults to scope="workspace" so facts are shared with other agents — only use scope="agent" for private context (this agent\'s own preferences, interaction patterns). Types: "event" (something that happened, dated), "concept" (domain knowledge / facts), "pattern" (a recurring workflow or behavior), "context" (project/environment background). Use tags to categorize — prefer hierarchical naming like "user/preferences", "tech/postgres", "project/onboarding" for discoverability. Importance is how load-bearing this memory is ("high" = critical, "low" = trivia).',
  {
    type: ArtifactTypeEnum.describe('Artifact type'),
    title: z
      .string()
      .describe('Short, human-readable title — serves as the unique identifier for wikilinks'),
    content: z
      .string()
      .describe('Markdown body. Use [[other-title]] wikilinks to connect to related memories.'),
    tags: z
      .array(z.string())
      .default([])
      .describe('Tags for categorization, prefer hierarchical (e.g. "user/preferences")'),
    scope: SaveScopeEnum.default('workspace').describe(
      'workspace = shared (default), agent = private to this agent',
    ),
    importance: ImportanceEnum.default('medium').describe('How load-bearing this memory is'),
    date: z
      .string()
      .optional()
      .describe('ISO date for events (YYYY-MM-DD) — required for type="event"'),
    links: z
      .array(z.string())
      .default([])
      .describe('Titles of related artifacts to link via wikilink'),
  },
  async (args) => {
    const ctx = getContext()
    const agentIdArg = resolveAgentIdForScope(args.scope, ctx.agentId)

    const artifact: KnowledgeArtifact = {
      id: '',
      type: args.type as ArtifactType,
      title: args.title,
      content: args.content,
      metadata: {
        importance: args.importance,
        ...(args.date ? { date: args.date } : {}),
      },
      links: args.links,
      backlinks: [],
      tags: args.tags,
      filePath: '',
      createdAt: '',
      updatedAt: '',
    }

    try {
      const saved = await knowledgeStorage.saveArtifact(ctx.workspaceId, artifact, agentIdArg)
      return formatResponse({
        success: true,
        id: saved.id,
        scope: args.scope,
        filePath: saved.filePath,
      })
    } catch (error) {
      log.error({ err: error }, 'memory_save failed')
      return formatResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
)

const memorySearch = tool(
  'memory_search',
  'Search your memory. Returns matching artifacts plus tag facets (related tags for refinement). Default scope is "both" — searches workspace + your private memory together. Use tags filter to narrow; if unsure what tags exist, call memory_list_tags first.',
  {
    query: z.string().optional().describe('Free text search across title and content'),
    types: z.array(ArtifactTypeEnum).optional().describe('Filter by artifact types'),
    tags: z.array(z.string()).optional().describe('Only return artifacts matching these tags'),
    scope: ReadScopeEnum.default('both').describe('workspace, agent (this agent only), or both'),
    limit: z.number().int().min(1).max(200).default(20),
  },
  async (args) => {
    const ctx = getContext()
    const searchQuery = {
      query: args.query,
      types: args.types as ArtifactType[] | undefined,
      tags: args.tags,
      limit: args.limit,
    }

    try {
      const scope = args.scope
      const results: Array<{ scope: 'workspace' | 'agent'; artifact: KnowledgeArtifact }> = []
      const tagFacets: Record<string, number> = {}
      let total = 0

      if (scope === 'workspace' || scope === 'both') {
        const wsResult = await knowledgeStorage.searchKnowledge(ctx.workspaceId, searchQuery)
        total += wsResult.total
        for (const a of wsResult.artifacts) results.push({ scope: 'workspace', artifact: a })
        for (const [tag, count] of Object.entries(wsResult.facets.tags)) {
          tagFacets[tag] = (tagFacets[tag] || 0) + count
        }
      }
      if (scope === 'agent' || scope === 'both') {
        const agentResult = await knowledgeStorage.searchKnowledge(
          ctx.workspaceId,
          searchQuery,
          ctx.agentId,
        )
        total += agentResult.total
        for (const a of agentResult.artifacts) results.push({ scope: 'agent', artifact: a })
        for (const [tag, count] of Object.entries(agentResult.facets.tags)) {
          tagFacets[tag] = (tagFacets[tag] || 0) + count
        }
      }

      return formatResponse({
        success: true,
        total,
        results: results.slice(0, args.limit).map(({ scope: s, artifact }) => ({
          scope: s,
          id: artifact.id,
          type: artifact.type,
          title: artifact.title,
          tags: artifact.tags,
          importance: artifact.metadata.importance,
          updatedAt: artifact.updatedAt,
          preview: artifact.content.slice(0, 300),
        })),
        tagFacets,
      })
    } catch (error) {
      log.error({ err: error }, 'memory_search failed')
      return formatResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
)

const memoryRead = tool(
  'memory_read',
  "Read the full content of a specific memory artifact by ID. Specify scope if you know which layer it's in; otherwise the tool tries both.",
  {
    artifactId: z
      .string()
      .describe('The artifact ID (uuid) returned from memory_search or memory_save'),
    scope: ReadScopeEnum.default('both').describe('Which layer to look in'),
  },
  async (args) => {
    const ctx = getContext()
    try {
      const scope = args.scope

      if (scope === 'workspace') {
        const artifact = await knowledgeStorage.getArtifact(ctx.workspaceId, args.artifactId)
        return artifact
          ? formatResponse({ success: true, scope: 'workspace', artifact })
          : formatResponse({ success: false, error: 'not found in workspace scope' })
      }

      if (scope === 'agent') {
        const artifact = await knowledgeStorage.getArtifact(
          ctx.workspaceId,
          args.artifactId,
          ctx.agentId,
        )
        return artifact
          ? formatResponse({ success: true, scope: 'agent', artifact })
          : formatResponse({ success: false, error: 'not found in agent scope' })
      }

      const wsArtifact = await knowledgeStorage.getArtifact(ctx.workspaceId, args.artifactId)
      if (wsArtifact)
        return formatResponse({ success: true, scope: 'workspace', artifact: wsArtifact })

      const agentArtifact = await knowledgeStorage.getArtifact(
        ctx.workspaceId,
        args.artifactId,
        ctx.agentId,
      )
      if (agentArtifact)
        return formatResponse({ success: true, scope: 'agent', artifact: agentArtifact })

      return formatResponse({ success: false, error: 'not found in either scope' })
    } catch (error) {
      log.error({ err: error }, 'memory_read failed')
      return formatResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
)

const memoryUpdate = tool(
  'memory_update',
  'Update an existing memory artifact. Pass the fields you want to change (content, tags, importance). The artifact is re-saved with updated timestamps and graph links re-computed on next graph rebuild.',
  {
    artifactId: z.string().describe('The artifact ID to update'),
    scope: SaveScopeEnum.default('workspace').describe('Which layer the artifact lives in'),
    content: z.string().optional(),
    tags: z.array(z.string()).optional(),
    importance: ImportanceEnum.optional(),
    title: z
      .string()
      .optional()
      .describe('Renaming will break existing wikilinks; only rename if necessary'),
  },
  async (args) => {
    const ctx = getContext()
    const agentIdArg = resolveAgentIdForScope(args.scope, ctx.agentId)

    try {
      const existing = await knowledgeStorage.getArtifact(
        ctx.workspaceId,
        args.artifactId,
        agentIdArg,
      )
      if (!existing) {
        return formatResponse({ success: false, error: 'artifact not found in this scope' })
      }

      if (args.content !== undefined) existing.content = args.content
      if (args.tags !== undefined) existing.tags = args.tags
      if (args.importance !== undefined) existing.metadata.importance = args.importance
      if (args.title !== undefined) existing.title = args.title
      existing.updatedAt = new Date().toISOString()

      const saved = await knowledgeStorage.saveArtifact(ctx.workspaceId, existing, agentIdArg)
      return formatResponse({ success: true, artifact: saved })
    } catch (error) {
      log.error({ err: error }, 'memory_update failed')
      return formatResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
)

const memoryDelete = tool(
  'memory_delete',
  'DELETE a memory artifact. ⚠️ USE SPARINGLY. Do NOT call this autonomously when you encounter contradictory information — instead, tell the user what the existing memory says, explain the contradiction you just learned about, and ask whether they want it deleted. Only call memory_delete after the user explicitly confirms (or explicitly asks you to delete something by title/topic). Memory loss is hard to undo; users often prefer to update rather than delete.',
  {
    artifactId: z.string().describe('The artifact ID to delete'),
    scope: SaveScopeEnum.describe(
      'Which layer the artifact lives in — you must know this before deleting',
    ),
    userConfirmed: z
      .boolean()
      .describe(
        'Set true ONLY if the user explicitly told you to delete this. Set false otherwise — the tool will refuse to delete.',
      ),
  },
  async (args) => {
    const ctx = getContext()
    const agentIdArg = resolveAgentIdForScope(args.scope, ctx.agentId)

    if (!args.userConfirmed) {
      return formatResponse({
        success: false,
        error:
          'memory_delete refused: userConfirmed=false. Ask the user before deleting — surface the memory first and request explicit permission.',
      })
    }

    try {
      const deleted = await knowledgeStorage.deleteArtifact(
        ctx.workspaceId,
        args.artifactId,
        agentIdArg,
      )
      if (!deleted) {
        return formatResponse({ success: false, error: 'artifact not found' })
      }
      log.info(
        { artifactId: args.artifactId, scope: args.scope, agentId: ctx.agentId },
        'memory deleted with user confirmation',
      )
      return formatResponse({ success: true, deleted: true })
    } catch (error) {
      log.error({ err: error }, 'memory_delete failed')
      return formatResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
)

const memoryListTags = tool(
  'memory_list_tags',
  'List tags currently used across your memory, with counts. Call this BEFORE memory_search({tags: [...]}) if you want to pick tags that actually exist. Returns tags sorted by frequency (most-used first).',
  {
    scope: ReadScopeEnum.default('both').describe('Which layer(s) to scan'),
    limit: z.number().int().min(1).max(500).default(50),
  },
  async (args) => {
    const ctx = getContext()
    try {
      const tags = await knowledgeStorage.listTags(ctx.workspaceId, ctx.agentId, args.scope)
      return formatResponse({
        success: true,
        scope: args.scope,
        tags: tags.slice(0, args.limit),
      })
    } catch (error) {
      log.error({ err: error }, 'memory_list_tags failed')
      return formatResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
)

export const memoryTools = [
  memorySave,
  memorySearch,
  memoryRead,
  memoryUpdate,
  memoryDelete,
  memoryListTags,
]

export function createMemoryToolsServer() {
  return createSdkMcpServer({ name: 'memory-tools', version: '1.0.0', tools: memoryTools })
}
