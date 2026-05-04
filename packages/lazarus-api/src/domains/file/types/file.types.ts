import type WebSocket from 'ws'

export interface FileChangeEvent {
  type: 'file:created' | 'file:modified' | 'file:deleted'
  workspace: string
  path: string
  timestamp: string
  fullPath?: string
}

export interface WorkspaceSubscription {
  workspaceId: string
  userId: string
  ws: WebSocket
}

export interface FileVersion {
  versionId: string
  path: string
  timestamp: string
  modifiedBy: string
  modifierType: 'user' | 'bot' | 'agent'
  size: number
  checksum: string
  content: string
  message?: string
}
