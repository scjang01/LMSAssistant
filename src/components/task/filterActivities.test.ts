import { addDays, subDays } from 'date-fns'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { filterActivities } from './filterActivities'
import type { Activity, FilterOptions } from '@/types'

const now = new Date('2024-05-05T12:00:00Z')

// Setup default options
const defaultOptions: FilterOptions & { searchQuery?: string } = {
  statuses: [],
  courseIds: [],
  categories: [],
  searchQuery: '',
}

describe('filterActivities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const baseActivity: Activity = {
    id: '1',
    courseId: 'c1',
    courseTitle: 'Math 101',
    title: 'Algebra Quiz',
    type: 'assignment',
    hasSubmitted: false,
    startAt: subDays(now, 1).toISOString(),
    endAt: addDays(now, 5).toISOString(),
  }

  describe('isValidActivity', () => {
    it('should return false for empty title', () => {
      const activity = { ...baseActivity, title: '' }
      expect(filterActivities(activity, defaultOptions)).toBe(false)
    })

    it('should return true for valid endAt date', () => {
      expect(filterActivities(baseActivity, defaultOptions)).toBe(true)
    })

    it('should return true for empty endAt date', () => {
      const activity = { ...baseActivity, endAt: '' }
      expect(filterActivities(activity, defaultOptions)).toBe(true)
    })

    it('should return false for invalid endAt date', () => {
      const activity = { ...baseActivity, endAt: 'invalid-date' }
      expect(filterActivities(activity, defaultOptions)).toBe(false)
    })
  })

  describe('filterByStatus', () => {
    it('should return true when statuses array is empty', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, statuses: [] })).toBe(true)
    })

    it('should correctly filter ongoing tasks', () => {
      const ongoingTask = { ...baseActivity, endAt: addDays(now, 5).toISOString() }
      expect(filterActivities(ongoingTask, { ...defaultOptions, statuses: ['ongoing'] })).toBe(true)

      const submittedTask = { ...baseActivity, hasSubmitted: true }
      expect(filterActivities(submittedTask, { ...defaultOptions, statuses: ['ongoing'] })).toBe(false)
    })

    it('should include no-deadline tasks in ongoing', () => {
      const noDeadlineTask = { ...baseActivity, endAt: '' }
      expect(filterActivities(noDeadlineTask, { ...defaultOptions, statuses: ['ongoing'] })).toBe(true)
    })

    it('should correctly filter imminent tasks', () => {
      const imminentTask = { ...baseActivity, endAt: addDays(now, 1).toISOString() } // 24 hours left
      expect(filterActivities(imminentTask, { ...defaultOptions, statuses: ['imminent'] })).toBe(true)

      const farTask = { ...baseActivity, endAt: addDays(now, 5).toISOString() } // 120 hours left
      expect(filterActivities(farTask, { ...defaultOptions, statuses: ['imminent'] })).toBe(false)
    })

    it('should correctly filter expired tasks', () => {
      const expiredTask = { ...baseActivity, endAt: subDays(now, 1).toISOString() }
      expect(filterActivities(expiredTask, { ...defaultOptions, statuses: ['expired'] })).toBe(true)
    })

    it('should correctly filter submitted tasks', () => {
      const submittedTask = { ...baseActivity, hasSubmitted: true }
      expect(filterActivities(submittedTask, { ...defaultOptions, statuses: ['submitted'] })).toBe(true)
    })

    it('should correctly filter upcoming tasks', () => {
      const upcomingTask = { ...baseActivity, startAt: addDays(now, 1).toISOString() }
      expect(filterActivities(upcomingTask, { ...defaultOptions, statuses: ['upcoming'] })).toBe(true)
    })
  })

  describe('filterByCourse', () => {
    it('should return true when courseIds is empty', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, courseIds: [] })).toBe(true)
    })

    it('should return true when courseIds includes -1 (all courses)', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, courseIds: ['c2', '-1'] })).toBe(true)
    })

    it('should return true if activity courseId is in courseIds', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, courseIds: ['c1', 'c2'] })).toBe(true)
    })

    it('should return false if activity courseId is not in courseIds', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, courseIds: ['c2', 'c3'] })).toBe(false)
    })
  })

  describe('filterByCategory', () => {
    it('should return true when categories is empty', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, categories: [] })).toBe(true)
    })

    it('should return true when categories includes all', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, categories: ['assignment', 'all'] })).toBe(true)
    })

    it('should return true if activity type is in categories', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, categories: ['assignment', 'quiz'] })).toBe(true)
    })

    it('should return false if activity type is not in categories', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, categories: ['quiz'] })).toBe(false)
    })

    it('should treat mooc as video when video category is selected', () => {
      // Cast baseActivity.type to any to bypass type check for 'mooc' in Activity type definition
      const moocActivity = { ...baseActivity, type: 'mooc' } as unknown as Activity
      expect(filterActivities(moocActivity, { ...defaultOptions, categories: ['video'] })).toBe(true)
    })
  })

  describe('filterBySearchQuery', () => {
    it('should return true when searchQuery is empty', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, searchQuery: '' })).toBe(true)
    })

    it('should return true if searchQuery is in title (case insensitive)', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, searchQuery: 'ALGEBRA' })).toBe(true)
    })

    it('should return true if searchQuery is in courseTitle (case insensitive)', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, searchQuery: 'math' })).toBe(true)
    })

    it('should return false if searchQuery is not in title or courseTitle', () => {
      expect(filterActivities(baseActivity, { ...defaultOptions, searchQuery: 'Physics' })).toBe(false)
    })
  })

  describe('combined filters', () => {
    it('should return true when all filters match', () => {
      const options: FilterOptions & { searchQuery?: string } = {
        statuses: ['ongoing'],
        courseIds: ['c1'],
        categories: ['assignment'],
        searchQuery: 'Math',
      }
      expect(filterActivities(baseActivity, options)).toBe(true)
    })

    it('should return false if any filter does not match', () => {
      const options: FilterOptions & { searchQuery?: string } = {
        statuses: ['ongoing'],
        courseIds: ['c2'], // This fails
        categories: ['assignment'],
        searchQuery: 'Math',
      }
      expect(filterActivities(baseActivity, options)).toBe(false)
    })
  })
})
