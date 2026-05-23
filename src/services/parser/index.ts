import { DOM_SELECTORS, UNIVERSITY_REGEX, SUBMISSION_STRINGS, URL_PATTERNS } from './constants'
import { fetchAndParse } from './utils/dom'
import { UNIVERSITY_NAME_MAP } from '@/constants'
import type { University } from '@/constants'
import type { Activity, Assignment, Course, Quiz, Video } from '@/types'
import { getLinkId, mapElement, getAttr, getText, getDirectText, origin, normalizeString, timeToSeconds } from '@/utils'

import type * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

/**
 * 과목 목록을 가져옵니다.
 */
export async function getCourses(
  university: University = UNIVERSITY_NAME_MAP[origin] || '가천대학교',
  params?: { year: number; semester: number },
): Promise<Course[]> {
  const url = params ? URL_PATTERNS.coursesWithYearSemester(params.year, params.semester) : URL_PATTERNS.courses
  const $ = await fetchAndParse(url, 'ko')

  const { link } = DOM_SELECTORS.courses
  let links: cheerio.Cheerio<AnyNode> = $('.my-course-lists').find(link)
  if (links.length === 0) links = $(link)

  const courses = mapElement(links, (_, el) => {
    const $el = $(el)
    const id = getLinkId(getAttr($el, 'href') || '')
    if (!id) return undefined

    const title = getText($el)
      .replace(UNIVERSITY_REGEX[university]?.titleRegex || '', '')
      .trim()

    return { id, title }
  })

  return Array.from(new Map(courses.map(c => [c.id, c])).values())
}

/**
 * 과제 제출 현황을 가져옵니다.
 */
export async function getAssignmentSubmitted(
  courseId: string,
): Promise<Array<Pick<Assignment, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>> {
  try {
    const $ = await fetchAndParse(URL_PATTERNS.assignmentSubmitted(courseId))
    const { container, divider, title, period, status } = DOM_SELECTORS.submissions.assignment
    const { DONE } = SUBMISSION_STRINGS.ASSIGNMENT

    return mapElement($(container), (_, el) => {
      const $el = $(el)
      if ($el.find(divider).length) return

      const $title = $el.find(title)
      const id = getLinkId(getAttr($title, 'href') || '')
      const statusText = getText($el.find(status))
      
      return {
        id,
        title: getText($title),
        endAt: getText($el.find(period)) + ':00',
        hasSubmitted: (DONE as readonly string[]).some(keyword => statusText.includes(keyword)),
      }
    })
  } catch {
    return []
  }
}

/**
 * MOOC/동영상 시청 현황을 가져옵니다.
 */
export async function getVideoSubmitted(
  courseId: string,
): Promise<Array<Pick<Video, 'title' | 'hasSubmitted' | 'sectionTitle' | 'progress' | 'id' | 'endAt'>>> {
  try {
    const [$progressPage, $overviewPage] = await Promise.all([
      fetchAndParse(URL_PATTERNS.videoSubmitted(courseId)),
      fetchAndParse(URL_PATTERNS.activities(courseId)),
    ])

    // 1. 진행도 파싱
    const { container, title, sectionTitle, requiredTime } = DOM_SELECTORS.submissions.video
    const { COLLECTIVE, DONE: VIDEO_DONE } = SUBMISSION_STRINGS.VIDEO
    let currentSectionTitle = ''

    const progressList = mapElement($progressPage(container), (_, el) => {
      const $el = $progressPage(el)
      const iconSrc = $el.find('td img').attr('src') || ''
      if (!iconSrc.includes('vod') || !iconSrc.includes('icon')) return

      const originalTitle = $el.find(sectionTitle).attr('title')
      if (originalTitle) currentSectionTitle = originalTitle

      const videoTitle = getText($el.find(title))
      const $std = $el.find(requiredTime)
      const cellText = getText($std)

      if ((COLLECTIVE as readonly string[]).some(s => cellText.includes(s))) {
        return { title: videoTitle, hasSubmitted: true, progress: 100, sectionTitle: currentSectionTitle }
      }

      const requiredSec = timeToSeconds(getDirectText($std))
      const studySec = timeToSeconds(getDirectText($std.next()))
      const isCompletedBySymbol = (VIDEO_DONE as readonly string[]).includes(getText($el.find('td').last()))

      const progress = requiredSec > 0 ? Math.min(Math.round((studySec / requiredSec) * 100), 100) : (isCompletedBySymbol ? 100 : 0)
      const hasSubmitted = progress >= 100 || isCompletedBySymbol

      return { title: videoTitle, hasSubmitted, progress, sectionTitle: currentSectionTitle }
    })

    // 2. 메타데이터(ID, 마감일) 매핑
    const videoMeta: Record<string, { id: string; endAt: string }> = {}
    $overviewPage('.modtype_vod').each((_, el) => {
      const $el = $overviewPage(el)
      const $link = $el.find('.activityinstance a')
      if (!$link.length) return

      const title = getText($el.find('.instancename')).replace(/\s*(동영상|Vod)$/i, '').trim()
      const periodText = getText($el.find('.displayoptions .text-ubstrap'))
      const dateMatch = periodText.match(/~\s*(\d{4}-\d{2}-\d{2}(\s*\d{2}:\d{2}(:\d{2})?)?)/i)

      let endAt = dateMatch ? dateMatch[1].trim() : ''
      if (endAt && endAt.length === 10) endAt += ' 23:59:59'

      videoMeta[normalizeString(title)] = { id: getLinkId($link.attr('href') || ''), endAt }
    })

    return progressList.map(item => {
      const meta = videoMeta[normalizeString(item.title)]
      return { ...item, id: meta?.id || item.title, endAt: meta?.endAt || '' }
    })
  } catch (error) {
    console.error(`[Parser] Error fetching video data for ${courseId}:`, error)
    return []
  }
}

