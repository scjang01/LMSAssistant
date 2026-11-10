import { afterEach, describe, expect, it, vi } from 'vitest'

import { filterActivities } from '@/components/task/filterActivities'
import { getClockTime, subscribeClock } from '@/hooks/useNow'
import type { Activity } from '@/types'
import { normalizeString } from '@/utils/dom'
import { getTaskStatus } from '@/utils/task'

const now = new Date(2026, 10, 10, 12)
const task: Activity = {
  type: 'assignment',
  id: '1',
  courseId: '10',
  courseTitle: '수학',
  title: '과제',
  startAt: '',
  endAt: '',
  hasSubmitted: false,
}
const options = { statuses: [], courseIds: [], categories: [] }
const cleanup: Array<() => void> = []
afterEach(() => {
  cleanup.splice(0).forEach(stop => stop())
  vi.useRealTimers()
})

describe('배포 전 경계 동작', () => {
  it('마감 48시간을 정확히 기준으로 판단한다', () => {
    const end = new Date(now.getTime() + 48 * 3600000).toISOString()
    expect(getTaskStatus({ ...task, endAt: end }, now)).toBe('imminent')
    expect(getTaskStatus({ ...task, endAt: end }, new Date(now.getTime() - 1))).toBe('ongoing')
    expect(getTaskStatus({ ...task, endAt: now.toISOString() }, now)).toBe('expired')
  })

  it('같은 활동이 시간이 흐르면 필터에서도 마감 임박으로 바뀐다', () => {
    const endAt = new Date(now.getTime() + 48 * 3600000 + 60000).toISOString()
    const filter = { ...options, statuses: ['imminent' as const] }
    expect(filterActivities({ ...task, endAt }, { ...filter, now })).toBe(false)
    expect(filterActivities({ ...task, endAt }, { ...filter, now: new Date(now.getTime() + 60000) })).toBe(true)
  })

  it('전체 과목·전체 종류와 날짜 유효성을 목록 및 집계에 동일하게 적용한다', () => {
    expect(filterActivities(task, { ...options, courseIds: ['-1'], categories: ['all'], statuses: ['all'] })).toBe(true)
    expect(filterActivities({ ...task, endAt: 'not-a-date' }, options)).toBe(false)
    expect(filterActivities({ ...task, hasSubmitted: null }, { ...options, statuses: ['unknown'] })).toBe(true)
  })

  it('영상명 정규화가 한글을 지우거나 다른 강의를 같은 이름으로 만들지 않는다', () => {
    expect(normalizeString('경제 학개론_1!')).toBe('경제학개론1')
    expect(normalizeString('경제학개론')).not.toBe(normalizeString('통계학'))
    expect(normalizeString('Week 1 - Vod')).toBe('week1vod')
  })

  it('두 학교의 화면 삽입 ID를 구분한다', async () => {
    vi.stubEnv('VITE_UNIV_ID', 'incheon')
    vi.resetModules()
    const incheon = (await import('@/constants')).SHADOW_HOST_ID
    vi.stubEnv('VITE_UNIV_ID', 'gachon')
    vi.resetModules()
    const gachon = (await import('@/constants')).SHADOW_HOST_ID
    expect(incheon).not.toBe(gachon)
    vi.unstubAllEnvs()
  })

  it('여러 카드가 하나의 시계를 공유하고 닫으면 타이머를 정리한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const first = vi.fn()
    const second = vi.fn()
    const stopFirst = subscribeClock(first)
    const stopSecond = subscribeClock(second)
    cleanup.push(stopFirst, stopSecond)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(60000)
    expect(getClockTime()).toBe(now.getTime() + 60000)
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    stopFirst()
    stopSecond()
    expect(vi.getTimerCount()).toBe(0)
  })
})
