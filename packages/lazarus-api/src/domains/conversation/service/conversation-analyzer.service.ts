import type { ConversationAnalysis } from '../../knowledge/types/knowledge.types'
import type { IConversationAnalyzerService } from './conversation-analyzer.service.interface'
import { conversationMetadata } from './conversation-metadata.service'
import { createLogger } from '@utils/logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import { homedir } from 'os'
import { STORAGE_BASE_PATH } from '@infrastructure/config/storage'

const log = createLogger('conversation-analyzer')

/**
 * Conversation Analyzer Service
 * Analyzes conversation transcripts and extracts knowledge using Claude API
 */
export class ConversationAnalyzerService implements IConversationAnalyzerService {
  private basePath: string

  constructor() {
    this.basePath = STORAGE_BASE_PATH
  }

  /**
   * Analyze a conversation and extract insights using Claude API
   */
  async analyzeConversation(
    conversationId: string,
    workspaceId: string,
    userId: string,
    _scope: 'team' | 'agent' = 'team',
  ): Promise<ConversationAnalysis> {
    log.info({ conversationId }, 'Analyzing conversation')

    // Get conversation metadata
    const conversation = await conversationMetadata.getConversation(
      conversationId,
      userId,
      workspaceId,
    )

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Read JSONL transcript
    const transcript = await this.readTranscript(conversation.sessionId, workspaceId, userId)

    if (!transcript || transcript.length === 0) {
      log.info({ conversationId }, 'No transcript found for conversation')
      return {
        conversationId,
        workspaceId,
        userId,
        analyzedAt: new Date().toISOString(),
        insights: [],
        extractedConcepts: [],
        keyDecisions: [],
        codePatterns: [],
        suggestedArtifacts: [],
      }
    }

    // Extract conversation text
    const conversationText = this.extractConversationText(transcript)

    log.info({ charCount: conversationText.length }, 'Extracted conversation text')

    // Call Claude API with analysis prompt
    // NOTE: The actual analysis will be done by the Librarian Specialist agent
    // This service just prepares the data for the agent
    return {
      conversationId,
      workspaceId,
      userId,
      analyzedAt: new Date().toISOString(),
      conversationText, // Pass this to the agent
      insights: [],
      extractedConcepts: [],
      keyDecisions: [],
      codePatterns: [],
      suggestedArtifacts: [],
    } as any
  }

  /**
   * Read JSONL transcript from Claude SDK storage
   */
  private async readTranscript(
    sessionId: string,
    workspaceId: string,
    userId: string,
  ): Promise<any[]> {
    try {
      // Construct absolute workspace path
      const workspacePath = path.resolve(this.basePath, 'users', userId, 'workspaces', workspaceId)

      // Normalize path for Claude SDK (replace / with -, leading / becomes leading -)
      const normalizedPath =
        '-' +
        workspacePath
          .split('/')
          .filter((p) => p)
          .join('-')

      // Claude SDK stores transcripts in ~/.claude/projects/{normalized-path}/{sessionId}.jsonl
      const claudeDir = path.join(homedir(), '.claude', 'projects', normalizedPath)
      const transcriptPath = path.join(claudeDir, `${sessionId}.jsonl`)

      log.info({ transcriptPath }, 'Reading transcript')

      const content = await fs.readFile(transcriptPath, 'utf-8')
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim())

      return lines.map((line) => JSON.parse(line))
    } catch (error) {
      log.error({ err: error }, 'Error reading transcript')
      return []
    }
  }

  /**
   * Extract clean conversation text from JSONL entries
   */
  private extractConversationText(transcript: any[]): string {
    const messages: string[] = []
    let firstUserMessageSeen = false

    for (const entry of transcript) {
      if (entry.type === 'user' && entry.message?.content) {
        // Skip tool results
        if (entry.toolUseResult) continue

        let content = typeof entry.message.content === 'string' ? entry.message.content : ''

        // Strip injected context from first user message
        if (!firstUserMessageSeen && entry.parentUuid === null) {
          firstUserMessageSeen = true
          const marker = '\n\nUser Message: '
          const markerIndex = content.indexOf(marker)
          if (markerIndex !== -1) {
            content = content.substring(markerIndex + marker.length).trim()
          }
        }

        messages.push(`User: ${content}`)
      } else if (entry.type === 'assistant' && entry.message?.content) {
        // Extract text content
        const textContent = entry.message.content.find((c: any) => c.type === 'text')
        if (textContent?.text) {
          messages.push(`Assistant: ${textContent.text}`)
        }
      }
    }

    return messages.join('\n\n')
  }
}
