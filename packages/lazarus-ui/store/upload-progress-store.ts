import { create } from 'zustand'

/**
 * Upload status for each file
 */
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error'

/**
 * Individual upload item
 */
export interface UploadItem {
  id: string
  fileName: string
  fileSize: number
  progress: number // 0-100
  status: UploadStatus
  error?: string
  startedAt: number
}

/**
 * Upload progress store state
 */
interface UploadProgressState {
  // Active uploads
  uploads: Map<string, UploadItem>

  // Actions
  addUpload: (id: string, fileName: string, fileSize: number) => void
  updateProgress: (id: string, progress: number) => void
  completeUpload: (id: string) => void
  failUpload: (id: string, error: string) => void
  removeUpload: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void

  // Selectors
  getUpload: (id: string) => UploadItem | undefined
  getActiveUploads: () => UploadItem[]
  hasActiveUploads: () => boolean
  getTotalProgress: () => number
}

/**
 * Upload progress Zustand store
 */
export const useUploadProgressStore = create<UploadProgressState>()(
  (set, get) => ({
    uploads: new Map<string, UploadItem>(),

    addUpload: (id, fileName, fileSize) => {
      set((state) => {
        const next = new Map(state.uploads)
        next.set(id, {
          id,
          fileName,
          fileSize,
          progress: 0,
          status: 'pending',
          startedAt: Date.now(),
        })
        return { uploads: next }
      })
    },

    updateProgress: (id, progress) => {
      set((state) => {
        const upload = state.uploads.get(id)
        if (!upload) return state

        const next = new Map(state.uploads)
        next.set(id, {
          ...upload,
          progress: Math.min(100, Math.max(0, progress)),
          status: 'uploading',
        })
        return { uploads: next }
      })
    },

    completeUpload: (id) => {
      set((state) => {
        const upload = state.uploads.get(id)
        if (!upload) return state

        const next = new Map(state.uploads)
        next.set(id, {
          ...upload,
          progress: 100,
          status: 'completed',
        })
        return { uploads: next }
      })
    },

    failUpload: (id, error) => {
      set((state) => {
        const upload = state.uploads.get(id)
        if (!upload) return state

        const next = new Map(state.uploads)
        next.set(id, {
          ...upload,
          status: 'error',
          error,
        })
        return { uploads: next }
      })
    },

    removeUpload: (id) => {
      set((state) => {
        const next = new Map(state.uploads)
        next.delete(id)
        return { uploads: next }
      })
    },

    clearCompleted: () => {
      set((state) => {
        const next = new Map(state.uploads)
        for (const [id, upload] of next) {
          if (upload.status === 'completed') {
            next.delete(id)
          }
        }
        return { uploads: next }
      })
    },

    clearAll: () => {
      set({ uploads: new Map() })
    },

    getUpload: (id) => {
      return get().uploads.get(id)
    },

    getActiveUploads: () => {
      const uploads = get().uploads
      return Array.from(uploads.values()).filter(
        (u) => u.status === 'pending' || u.status === 'uploading',
      )
    },

    hasActiveUploads: () => {
      const uploads = get().uploads
      return Array.from(uploads.values()).some(
        (u) => u.status === 'pending' || u.status === 'uploading',
      )
    },

    getTotalProgress: () => {
      const uploads = get().uploads
      if (uploads.size === 0) return 0

      const items = Array.from(uploads.values())
      const total = items.reduce((sum, u) => sum + u.progress, 0)
      return total / items.length
    },
  }),
)

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
