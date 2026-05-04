import { Request, Response } from 'express'
import { KnowledgeStorageService } from '@domains/knowledge/repository/knowledge-storage.service'
import { ConversationAnalyzerService } from '@domains/conversation/service/conversation-analyzer.service'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import type { SearchQuery } from '@domains/knowledge/types/knowledge.schemas'
import type {
  ArtifactType,
  KnowledgeArtifact,
  TMemoryScope,
} from '@domains/knowledge/types/knowledge.types'
import { BadRequestError, NotFoundError } from '@errors/api-errors'

const knowledgeStorage = new KnowledgeStorageService()
const conversationAnalyzer = new ConversationAnalyzerService()
const workspaceAgentService = new WorkspaceAgentService()

const VALID_SCOPES: ReadonlySet<TMemoryScope> = new Set(['workspace', 'agent', 'both'])

class KnowledgeController {
  async getGraph(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId

    const graph = await knowledgeStorage.getKnowledgeGraph(workspaceId, agentId)

    res.json({
      graph,
      workspaceId,
      agentId: agentId ?? null,
    })
  }

  async search(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId

    const validated = req.query as SearchQuery

    const query = {
      query: validated.q,
      types: validated.types?.split(',') as ArtifactType[] | undefined,
      tags: validated.tags?.split(','),
      dateRange:
        validated.from && validated.to ? { from: validated.from, to: validated.to } : undefined,
      relatedTo: validated.relatedTo,
      limit: validated.limit ? parseInt(validated.limit) : undefined,
      offset: validated.offset ? parseInt(validated.offset) : undefined,
    }

    const results = await knowledgeStorage.searchKnowledge(workspaceId, query, agentId)

    res.json({
      ...results,
      workspaceId,
      agentId: agentId ?? null,
      query: validated,
    })
  }

  async getByType(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId
    const type = req.params.type!

    if (!['events', 'concepts', 'patterns', 'contexts'].includes(type)) {
      throw new BadRequestError('Invalid artifact type')
    }

    const artifactType = type.slice(0, -1) as ArtifactType

    const results = await knowledgeStorage.searchKnowledge(
      workspaceId,
      { types: [artifactType] },
      agentId,
    )

    res.json({
      artifacts: results.artifacts,
      total: results.total,
      type: artifactType,
      workspaceId,
      agentId: agentId ?? null,
    })
  }

  async getArtifact(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId
    const artifactId = req.params.artifactId!

    const artifact = await knowledgeStorage.getArtifact(workspaceId, artifactId, agentId)

    if (!artifact) {
      throw new NotFoundError('Artifact', artifactId)
    }

    const backlinkArtifacts = []
    for (const backlinkId of artifact.backlinks) {
      const backlink = await knowledgeStorage.getArtifact(workspaceId, backlinkId, agentId)
      if (backlink) {
        backlinkArtifacts.push({
          id: backlink.id,
          type: backlink.type,
          title: backlink.title,
          filePath: backlink.filePath,
        })
      }
    }

    res.json({
      artifact,
      backlinks: backlinkArtifacts,
      workspaceId,
      agentId: agentId ?? null,
    })
  }

  async analyze(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const userId = req.user!.id
    const { conversationId } = req.body

    if (!conversationId) {
      throw new BadRequestError('conversationId required')
    }

    const analysis = await conversationAnalyzer.analyzeConversation(
      conversationId,
      workspaceId,
      userId,
      'team',
    )

    res.json({
      analysis,
      conversationId,
      workspaceId,
      message: 'Conversation queued for librarian analysis',
    })
  }

  async updateGraph(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId

    const graph = await knowledgeStorage.updateKnowledgeGraph(workspaceId, agentId)

    res.json({
      success: true,
      graph,
      workspaceId,
      agentId: agentId ?? null,
    })
  }

  async listTags(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId
    const scopeParam = (req.query.scope as string) || (agentId ? 'agent' : 'workspace')

    if (!VALID_SCOPES.has(scopeParam as TMemoryScope)) {
      throw new BadRequestError(`Invalid scope: ${scopeParam}`)
    }

    const tags = await knowledgeStorage.listTags(workspaceId, agentId, scopeParam as TMemoryScope)

    res.json({ tags, workspaceId, agentId: agentId ?? null, scope: scopeParam })
  }

  async deleteArtifact(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const agentId = req.params.agentId
    const artifactId = req.params.artifactId!

    const deleted = await knowledgeStorage.deleteArtifact(workspaceId, artifactId, agentId)

    if (!deleted) {
      throw new NotFoundError('Artifact', artifactId)
    }

    res.json({
      deleted: true,
      artifactId,
      workspaceId,
      agentId: agentId ?? null,
    })
  }

  async getAllMemory(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const userId = req.user!.id

    const [workspaceResult, agents] = await Promise.all([
      knowledgeStorage.searchKnowledge(workspaceId, { limit: 1000 }),
      workspaceAgentService.listAgents(workspaceId, userId, false),
    ])

    const agentEntries = await Promise.all(
      agents.map(async (agent) => {
        const result = await knowledgeStorage.searchKnowledge(
          workspaceId,
          { limit: 1000 },
          agent.id,
        )
        return {
          agentId: agent.id,
          agentName: agent.name,
          artifacts: result.artifacts,
          total: result.total,
        }
      }),
    )

    res.json({
      workspace: {
        artifacts: workspaceResult.artifacts,
        total: workspaceResult.total,
      },
      agents: agentEntries,
      workspaceId,
    })
  }

  async getScopeCounts(req: Request, res: Response) {
    const workspaceId = req.workspaceId!
    const userId = req.user!.id

    const [workspaceGraph, agents] = await Promise.all([
      knowledgeStorage.getKnowledgeGraph(workspaceId),
      workspaceAgentService.listAgents(workspaceId, userId, false),
    ])

    const agentCounts = await Promise.all(
      agents.map(async (agent) => {
        const graph = await knowledgeStorage.getKnowledgeGraph(workspaceId, agent.id)
        return {
          agentId: agent.id,
          agentName: agent.name,
          count: graph.stats.totalArtifacts,
        }
      }),
    )

    res.json({
      workspace: workspaceGraph.stats.totalArtifacts,
      agents: agentCounts,
      workspaceId,
    })
  }
}

export const knowledgeController = new KnowledgeController()
export type { KnowledgeArtifact }
