import { useMemo } from 'react'

import { useStorageStore } from '@/storage/useStorageStore'
import { getTaskStatus } from '@/utils'

/**
 * 과제 리스트의 필터링 및 요약 통계를 처리하는 커스텀 훅
 */
export const useTaskFilter = (searchQuery: string) => {
  const contents = useStorageStore(state => state.contents)
  const manualOverrides = useStorageStore(state => state.manualOverrides)
  const getFilteredActivities = useStorageStore(state => state.getFilteredActivities)
  const updateData = useStorageStore(state => state.updateData)
  const filterOptions = useStorageStore(state => state.filterOptions)

  const filteredTasks = useMemo(
    () => getFilteredActivities(searchQuery),
    [getFilteredActivities, searchQuery, contents, filterOptions, manualOverrides],
  )

  const now = useMemo(() => new Date(), [])

  const summary = useMemo(() => {
    return contents.activityList.reduce(
      (acc, task) => {
        // 실제 서버에서 제출되었거나(true), 사용자가 수동 완료 처리(true)한 경우 모두 제출로 판정합니다.
        const hasSubmitted = task.hasSubmitted || manualOverrides[task.id] === true
        const taskWithOverride = { ...task, hasSubmitted }

        // 1. 과목 필터
        if (filterOptions.courseIds.length > 0 && !filterOptions.courseIds.includes(task.courseId)) return acc
        
        // 2. 카테고리 필터 (호환성을 위해 video 선택 시 mooc도 포함)
        if (filterOptions.categories.length > 0) {
          const isMatch = filterOptions.categories.some(c => 
            c === task.type || (c === 'video' && (task.type as string) === 'mooc')
          )
          if (!isMatch) return acc
        }

        // 3. 검색어 필터
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          if (!task.title.toLowerCase().includes(query) && !task.courseTitle.toLowerCase().includes(query)) return acc
        }

        // 4. 상태별 통계 산출
        const status = getTaskStatus(taskWithOverride, now)
        if (status === 'submitted') acc.submitted++
        else if (status === 'ongoing' || status === 'no-deadline') acc.ongoing++
        else if (status === 'imminent') acc.imminent++
        else if (status === 'expired') acc.expired++
        else if (status === 'upcoming') acc.upcoming++
        return acc
      },
      { ongoing: 0, imminent: 0, expired: 0, submitted: 0, upcoming: 0 },
    )
  }, [contents.activityList, filterOptions.courseIds, filterOptions.categories, searchQuery, now, manualOverrides])

  const toggleFilter = <T extends string>(key: 'statuses' | 'categories' | 'courseIds', value: T) => {
    updateData('filterOptions', prev => {
      const current = prev[key] as T[]
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const removeFilter = <T extends string>(key: 'statuses' | 'categories' | 'courseIds', value: T) => {
    updateData('filterOptions', prev => {
      const current = prev[key] as T[]
      return { ...prev, [key]: current.filter(v => v !== value) }
    })
  }

  return {
    filteredTasks,
    summary,
    toggleFilter,
    removeFilter,
    filterOptions,
    courseList: contents.courseList,
  }
}