/**
 * 퀴즈 제출 현황을 가져옵니다.
 */
export async function getQuizSubmitted(
  courseId: string,
): Promise<Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>> {
  try {
    const $indexPage = await fetchAndParse(URL_PATTERNS.quizSubmitted(courseId))
    const { container, title, period, status } = DOM_SELECTORS.submissions.quiz
    const { PROGRESS } = SUBMISSION_STRINGS.QUIZ

    const quizzes = mapElement($indexPage(container), (_, el) => {
      const $el = $indexPage(el)
      const $title = $el.find(title)
      if (!$title.length) return

      const rawPeriod = getText($el.find(period)).trim()
      const statusText = getText($el.find(status)).trim()

      return {
        id: getLinkId(getAttr($title, 'href')),
        title: getText($title),
        endAt: rawPeriod === '-' || !rawPeriod ? '' : rawPeriod + ':00',
        hasSubmitted: statusText !== '' && statusText !== '-' && !(PROGRESS as readonly string[]).some(s => statusText.includes(s)),
      }
    })

    // 퀴즈는 상세 페이지에서 마감일과 제출 여부를 더 정확히 확인해야 함
    // 리소스 최적화: 한꺼번에 모든 페이지를 요청하지 않고, 3개씩 묶어서 처리 (Concurrency Limit)
    const results: Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt'>> = []
    const chunkSize = 3

    for (let i = 0; i < quizzes.length; i += chunkSize) {
      const chunk = quizzes.slice(i, i + chunkSize)
      const chunkResults = await Promise.all(
        chunk.map(async quiz => {
          try {
            const $detailPage = await fetchAndParse(`/mod/quiz/view.php?id=${quiz.id}`)
            const mainContent = $detailPage('#region-main')
            const dueMatch = mainContent.text().match(/(Close|Closing date):\s*([^\n,]+)/i)

            return {
              ...quiz,
              hasSubmitted: checkQuizSubmissionDetail($detailPage),
              endAt: dueMatch ? dueMatch[2].trim() : quiz.endAt,
            }
          } catch (error) {
            console.error(`[Parser] Failed to fetch quiz detail for ${quiz.id}:`, error)
            return quiz
          }
        }),
      )
      results.push(...chunkResults)
    }

    return results
  } catch {
    return []
  }
}

function checkQuizSubmissionDetail($: cheerio.CheerioAPI): boolean {
  const { ICON_DONE, FINISHED, DONE } = SUBMISSION_STRINGS.QUIZ
  if ($(ICON_DONE).length > 0) return true

  const finishedKeywords = [...FINISHED, ...DONE]
  const hasValidAttempt = $('.quizattemptsummary tbody tr').get().some(row => {
    return finishedKeywords.some(keyword => getText($(row).find('td.c0')).includes(keyword))
  })
  if (hasValidAttempt) return true

  const submissionKeywords = [...finishedKeywords, '이미 응시하셨습니다', '최고 점수:', '성적:', 'Highest grade:', 'Grade:']
  return submissionKeywords.some(keyword => getText($('#region-main')).includes(keyword))
}

export async function getActivitiesPage(courseId: string): Promise<cheerio.CheerioAPI> {
  return fetchAndParse(URL_PATTERNS.activities(courseId))
}

/**
 * 가져온 데이터들을 하나의 활동 리스트로 통합합니다.
 */
export async function getActivities(
  courseTitle: string,
  courseId: string,
  assignmentSubmittedArray: Array<Pick<Assignment, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>,
  videoSubmittedArray: Array<Pick<Video, 'title' | 'hasSubmitted' | 'sectionTitle' | 'progress' | 'id' | 'endAt'>>,
  quizSubmittedArray: Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt'>>,
): Promise<Activity[]> {
  const assignments: Assignment[] = assignmentSubmittedArray.map(a => ({
    type: 'assignment', id: a.id, courseId, courseTitle, title: a.title, startAt: '', endAt: a.endAt, hasSubmitted: a.hasSubmitted,
  }))

  const videos: Video[] = videoSubmittedArray.map(v => ({
    type: 'video', id: v.id || `video-${courseId}-${normalizeString(v.title)}`, courseId, courseTitle, title: v.title, startAt: '', endAt: v.endAt, sectionTitle: v.sectionTitle, hasSubmitted: v.hasSubmitted, progress: v.progress ?? 0,
  }))

  const quizzes: Quiz[] = quizSubmittedArray.map(q => ({
    type: 'quiz', id: q.id, courseId, courseTitle, title: q.title, startAt: '', endAt: q.endAt, hasSubmitted: q.hasSubmitted,
  }))

  return [...assignments, ...videos, ...quizzes]
}
