// import { useStudio } from '@/state/studio-context'

// import { useWebSocket, WebSocketStatus } from './use-websocket'

// export type TabType = 'document' | 'terminal' | 'chat' | 'settings'

// export interface Tab {
//   tab_id: string
//   tab_type: TabType
//   title?: string
//   content?: string
//   position?: 'left' | 'right'
//   focus?: boolean
//   icon?: string
// }

// export interface TabInfo {
//   tab_id: string
//   content: string
// }

// export interface TabSocketHandlers {
//   onFocusTab?: (tab: Pick<Tab, 'tab_id' | 'tab_type'>) => void
//   onNewTab?: (tab: Tab) => void
//   onCloseTab?: (tab: Pick<Tab, 'tab_id'>) => void
//   onNewInfoForTab?: (data: TabInfo) => void
// }

// export interface UseTabSocketProps {
//   onStatusChange?: (status: WebSocketStatus) => void
//   onError?: (error: string) => void
//   handlers?: TabSocketHandlers
//   autoConnect?: boolean
// }

// export const useTabSocket = ({
//   onStatusChange,
//   onError,
//   handlers = {},
//   autoConnect = false,
// }: UseTabSocketProps = {}) => {
//   const {
//     currentWorkspaceId,
//     workspaceTabs,
//     openDocumentInTab,
//     closeTab,
//     updateDocument,
//   } = useStudio()

//   const { status, error, connect, disconnect, sendMessage } = useWebSocket({
//     messageHandlers: {
//       focus_tab: (data: Pick<Tab, 'tab_id' | 'tab_type'>) => {
//         if (currentWorkspaceId) {
//           const tabs = workspaceTabs[currentWorkspaceId] || []
//           const tab = tabs.find((t) => t.id === data.tab_id)
//           if (tab) {
//             openDocumentInTab(currentWorkspaceId, tab.documentId)
//           }
//         }
//         handlers.onFocusTab?.(data)
//       },
//       new_tab: (data: Tab) => {
//         if (currentWorkspaceId) {
//           const documentId = data.tab_id
//           openDocumentInTab(currentWorkspaceId, documentId)
//         }
//         handlers.onNewTab?.(data)
//       },
//       close_tab: (data: Pick<Tab, 'tab_id'>) => {
//         if (currentWorkspaceId) {
//           const tabs = workspaceTabs[currentWorkspaceId] || []
//           const tab = tabs.find((t) => t.id === data.tab_id)
//           if (tab) {
//             closeTab(currentWorkspaceId, tab.id)
//           }
//         }
//         handlers.onCloseTab?.(data)
//       },
//       new_info_for_tab: (data: TabInfo) => {
//         if (currentWorkspaceId) {
//           const tabs = workspaceTabs[currentWorkspaceId] || []
//           const tab = tabs.find((t) => t.id === data.tab_id)
//           if (tab) {
//             updateDocument(currentWorkspaceId, tab.documentId, {
//               content: data.content,
//             })
//           }
//         }
//         handlers.onNewInfoForTab?.(data)
//       },
//     },
//     onStatusChange,
//     onError,
//     autoConnect,
//   })

//   const notifyTabChange = (tabId: string, tabType: TabType) => {
//     sendMessage('tab_changed', { tab_id: tabId, tab_type: tabType })
//   }

//   return {
//     status,
//     error,
//     connect,
//     disconnect,
//     notifyTabChange,
//   }
// }
