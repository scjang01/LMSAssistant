import type { Activity, ActivityStatus, FilterOptions as _FilterOptions } from '@/types'
import { getTaskStatus, safeParseDate } from '@/utils'

const isValidActivity = (activity: Activity): boolean =>
  activity.title !== '' && (!activity.endAt || activity.endAt === '' || safeParseDate(activity.endAt) !== null)

const filterByStatus = (activity: Activity, statuses: ActivityStatus[], now?: Date): boolean => {
  if (statuses.length === 0 || statuses.includes('all')) return true

  const taskStatus = getTaskStatus(activity, now)

  return statuses.some(status => {
    if (status === 'ongoing') {
      return taskStatus === 'ongoing' || taskStatus === 'no-deadline'
    }
    return taskStatus === status
  })
}

const filterByCourse = (activity: Activity, courseIds: string[]): boolean =>
  courseIds.length === 0 || courseIds.includes('-1') || courseIds.includes(activity.courseId)

const filterByCategory = (activity: Activity, categories: string[]): boolean => {
  if (categories.length === 0 || categories.includes('all')) return true

  return categories.some(category => {
    // 호환성을 위해 video 필터 선택 시 mooc 타입도 포함
    if (category === 'video') {
      return activity.type === 'video' || (activity.type as string) === 'mooc'
    }
    return activity.type === category
  })
}

const filterBySearchQuery = (activity: Activity, searchQuery?: string): boolean => {
  if (!searchQuery) return true
  const query = searchQuery.toLowerCase()
  return activity.title.toLowerCase().includes(query) || activity.courseTitle.toLowerCase().includes(query)
}

export function filterActivities(
  activity: Activity,
  options: _FilterOptions & { searchQuery?: string; now?: Date },
): boolean {
  return (
    isValidActivity(activity) &&
    filterByStatus(activity, options.statuses, options.now) &&
    filterByCourse(activity, options.courseIds) &&
    filterByCategory(activity, options.categories) &&
    filterBySearchQuery(activity, options.searchQuery)
  )
}
