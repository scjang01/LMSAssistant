import { create } from 'zustand'

import { chromeStorageClient } from './chromeStorageClient'
import packageJson from '../../package.json'
import { filterActivities } from '@/components/task/filterActivities'
import type { Activity, StorageData } from '@/types'
import { isMac, safeParseDate } from '@/utils'

/**
 * 앱의 전역 상태를 관리하고 로컬 스토리지와 동기화하는 Zustand 스토어
 */
interface StorageStore extends StorageData {
  isInitialized: boolean
  isEditing: boolean
  syncState: { isLoading: boolean; progress: number; status: string }
  setSyncState: (patch: Partial<StorageStore['syncState']>) => void
  setIsEditing: (isEditing: boolean) => void
  initialize: () => Promise<void>
  updateData: <K extends keyof StorageData>(key: K, updater: (prev: StorageData[K]) => StorageData[K]) => Promise<void>
  getFilteredActivities: (searchQuery: string, now?: Date) => Activity[]
  resetStore: () => Promise<void>
}

const initialStorageData: StorageData = {
  meta: { version: packageJson.version, updateAt: '2024-01-01T00:00:00.000Z' },
  contents: { courseList: [], activityList: [] },
  filterOptions: { statuses: [], courseIds: [], categories: [] },
  manualOverrides: {},
  settings: {
    refreshInterval: 1000 * 60 * 60 * 2,
    trigger: {
      type: 'color',
      color: '#3b82f6',
    },
    shortcut: isMac() ? 'meta+/' : 'Ctrl+/',
  },
}

/**
 * 초기 데이터와 저장된 데이터를 안전하게 병합합니다.
 */
const mergeData = (initial: StorageData, stored: Partial<StorageData>): StorageData => ({
  meta: { ...initial.meta, ...stored.meta, version: packageJson.version },
  contents: { ...initial.contents, ...stored.contents },
  filterOptions: { ...initial.filterOptions, ...stored.filterOptions },
  manualOverrides: { ...initial.manualOverrides, ...stored.manualOverrides },
  settings: { ...initial.settings, ...stored.settings },
})

let storageUpdates = Promise.resolve()

export const useStorageStore = create<StorageStore>((set, get) => ({
  ...initialStorageData,
  isInitialized: false,
  isEditing: false,
  syncState: { isLoading: false, progress: 0, status: '' },
  setSyncState: patch => set(state => ({ syncState: { ...state.syncState, ...patch } })),
  setIsEditing: isEditing => set({ isEditing }),

  /** 스토리지로부터 데이터를 불러와 초기화합니다. */
  initialize: async () => {
    const storedData = await chromeStorageClient.getData()
    const mergedData = mergeData(initialStorageData, storedData)

    set({ ...mergedData, isInitialized: true })
  },

  /** 특정 키의 데이터를 업데이트하고 스토리지에 즉시 저장합니다. */
  updateData: async <K extends keyof StorageData>(key: K, updater: (prev: StorageData[K]) => StorageData[K]) => {
    const update = storageUpdates.then(async () => {
      const updatedData = updater(get()[key])
      const changes: Partial<StorageData> = { [key]: updatedData }

      if (key === 'contents') {
        const { activityList, courseList } = updatedData as StorageData['contents']
        const courseIds = new Set(courseList.map(course => course.id))
        const filters = get().filterOptions
        const selectedCourses = filters.courseIds.filter(id => id === '-1' || courseIds.has(id))
        if (selectedCourses.length !== filters.courseIds.length) {
          changes.filterOptions = { ...filters, courseIds: selectedCourses }
        }
        const overrides = { ...get().manualOverrides }
        let changed = false
        for (const activity of activityList) {
          if (
            overrides[activity.id] !== undefined &&
            (activity.hasSubmitted === true || overrides[activity.id] === activity.hasSubmitted)
          ) {
            delete overrides[activity.id]
            changed = true
          }
        }
        if (changed) changes.manualOverrides = overrides
      }

      await chromeStorageClient.setData(changes)
      set(changes)
    })
    storageUpdates = update.catch(() => {})
    return update
  },

  /** 필터 및 검색어 조건에 맞는 과제 리스트를 반환합니다. */
  getFilteredActivities: (searchQuery: string, now = new Date()) => {
    const { activityList } = get().contents
    const { manualOverrides, filterOptions } = get()
    const combinedOptions = { ...filterOptions, searchQuery, now }

    const filtered: { activity: Activity; time: number }[] = []

    for (let i = 0; i < activityList.length; i++) {
      const activity = activityList[i]
      // 실제 서버에서 제출되었거나(true), 사용자가 수동 완료 처리(true)한 경우 모두 제출로 판정합니다.
      const hasSubmitted = manualOverrides[activity.id] === true ? true : activity.hasSubmitted
      const updatedActivity: Activity = { ...activity, hasSubmitted }

      if (filterActivities(updatedActivity, combinedOptions)) {
        const parsedDate = safeParseDate(updatedActivity.endAt)
        filtered.push({
          activity: updatedActivity,
          time: parsedDate ? parsedDate.getTime() : Infinity,
        })
      }
    }

    return filtered.sort((a, b) => a.time - b.time).map(item => item.activity)
  },

  /** 모든 설정을 초기화합니다. */
  resetStore: async () => {
    await chromeStorageClient.setData(initialStorageData)
    set({ ...initialStorageData, isInitialized: true })
  },
}))

// 스토어 생성 즉시 초기화 실행
useStorageStore.getState().initialize()

// 크롬 스토리지 변경 감지: 다른 탭에서 변경된 사항을 실시간 반영합니다.
chromeStorageClient.onStorageChanged((changes, areaName) => {
  if (areaName !== 'local') return
  const newState = Object.entries(changes).reduce((acc, [key, { newValue }]) => {
    if (key in initialStorageData) {
      acc[key as keyof StorageData] = newValue
    }
    return acc
  }, {} as Partial<StorageData>)

  if (Object.keys(newState).length > 0) {
    useStorageStore.setState(state => ({ ...state, ...newState }))
  }
})
