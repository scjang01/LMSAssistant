import type { Activity } from '@/types'

export type TaskStatus = 'submitted' | 'expired' | 'imminent' | 'ongoing' | 'upcoming' | 'no-deadline' | 'unknown'

/**
 * Safari 등 다양한 브라우저에서 날짜 문자열을 안전하게 파싱합니다.
 * "2024-05-01 23:59:59" 포맷을 "2024-05-01T23:59:59"로 변환하여 처리합니다.
 */
export const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null
  try {
    const isoStr = dateStr.trim().replace(' ', 'T')
    const date = new Date(isoStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * 과제의 현재 상태를 반환합니다.
 */
export const getTaskStatus = (task: Activity, now: Date = new Date()): TaskStatus => {
  if (task.hasSubmitted) return 'submitted'

  // 시작 시간 확인 (진행 전 상태 판단)
  const startAtDate = safeParseDate(task.startAt)
  if (startAtDate && startAtDate > now) {
    return 'upcoming'
  }

  if (task.hasSubmitted === null) return 'unknown'

  const endAtDate = safeParseDate(task.endAt)
  if (!endAtDate) return 'no-deadline'

  const isExpired = endAtDate <= now
  if (isExpired) return 'expired'

  if (endAtDate.getTime() - now.getTime() <= 48 * 60 * 60 * 1000) return 'imminent'

  return 'ongoing'
}

/**
 * 과제가 마감 임박(48시간 이내)인지 확인합니다.
 */
export const isImminentTask = (task: Activity, now: Date = new Date()): boolean => {
  return getTaskStatus(task, now) === 'imminent'
}
