// import { useCallback, useEffect } from 'react'
// import { v4 as uuidv4 } from 'uuid'

// import { useStudio } from '@/state/studio-context'

// import { useWebSocket, WebSocketStatus } from './use-websocket'

// const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765'

// export type Workspace = {
//   id: string
//   name: string
//   description?: string
//   created_at: string
//   last_modified: string
//   owner: string
//   files_count?: number
//   root_path?: string
// }

// export type Conversation = {
//   id: string
//   title: string
//   workspace_id: string
//   created_at: string
//   last_active: string
//   message_count?: number
// }

// export type UseWorkspaceSocketProps = {
//   url?: string
//   workspace_id?: string
//   conversation_id?: string
//   onStatusChange?: (status: WebSocketStatus) => void
//   onError?: (error: string) => void
//   autoConnect?: boolean
//   headers?: Record<string, string>
// }

// export const useWorkspaceSocket = ({
//   url = WS_URL,
//   workspace_id,
//   conversation_id,
//   onStatusChange,
//   onError,
//   autoConnect = true,
//   headers,
// }: UseWorkspaceSocketProps) => {
//   const {
//     currentWorkspaceId,
//     setCurrentWorkspaceId,
//     currentConversation,
//     setCurrentConversation,
//     workspaces,
//   } = useStudio()

//   const messageHandlers: Record<string, (data: any) => void> = {
//     workspace_created: (data) => {
//       setCurrentWorkspaceId(data.workspace_id)
//     },
//     workspace_loaded: (data) => {
//       // Update workspace details in the context
//       console.log('Workspace loaded:', data)
//     },
//     conversation_created: (data) => {
//       setCurrentConversation(data)
//     },
//     conversation_loaded: (data) => {
//       // Update conversation details in the context
//       console.log('Conversation loaded:', data)
//     },
//     error: (data) => onError?.(data.error_message),
//   }

//   const ws = useWebSocket({
//     url,
//     messageHandlers,
//     onStatusChange,
//     onError,
//     autoConnect,
//     headers,
//   })

//   const sendMessage = useCallback(
//     (type: string, data: any) => {
//       const message = {
//         type,
//         id: uuidv4(),
//         timestamp: new Date().toISOString(),
//         sender: 'client',
//         workspace_id: currentWorkspaceId,
//         conversation_id: currentConversation?.id,
//         data,
//       }

//       return ws.sendMessage(type, message)
//     },
//     [ws, currentWorkspaceId, currentConversation],
//   )

//   const createWorkspace = useCallback(
//     (name: string, description?: string) => {
//       return sendMessage('create_workspace', {
//         name,
//         description,
//       })
//     },
//     [sendMessage],
//   )

//   const switchWorkspace = useCallback(
//     (newWorkspaceId: string) => {
//       return sendMessage('workspace_switched', {
//         previous_workspace_id: currentWorkspaceId,
//         new_workspace_id: newWorkspaceId,
//       })
//     },
//     [sendMessage, currentWorkspaceId],
//   )

//   const createConversation = useCallback(
//     (title: string) => {
//       return sendMessage('create_conversation', {
//         title,
//         workspace_id: currentWorkspaceId,
//       })
//     },
//     [sendMessage, currentWorkspaceId],
//   )

//   const switchConversation = useCallback(
//     (newConversationId: string) => {
//       return sendMessage('conversation_switched', {
//         previous_conversation_id: currentConversation?.id,
//         new_conversation_id: newConversationId,
//       })
//     },
//     [sendMessage, currentConversation],
//   )

//   useEffect(() => {
//     if (ws.status === 'connected') {
//       sendMessage('register_connection', {
//         connection_id: uuidv4(),
//         workspace_id: currentWorkspaceId || 'default',
//         conversation_id: currentConversation?.id || 'default',
//         client_capabilities: [
//           'workspace_management',
//           'conversation_management',
//         ],
//       })
//     }
//   }, [ws.status, sendMessage, currentWorkspaceId, currentConversation])

//   return {
//     status: ws.status,
//     error: ws.error,
//     currentWorkspace: currentWorkspaceId
//       ? workspaces[currentWorkspaceId]
//       : null,
//     currentConversation,

//     connect: ws.connect,
//     disconnect: ws.disconnect,
//     sendMessage,

//     // Workspace operations
//     createWorkspace,
//     switchWorkspace,

//     // Conversation operations
//     createConversation,
//     switchConversation,

//     webSocket: ws.webSocket,
//   }
// }
