// Read-only hooks for file-based activity logging system
// Logs are created by the backend and stored as files
// Frontend only reads logs via the activity service API

export { useGetLogs } from './use-get-logs'
export { useLogsSocket } from './use-logs-socket'
