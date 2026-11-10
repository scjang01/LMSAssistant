import { MODULE_PATHS, SELECTORS } from './constants'
import type { Activity, Course } from '@/types'
import { getLinkId, origin } from '@/utils/dom'

import type { CheerioAPI } from 'cheerio'

const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

function completion(text: string): boolean | null {
  if (['완료', '제출 완료', '제출됨'].includes(clean(text))) return true
  if (['미완료', '미제출', '미응시', '진행 중', '작성 중', '초안'].includes(clean(text))) return false
  return null
}

function field($: CheerioAPI, label: string): string {
  const row = $('#region-main .cml-item')
    .filter((_, el) => clean($(el).find('.cml-label').text()) === label)
    .first()
  return clean(row.find('.cml-text').text())
}

export function parseCourses($: CheerioAPI): Course[] {
  const groups = $(SELECTORS.courseGroups).filter(
    (_, el) => clean($(el).children('.csms-box-header').text()) === '교과과정',
  )
  const courses = new Map<string, Course>()
  groups.find(SELECTORS.courseLinks).each((_, el) => {
    const link = $(el)
    const id = getLinkId(link.attr('href'))
    const title = clean(link.find('h5').first().text()).replace(/\s*\([\w]+\)$/, '')
    if (id && title) courses.set(id, { id, title })
  })
  if (!groups.length) throw new Error('LMS_STRUCTURE_CHANGED')
  return [...courses.values()]
}

export function parseCourseActivities($: CheerioAPI, course: Course): Activity[] {
  if (!$('#region-main [data-for="section"]').length) throw new Error('LMS_STRUCTURE_CHANGED')
  const activities = new Map<string, Activity>()
  $(SELECTORS.activities).each((_, el) => {
    const item = $(el)
    const type = item.hasClass('modtype_assign') ? 'assignment' : item.hasClass('modtype_vod') ? 'video' : 'quiz'
    const id = item.attr('data-id') || item.attr('id')?.replace('module-', '') || ''
    const title = clean(
      item.find('[data-activityname]').first().attr('data-activityname') || item.find('.activityname').first().text(),
    )
    if (!id || !title) throw new Error('LMS_STRUCTURE_CHANGED')

    const tags = item
      .find(SELECTORS.status)
      .map((_, tag) => clean($(tag).text()))
      .get()
    const hasSubmitted = tags.includes('완료') ? true : tags.includes('미완료') ? false : null
    const url = new URL(
      item.find('a.activity-container[href]').first().attr('href') || `/mod/${MODULE_PATHS[type]}/view.php?id=${id}`,
      String(origin),
    ).href
    const base = {
      id,
      type,
      title,
      courseId: course.id,
      courseTitle: course.title,
      url,
      startAt: clean(item.find('.activity-dates .timeopen').first().text()),
      endAt: clean(item.find('.activity-dates .timeclose').first().text()),
      hasSubmitted,
    }
    const attendanceNotRequired =
      type === 'video' &&
      !clean(item.find('.activity-dates').text()) &&
      /^\d+:\d{2}(?::\d{2})?$/.test(clean(item.find('.text-playtime').first().text()))
    const activity: Activity =
      type === 'video'
        ? {
            ...base,
            type,
            sectionTitle: item.parents('[data-for="section"]').last().attr('data-sectionname') || '',
            attendanceNotRequired,
            hasSubmitted: attendanceNotRequired ? (base.hasSubmitted ?? false) : base.hasSubmitted,
          }
        : { ...base, type }
    activities.set(id, activity)
  })
  return [...activities.values()]
}

export function needsDetail(activity: Activity, now = new Date()): boolean {
  if (activity.type !== 'video') return activity.hasSubmitted === null
  if (activity.hasSubmitted === true || activity.attendanceNotRequired) return false
  const start = new Date(activity.startAt.replace(' ', 'T'))
  return !(start.getTime() > now.getTime())
}

export function parseDetail($: CheerioAPI, activity: Activity): Activity {
  const main = $('#region-main')
  if (!main.length) throw new Error('LMS_STRUCTURE_CHANGED')
  const result = { ...activity }
  if (result.type === 'assignment') {
    const submission = field($, '제출 상태')
    if (/^온라인 제출이 필요하지 않은 과제입니다\.?$/.test(submission)) {
      result.onlineSubmissionNotRequired = true
      result.hasSubmitted = false
    } else {
      result.hasSubmitted = completion(submission)
    }
    result.endAt = field($, '종료 일시') || result.endAt
  } else if (result.type === 'quiz') {
    const states = main
      .find('.user-info-item-state .user-info-value')
      .map((_, el) => clean($(el).text()))
      .get()
    const hasStartButton = main
      .find('button')
      .get()
      .some(el => /^(시험 응시|응시 시작|계속 응시)$/.test(clean($(el).text())))
    result.hasSubmitted = states.includes('종료')
      ? true
      : states.some(state => completion(state) === false) || hasStartButton
        ? false
        : null
    const dates = field($, '시험 기간').match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?/g)
    if (dates?.length === 2) [result.startAt, result.endAt] = dates
  } else {
    result.hasSubmitted = completion($('#csms-mod-completion .csms-chips').text())
    const percent = clean($('#csms-mod-progress').text()).match(/^(\d+(?:\.\d+)?)\s*%$/)
    if (!percent && result.hasSubmitted !== true) throw new Error('LMS_STRUCTURE_CHANGED')
    if (percent) result.progress = Math.min(100, Number(percent[1]))
    result.startAt = clean($('.extrainfo-item .timeopen').first().text()) || result.startAt
    result.endAt = clean($('.extrainfo-item .timeclose').first().text()) || result.endAt
  }
  if (result.hasSubmitted === null) throw new Error('LMS_STRUCTURE_CHANGED')
  return result
}
