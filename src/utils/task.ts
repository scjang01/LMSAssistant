import { differenceInHours, isPast } from 'date-fns'

import { Activity } from '@/types'
import { safeParseDate } from './date'

export type TaskStatus = 'submitted' | 'expired' | 'imminent' | 'ongoing' | 'no-deadline'

/**
 * 과제의 현재 상태를 반환합니다.
 */
export const getTaskStatus = (task: Activity, now: Date = new Date()): TaskStatus => {
  if (task.hasSubmitted) return 'submitted'

  const endAtDate = safeParseDate(task.endAt)
  if (!endAtDate) return 'no-deadline'

  const isExpired = isPast(endAtDate)
  if (isExpired) return 'expired'

  const hoursUntilDue = differenceInHours(endAtDate, now)
  if (hoursUntilDue >= 0 && hoursUntilDue <= 48) return 'imminent'

  return 'ongoing'
}

/**
 * 과제가 마감 임박(48시간 이내)인지 확인합니다.
 */
export const isImminentTask = (task: Activity, now: Date = new Date()): boolean => {
  return getTaskStatus(task, now) === 'imminent'
}
