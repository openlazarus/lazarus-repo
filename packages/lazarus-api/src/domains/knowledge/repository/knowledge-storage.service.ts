import * as fs from 'fs/promises'
import * as path from 'path'
import { randomUUID } from 'crypto'
import {
  KnowledgeArtifact,
  KnowledgeGraph,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeGraphStats,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  ArtifactType,
  ITagCount,
  TMemoryScope,
} from '@domains/knowledge/types/knowledge.types'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import type { IKnowledgeStorageService } from './knowledge-storage.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('knowledge-storage')

export class KnowledgeStorageService implements IKnowledgeStorageService {
  private async getWorkspacePath(workspaceId: string): Promise<string> {
    return resolveWorkspacePath(workspaceId)
  }

  /**
   * Resolve the base directory for knowledge artifacts.
   * - No agentId → workspace-shared `.knowledge/`
   * - With agentId → agent-private `.agents/{agentId}/memory/`
   */
  private async resolveBaseDir(workspaceId: string, agentId?: string): Promise<string> {
    const workspacePath = await this.getWorkspacePath(workspaceId)
    if (agentId) {
      return path.join(workspacePath, '.agents', agentId, 'memory')
    }
    return path.join(workspacePath, '.knowledge')
  }

  private baseDirRelativePrefix(agentId?: string): string {
    return agentId ? '' : '.knowledge/'
  }

  async saveArtifact(
    workspaceId: string,
    artifact: KnowledgeArtifact,
    agentId?: string,
  ): Promise<KnowledgeArtifact> {
    const baseDir = await this.resolveBaseDir(workspaceId, agentId)

    const now = new Date().toISOString()
    if (!artifact.id) artifact.id = randomUUID()
    if (!artifact.createdAt) artifact.createdAt = now
    if (!artifact.updatedAt) artifact.updatedAt = now
    if (!artifact.backlinks) artifact.backlinks = []

    const typeDir = path.join(baseDir, `${artifact.type}s`)
    await fs.mkdir(typeDir, { recursive: true })

    const fileName = this.generateFileName(artifact)
    const filePath = path.join(typeDir, fileName)
    const relativeFilePath = path.relative(baseDir, filePath)
    artifact.filePath = relativeFilePath

    const markdown = this.generateMarkdown(artifact)
    await fs.writeFile(filePath, markdown, 'utf-8')

    await this.updateIndex(baseDir, artifact)

    log.info(
      `Saved artifact: ${agentId ? `agent:${agentId}` : 'workspace'}/${artifact.type}/${fileName}`,
    )

    return artifact
  }

