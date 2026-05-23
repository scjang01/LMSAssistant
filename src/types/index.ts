export interface BaseActivity {
  id: string
  courseId: string
  courseTitle: string
  title: string
  startAt: string
  endAt: string
  hasSubmitted: boolean
}

export interface Course {
  id: string
  title: string
}

export interface Assignment extends BaseActivity {
  type: 'assignment'
}

export interface Video extends BaseActivity {
  type: 'video'
  sectionTitle: string
  progress?: number
}

export interface Quiz extends BaseActivity {
  type: 'quiz'
}

export type Activity = Assignment | Video | Quiz

export type Contents = {
  courseList: Course[]
  activityList: Activity[]
}

export type ActivityStatus = 'all' | 'ongoing' | 'imminent' | 'expired' | 'submitted' | 'upcoming'

export type ActivityType = 'assignment' | 'video' | 'quiz'

export type FilterOptions = {
  statuses: ActivityStatus[]
  courseIds: string[]
  categories: (ActivityType | 'all')[]
}

export type StorageData = {
  meta: {
    version: string
    updateAt: string
  }
  contents: Contents
  filterOptions: FilterOptions
  manualOverrides: Record<string, boolean>
  settings: {
    refreshInterval: number
    trigger: { type: 'image'; image: string } | { type: 'color'; color: string }
    shortcut: string
  }
}

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T
