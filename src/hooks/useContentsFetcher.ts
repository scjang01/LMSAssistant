import { useEffect } from 'react'
import toast from 'react-hot-toast'

import { useRefreshCheck } from './useRefreshCheck'
import { getCourseActivities, getCourses, restoreSession } from '@/services/parser'
import { useStorageStore } from '@/storage/useStorageStore'
import type { Activity } from '@/types'

/**
 * 사이버캠퍼스 데이터를 크롤링하여 저장소에 동기화하는 커스텀 훅
 */
export const useContentsFetcher = () => {
  const { syncState, setSyncState, updateData, isInitialized } = useStorageStore()
  const { isLoading, progress, status: syncStatus } = syncState
  const setProgress = (value: number) => setSyncState({ progress: value })
  const setSyncStatus = (value: string) => setSyncState({ status: value })
  const { shouldRefresh, checkedAt } = useRefreshCheck()

  const fetchContents = async () => {
    if (useStorageStore.getState().syncState.isLoading || !useStorageStore.getState().isInitialized) return

    setSyncState({ isLoading: true })
    setProgress(5)
    setSyncStatus('과목 목록을 가져오는 중...')

    try {
      // 1. 수강 중인 과목 리스트 획득
      const courseList = await getCourses()

      if (courseList.length === 0) {
        await updateData('meta', prev => ({ ...prev, updateAt: new Date().toISOString() }))
        toast.error('수강 중인 과목을 찾을 수 없습니다.')
        return
      }

      setSyncStatus(`총 ${courseList.length}개의 과목 분석 시작...`)

      // 2. 과목별 활동 내역 병렬 크롤링 (성능 최적화)
      const maxCourses = courseList.length
      let completedCount = 0
      let errorCount = 0
      let loginRequired = false
      let saveQueue = Promise.resolve()
      const previousActivities = useStorageStore.getState().contents.activityList
      const persistCourse = (courseId: string, activities: Activity[]) => {
        saveQueue = saveQueue.then(async () => {
          if (loginRequired) return
          await updateData('contents', prev => ({
            courseList: [{ id: '-1', title: '전체 과목' }, ...courseList],
            activityList: [...prev.activityList.filter(a => a.courseId !== courseId), ...activities],
          }))
        })
        return saveQueue
      }

      const results = await Promise.allSettled(
        courseList.map(async course => {
          try {
            const activities = await getCourseActivities(course, previousActivities)
            if (loginRequired) return []
            errorCount += activities.filter(a => a.syncFailed).length
            await persistCourse(course.id, activities)

            completedCount++
            setSyncStatus(`[${completedCount}/${maxCourses}] ${course.title} 분석 완료`)
            setProgress(5 + (completedCount / maxCourses) * 90)

            return activities
          } catch (courseError) {
            console.error(`Failed to fetch course ${course.title}:`, courseError)
            if (courseError instanceof Error && courseError.message === 'LOGIN_REQUIRED') {
              loginRequired = true
              throw courseError
            }
            completedCount++
            errorCount++
            const previous = previousActivities
              .filter(a => a.courseId === course.id)
              .map(a => ({ ...a, syncFailed: true }))
            await persistCourse(course.id, previous)
            return previous
          }
        }),
      )

      const failure = results.find(result => result.status === 'rejected')
      if (failure?.status === 'rejected') throw failure.reason
      const activityList = results.flatMap(result => (result.status === 'fulfilled' ? result.value : []))
      setSyncStatus('데이터 저장 중...')

      // 수강하지 않는 과목과 삭제된 활동을 최종 정리합니다.
      await updateData('contents', () => ({
        courseList: [{ id: '-1', title: '전체 과목' }, ...courseList],
        activityList,
      }))
      // 언어 설정 복구 및 세션 유지
      await restoreSession()
      await updateData('meta', prev => ({ ...prev, updateAt: new Date().toISOString() }))

      if (errorCount > 0) {
        toast.error(`${errorCount}개 항목의 최신 상태를 확인하지 못했습니다. 이전 결과가 있으면 유지합니다.`, {
          duration: 5000,
        })
      } else {
        toast.success('동기화가 완료되었습니다.')
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'LOGIN_REQUIRED') {
        toast.error('🔒 세션이 만료되어 사이버캠퍼스 로그인이 필요합니다.', {
          icon: null,
          duration: 4000,
          style: { whiteSpace: 'nowrap', maxWidth: 'none' },
        })
      } else {
        toast.error('동기화 중 오류가 발생했습니다.')
      }
      console.error('Sync failed:', error)
    } finally {
      setSyncState({ isLoading: false, progress: 0, status: '' })
    }
  }

  useEffect(() => {
    // 자동 갱신 트리거
    if (isInitialized && shouldRefresh) {
      fetchContents()
    }
  }, [isInitialized, shouldRefresh, checkedAt])

  return { refetch: fetchContents, isLoading, progress, syncStatus }
}
