import { useFileTabStore } from '@/store/file-tab-store'

/**
 * Hook to get file tab actions
 * These are stable and don't cause re-renders
 */
export function useFileTabActions() {
  const openFileTab = useFileTabStore((state) => state.openFileTab)
  const closeTab = useFileTabStore((state) => state.closeTab)
  const closeAllTabs = useFileTabStore((state) => state.closeAllTabs)
  const switchToTab = useFileTabStore((state) => state.switchToTab)
  const togglePinTab = useFileTabStore((state) => state.togglePinTab)
  const reorderTabs = useFileTabStore((state) => state.reorderTabs)
  const reorderTabsFromArray = useFileTabStore(
    (state) => state.reorderTabsFromArray,
  )
  const setActiveTabId = useFileTabStore((state) => state.setActiveTabId)
  const updateTabFileInfo = useFileTabStore((state) => state.updateTabFileInfo)
  const updateTabFileId = useFileTabStore((state) => state.updateTabFileId)

  return {
    openFileTab,
    closeTab,
    closeAllTabs,
    switchToTab,
    togglePinTab,
    reorderTabs,
    reorderTabsFromArray,
    setActiveTabId,
    updateTabFileInfo,
    updateTabFileId,
  }
}
