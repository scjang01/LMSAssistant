import { MODULE_PATHS } from './constants'
import { fetchAndParse } from './dom'
import { needsDetail, parseCourseActivities, parseCourses, parseDetail } from './parse'
import type { Activity, Course } from '@/types'
import { origin } from '@/utils/dom'

export async function getCourses(): Promise<Course[]> {
  return parseCourses(await fetchAndParse('/'))
}

export async function getCourseActivities(course: Course, previousActivities: Activity[] = []): Promise<Activity[]> {
  const activities = parseCourseActivities(
    await fetchAndParse(`/course/view.php?id=${course.id}&mode=sections`),
    course,
  )
  const previous = new Map(previousActivities.filter(a => a.courseId === course.id).map(a => [a.id, a]))
  return Promise.all(
    activities.map(async activity => {
      if (!needsDetail(activity)) return activity
      try {
        return parseDetail(await fetchAndParse(getActivityUrl(activity)), activity)
      } catch (error) {
        if (error instanceof Error && error.message === 'LOGIN_REQUIRED') throw error
        const old = previous.get(activity.id)
        return {
          ...activity,
          hasSubmitted: activity.hasSubmitted ?? old?.hasSubmitted ?? null,
          ...(old?.type === 'assignment' && old.onlineSubmissionNotRequired
            ? { onlineSubmissionNotRequired: true }
            : {}),
          ...(activity.type === 'video' && old?.type === 'video' ? { progress: old.progress } : {}),
          syncFailed: true,
        }
      }
    }),
  )
}

export async function restoreSession(): Promise<void> {}

export function getActivityUrl(activity: Activity): string {
  return activity.url || `${origin}/mod/${MODULE_PATHS[activity.type]}/view.php?id=${activity.id}`
}

export function preparePage(): void {}