  async getArtifact(
    workspaceId: string,
    artifactId: string,
    agentId?: string,
  ): Promise<KnowledgeArtifact | null> {
    const baseDir = await this.resolveBaseDir(workspaceId, agentId)
    const indexPath = path.join(baseDir, 'index.json')

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(indexContent)

      const artifactMeta = index.artifacts?.find((a: any) => a.id === artifactId)
      if (!artifactMeta) {
        return null
      }

      let relativePath = artifactMeta.filePath || artifactMeta.path
      if (!relativePath) {
        log.error(`No file path found for artifact ${artifactId}`)
        return null
      }

      const legacyPrefix = this.baseDirRelativePrefix()
      if (legacyPrefix && relativePath.startsWith(legacyPrefix)) {
        relativePath = relativePath.substring(legacyPrefix.length)
      }

      const filePath = path.join(baseDir, relativePath)
      const markdown = await fs.readFile(filePath, 'utf-8')

      return this.parseMarkdown(markdown, artifactMeta)
    } catch (error) {
      log.error({ err: error }, `Error getting artifact ${artifactId}:`)
      return null
    }
  }

  async getKnowledgeGraph(workspaceId: string, agentId?: string): Promise<KnowledgeGraph> {
    const baseDir = await this.resolveBaseDir(workspaceId, agentId)
    const indexPath = path.join(baseDir, 'index.json')

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(indexContent)

      const artifacts: KnowledgeArtifact[] = index.artifacts || []
      let nodes: KnowledgeGraphNode[] = index.nodes || []
      const edges: KnowledgeGraphEdge[] = index.edges || []

      // Derive nodes from artifacts if the index has artifacts but no nodes
      // (happens when saveArtifact was called without a subsequent graph rebuild).
      if (nodes.length === 0 && artifacts.length > 0) {
        nodes = artifacts.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          tags: a.tags || [],
          importance: a.metadata?.importance,
          createdAt: a.createdAt,
          filePath: a.filePath,
        }))
      }

      const stats = nodes.length > 0 ? this.computeStats(nodes, edges) : this.getEmptyStats()

      return { nodes, edges, stats }
    } catch (error) {
      log.error({ err: error }, `Error getting knowledge graph:`)
      return {
        nodes: [],
        edges: [],
        stats: this.getEmptyStats(),
      }
    }
  }

  async updateKnowledgeGraph(workspaceId: string, agentId?: string): Promise<KnowledgeGraph> {
    const baseDir = await this.resolveBaseDir(workspaceId, agentId)
    const indexPath = path.join(baseDir, 'index.json')

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(indexContent)

      const artifacts: KnowledgeArtifact[] = index.artifacts || []

      const nodes: KnowledgeGraphNode[] = artifacts.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        tags: a.tags,
        importance: a.metadata.importance,
        createdAt: a.createdAt,
        filePath: a.filePath,
      }))

      const edges: KnowledgeGraphEdge[] = []
      const backlinkMap = new Map<string, string[]>()

      for (const artifact of artifacts) {
        for (const link of artifact.links) {
          const targetArtifact = artifacts.find((a) => a.title === link)
          if (targetArtifact) {
            edges.push({
              source: artifact.id,
              target: targetArtifact.id,
              type: 'reference',
            })

            if (!backlinkMap.has(targetArtifact.id)) {
              backlinkMap.set(targetArtifact.id, [])
            }
            backlinkMap.get(targetArtifact.id)!.push(artifact.id)
          }
        }
      }

      for (const artifact of artifacts) {
        artifact.backlinks = backlinkMap.get(artifact.id) || []
      }

      const stats = this.computeStats(nodes, edges)

      const updatedIndex = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        artifacts,
        nodes,
        edges,
        stats,
      }

      await fs.writeFile(indexPath, JSON.stringify(updatedIndex, null, 2), 'utf-8')

      return { nodes, edges, stats }
    } catch (error) {
      log.error({ err: error }, `Error updating knowledge graph:`)
      throw error
    }
  }

  async searchKnowledge(
    workspaceId: string,
    query: KnowledgeSearchQuery,
    agentId?: string,
  ): Promise<KnowledgeSearchResult> {
    const baseDir = await this.resolveBaseDir(workspaceId, agentId)
    const indexPath = path.join(baseDir, 'index.json')

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(indexContent)

      let artifacts: KnowledgeArtifact[] = index.artifacts || []

      if (query.types && query.types.length > 0) {
        artifacts = artifacts.filter((a) => query.types!.includes(a.type))
      }

      if (query.tags && query.tags.length > 0) {
        artifacts = artifacts.filter((a) => query.tags!.some((tag) => a.tags.includes(tag)))
      }

      if (query.query) {
        const searchTerm = query.query.toLowerCase()
        artifacts = artifacts.filter(
          (a) =>
            a.title.toLowerCase().includes(searchTerm) ||
            a.content.toLowerCase().includes(searchTerm),
        )
      }

      if (query.dateRange) {
        artifacts = artifacts.filter((a) => {
          const date = new Date(a.createdAt)
          const from = new Date(query.dateRange!.from)
          const to = new Date(query.dateRange!.to)
          return date >= from && date <= to
        })
      }

      if (query.relatedTo) {
        artifacts = artifacts.filter(
          (a) => a.links.includes(query.relatedTo!) || a.backlinks.includes(query.relatedTo!),
        )
      }

      const typeFacets: Record<ArtifactType, number> = {
        event: 0,
        concept: 0,
        pattern: 0,
        context: 0,
      }
      const tagFacets: Record<string, number> = {}

      for (const artifact of artifacts) {
        typeFacets[artifact.type]++
        for (const tag of artifact.tags) {
          tagFacets[tag] = (tagFacets[tag] || 0) + 1
        }
      }

      const total = artifacts.length
      const offset = query.offset || 0
      const limit = query.limit || 50
      artifacts = artifacts.slice(offset, offset + limit)

      return {
        artifacts,
        total,
        facets: {
          types: typeFacets,
          tags: tagFacets,
        },
      }
    } catch (error) {
      log.error({ err: error }, `Error searching knowledge:`)
      return {
        artifacts: [],
        total: 0,
        facets: { types: { event: 0, concept: 0, pattern: 0, context: 0 }, tags: {} },
      }
    }
  }

  /**
   * Aggregate tag counts across one or both scopes.
   * - scope "workspace": only `.knowledge/`
   * - scope "agent": only `.agents/{agentId}/memory/` (requires agentId)
   * - scope "both" or omitted: merge counts from both layers
   */
  async listTags(
    workspaceId: string,
    agentId?: string,
    scope: TMemoryScope = 'both',
  ): Promise<ITagCount[]> {
    const counts = new Map<string, number>()

    const includeWorkspace = scope === 'workspace' || scope === 'both'
    const includeAgent = (scope === 'agent' || scope === 'both') && !!agentId

    if (includeWorkspace) {
      await this.accumulateTags(await this.resolveBaseDir(workspaceId), counts)
    }
    if (includeAgent) {
      await this.accumulateTags(await this.resolveBaseDir(workspaceId, agentId), counts)
    }

    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }

  async deleteArtifact(
    workspaceId: string,
    artifactId: string,
    agentId?: string,
  ): Promise<boolean> {
    const baseDir = await this.resolveBaseDir(workspaceId, agentId)
    const indexPath = path.join(baseDir, 'index.json')

    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(indexContent)
      const artifacts: KnowledgeArtifact[] = index.artifacts || []

      const target = artifacts.find((a) => a.id === artifactId)
      if (!target) return false

      let relativePath = target.filePath
      const legacyPrefix = this.baseDirRelativePrefix()
      if (legacyPrefix && relativePath.startsWith(legacyPrefix)) {
        relativePath = relativePath.substring(legacyPrefix.length)
      }
      const filePath = path.join(baseDir, relativePath)

      await fs.unlink(filePath).catch(() => undefined)

      index.artifacts = artifacts.filter((a) => a.id !== artifactId)
      index.nodes = (index.nodes || []).filter((n: any) => n.id !== artifactId)
      index.edges = (index.edges || []).filter(
        (e: any) => e.source !== artifactId && e.target !== artifactId,
      )
      index.stats = this.computeStats(index.nodes, index.edges)
      index.lastUpdated = new Date().toISOString()

      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
      log.info(`Deleted artifact ${artifactId} from ${agentId ? `agent:${agentId}` : 'workspace'}`)
      return true
    } catch (error) {
      log.error({ err: error }, `Error deleting artifact ${artifactId}`)
      return false
    }
  }

  private async accumulateTags(baseDir: string, counts: Map<string, number>): Promise<void> {
    const indexPath = path.join(baseDir, 'index.json')
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(indexContent)
      const artifacts: KnowledgeArtifact[] = index.artifacts || []
      for (const a of artifacts) {
        for (const tag of a.tags || []) {
          counts.set(tag, (counts.get(tag) || 0) + 1)
        }
      }
    } catch {
      // no index yet — empty contribution
    }
  }

  private generateFileName(artifact: KnowledgeArtifact): string {
    const slug = artifact.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (artifact.type === 'event' && artifact.metadata.date) {
      return `${artifact.metadata.date}-${slug}.md`
    }

    return `${slug}.md`
  }

  private generateMarkdown(artifact: KnowledgeArtifact): string {
    const frontmatter = [
      '---',
      `type: ${artifact.type}`,
      `id: ${artifact.id}`,
      artifact.metadata.date ? `date: ${artifact.metadata.date}` : null,
      artifact.tags.length > 0 ? `tags: [${artifact.tags.join(', ')}]` : null,
      artifact.links.length > 0
        ? `related: [${artifact.links.map((l) => `[[${l}]]`).join(', ')}]`
        : null,
      artifact.metadata.importance ? `importance: ${artifact.metadata.importance}` : null,
      '---',
    ]
      .filter(Boolean)
      .join('\n')

    let content = `${frontmatter}\n\n# ${artifact.title}\n\n${artifact.content}`

    if (artifact.backlinks && artifact.backlinks.length > 0) {
      content += `\n\n## Backlinks\n\n`
      content += artifact.backlinks.map((id) => `- [[${id}]]`).join('\n')
    }

    return content
  }

  private parseMarkdown(markdown: string, meta: any): KnowledgeArtifact {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/)
    const frontmatter: any = {}

    if (frontmatterMatch) {
      const lines = frontmatterMatch[1]!.split('\n')
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':')
        if (key && valueParts.length > 0) {
          frontmatter[key.trim()] = valueParts.join(':').trim()
        }
      }
    }

    const contentMatch = markdown.replace(/^---\n[\s\S]*?\n---\n\n/, '')

    const wikilinkRegex = /\[\[(.*?)\]\]/g
    const links: string[] = []
    let match
    while ((match = wikilinkRegex.exec(contentMatch)) !== null) {
      links.push(match[1]!)
    }

    return {
      id: meta.id,
      type: meta.type,
      title: meta.title,
      content: contentMatch,
      metadata: meta.metadata || frontmatter.metadata || {},
      links: meta.links || links,
      backlinks: meta.backlinks || [],
      tags:
        meta.tags ||
        (frontmatter.tags
          ? frontmatter.tags
              .replace(/[[\]]/g, '')
              .split(',')
              .map((t: string) => t.trim())
          : []),
      filePath: meta.filePath || meta.path,
      createdAt: meta.createdAt || meta.created || new Date().toISOString(),
      updatedAt: meta.updatedAt || meta.updated || new Date().toISOString(),
    }
  }

  private async updateIndex(baseDir: string, artifact: KnowledgeArtifact): Promise<void> {
    const indexPath = path.join(baseDir, 'index.json')

    let index: any
    try {
      const content = await fs.readFile(indexPath, 'utf-8')
      index = JSON.parse(content)
    } catch {
      index = {
        version: '1.0',
        artifacts: [],
        nodes: [],
        edges: [],
        stats: this.getEmptyStats(),
        lastUpdated: '',
      }
    }

    const existingIndex = index.artifacts.findIndex((a: any) => a.id === artifact.id)
    if (existingIndex >= 0) {
      index.artifacts[existingIndex] = artifact
    } else {
      index.artifacts.push(artifact)
    }

    // Keep nodes in sync so the knowledge graph view reflects the change
    // without requiring a separate updateGraph call.
    const node: KnowledgeGraphNode = {
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      tags: artifact.tags || [],
      importance: artifact.metadata?.importance,
      createdAt: artifact.createdAt,
      filePath: artifact.filePath,
    }
    const nodes: KnowledgeGraphNode[] = index.nodes || []
    const existingNodeIdx = nodes.findIndex((n: KnowledgeGraphNode) => n.id === artifact.id)
    if (existingNodeIdx >= 0) {
      nodes[existingNodeIdx] = node
    } else {
      nodes.push(node)
    }
    index.nodes = nodes
    index.edges = index.edges || []
    index.stats = this.computeStats(nodes, index.edges)
    index.lastUpdated = new Date().toISOString()

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
  }

  private computeStats(
    nodes: KnowledgeGraphNode[],
    edges: KnowledgeGraphEdge[],
  ): KnowledgeGraphStats {
    const artifactsByType: Record<ArtifactType, number> = {
      event: 0,
      concept: 0,
      pattern: 0,
      context: 0,
    }

    const connectionCounts = new Map<string, number>()
    const tags = new Set<string>()

    for (const node of nodes) {
      artifactsByType[node.type]++
      node.tags.forEach((tag) => tags.add(tag))
      connectionCounts.set(node.id, 0)
    }

    for (const edge of edges) {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1)
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1)
    }

    const mostConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, connections]) => {
        const node = nodes.find((n) => n.id === id)
        return {
          id,
          title: node?.title || 'Unknown',
          connections,
        }
      })

    return {
      totalArtifacts: nodes.length,
      artifactsByType,
      totalTags: tags.size,
      totalLinks: edges.length,
      mostConnected,
    }
  }

  private getEmptyStats(): KnowledgeGraphStats {
    return {
      totalArtifacts: 0,
      artifactsByType: { event: 0, concept: 0, pattern: 0, context: 0 },
      totalTags: 0,
      totalLinks: 0,
      mostConnected: [],
    }
  }
}
