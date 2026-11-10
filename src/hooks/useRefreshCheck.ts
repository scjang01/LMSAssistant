import { useNow } from './useNow'
import { useStorageStore } from '@/storage/useStorageStore'

export const useRefreshCheck = () => {
  const { meta, settings, isInitialized } = useStorageStore()
  const now = useNow().getTime()
  const lastUpdate = new Date(meta.updateAt).getTime()
  const shouldRefresh = isInitialized && (!Number.isFinite(lastUpdate) || now - lastUpdate >= settings.refreshInterval)
  return { shouldRefresh, checkedAt: now }
}
