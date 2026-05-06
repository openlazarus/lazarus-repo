export type Session = {
  id: string
  workspaceId: string
  userId: string
  status: 'active' | 'completed' | 'error'
  createdAt: string
  updatedAt?: string
  messages: number
  metadata?: {
    model?: string
    mcpServers?: string[]
    [key: string]: any
  }
}

export type SessionMessage = {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result'
  content: string
  timestamp: string
  metadata?: any
}

export type SessionDetails = {
  id: string
  workspaceId: string
  userId: string
  status: string
  createdAt: string
  transcript: SessionMessage[]
  metadata?: any
}

export type SessionListResponse = {
  sessions: Session[]
  count: number
}
