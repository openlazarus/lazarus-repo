import { Router } from 'express'
import { SearchQuerySchema } from '../domains/knowledge/types/knowledge.schemas'
import { requireAuth } from '@middleware/auth'
import { validateQuery } from '@middleware/validate'
import { knowledgeController } from '@domains/knowledge/controller/knowledge.controller'

export const knowledgeRouter = Router()

// Workspace-scoped knowledge (.knowledge/)
knowledgeRouter.get('/workspaces/knowledge', requireAuth(), (req, res) =>
  knowledgeController.getGraph(req, res),
)
knowledgeRouter.get('/workspaces/knowledge/tags', requireAuth(), (req, res) =>
  knowledgeController.listTags(req, res),
)
knowledgeRouter.get(
  '/workspaces/knowledge/search',
  requireAuth(),
  validateQuery(SearchQuerySchema),
  (req, res) => knowledgeController.search(req, res),
)
knowledgeRouter.get(
  '/workspaces/knowledge/:type(events|concepts|patterns|contexts)',
  requireAuth(),
  (req, res) => knowledgeController.getByType(req, res),
)
knowledgeRouter.get('/workspaces/knowledge/artifacts/:artifactId', requireAuth(), (req, res) =>
  knowledgeController.getArtifact(req, res),
)
knowledgeRouter.delete('/workspaces/knowledge/artifacts/:artifactId', requireAuth(), (req, res) =>
  knowledgeController.deleteArtifact(req, res),
)
knowledgeRouter.post('/workspaces/knowledge/analyze', requireAuth(), (req, res) =>
  knowledgeController.analyze(req, res),
)
knowledgeRouter.post('/workspaces/knowledge/update-graph', requireAuth(), (req, res) =>
  knowledgeController.updateGraph(req, res),
)

// Agent-scoped memory (.agents/{agentId}/memory/)
knowledgeRouter.get('/workspaces/agents/:agentId/memory', requireAuth(), (req, res) =>
  knowledgeController.getGraph(req, res),
)
knowledgeRouter.get('/workspaces/agents/:agentId/memory/tags', requireAuth(), (req, res) =>
  knowledgeController.listTags(req, res),
)
knowledgeRouter.get(
  '/workspaces/agents/:agentId/memory/search',
  requireAuth(),
  validateQuery(SearchQuerySchema),
  (req, res) => knowledgeController.search(req, res),
)
knowledgeRouter.get(
  '/workspaces/agents/:agentId/memory/:type(events|concepts|patterns|contexts)',
  requireAuth(),
  (req, res) => knowledgeController.getByType(req, res),
)
knowledgeRouter.get(
  '/workspaces/agents/:agentId/memory/artifacts/:artifactId',
  requireAuth(),
  (req, res) => knowledgeController.getArtifact(req, res),
)
knowledgeRouter.delete(
  '/workspaces/agents/:agentId/memory/artifacts/:artifactId',
  requireAuth(),
  (req, res) => knowledgeController.deleteArtifact(req, res),
)
knowledgeRouter.post('/workspaces/agents/:agentId/memory/update-graph', requireAuth(), (req, res) =>
  knowledgeController.updateGraph(req, res),
)

// Aggregated memory across workspace + all agents
knowledgeRouter.get('/workspaces/memory/all', requireAuth(), (req, res) =>
  knowledgeController.getAllMemory(req, res),
)
knowledgeRouter.get('/workspaces/memory/scope-counts', requireAuth(), (req, res) =>
  knowledgeController.getScopeCounts(req, res),
)
