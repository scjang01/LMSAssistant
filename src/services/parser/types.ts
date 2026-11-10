import type { Activity, Course } from '@/types'

export interface CourseParams {
  year: number
  semester: number
}

export interface LmsAdapter {
  getCourses: (params?: CourseParams) => Promise<Course[]>
  getCourseActivities: (course: Course, previousActivities?: Activity[]) => Promise<Activity[]>
  restoreSession: () => Promise<void>
  getActivityUrl: (task: Activity) => string
  preparePage: () => void
}
