import * as cheerio from 'cheerio'
import { existsSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCourseActivities } from '@/services/parser/incheon'
import { fetchAndParse } from '@/services/parser/incheon/dom'
import { needsDetail, parseCourseActivities, parseCourses, parseDetail } from '@/services/parser/incheon/parse'
import type { Activity, Course } from '@/types'
import { getTaskStatus } from '@/utils/task'

const course: Course = { id: '10', title: '수학' }
const now = new Date(2026, 10, 10, 12)
const activity = (type: Activity['type'], hasSubmitted: boolean | null, extra = {}): Activity =>
  ({
    id: '42',
    courseId: course.id,
    courseTitle: course.title,
    type,
    title: '활동',
    startAt: '',
    endAt: '',
    hasSubmitted,
    ...(type === 'video' ? { sectionTitle: '1주차' } : {}),
    ...extra,
  }) as Activity
const section = (items: string) =>
  `<div id="region-main"><div data-for="section" data-sectionname="1주차">${items}</div></div>`
const item = (id: string, type: string, tag = '', start = '', end = '') => `
<li class="activity modtype_${type} activity-incomplete" data-id="${id}">
  <div data-activityname="활동 ${id}"><a class="activity-container" href="/mod/${type}/view.php?id=${id}">활동</a></div>
  <div class="activity-dates"><span class="timeopen">${start}</span><span class="timeclose">${end}</span></div>
  <div class="activity-extend-info"><div class="csms-chips-date">마감</div>
    ${tag ? `<div class="csms-chips-dot"><span class="text">${tag}</span></div>` : ''}
  </div>
</li>`
const fields = (values: Record<string, string>) =>
  Object.entries(values)
    .map(
      ([label, value]) =>
        `<div class="cml-item"><div class="cml-label">${label}</div><div class="cml-text">${value}</div></div>`,
    )
    .join('')
const assignment = (state: string) =>
  `<div id="region-main"><p>설명: 과제 완료</p>${fields({ '제출 상태': state, '채점 상태': '미채점', '종료 일시': '2026-11-15 23:59:00' })}</div>`
const video = (progress: string, status: string) => `<div id="region-main"><div class="video-js">로드됨: 99%</div></div>
<span id="csms-mod-progress">${progress}</span><span id="csms-mod-completion"><span class="csms-chips">${status}</span></span>`

function mockPages(pages: Record<string, string | Error>, delay = 0) {
  const urls: URL[] = []
  let active = 0
  let peak = 0
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: vi.fn((request, callback) => {
        const url = new URL(request.url)
        urls.push(url)
        active++
        peak = Math.max(peak, active)
        setTimeout(() => {
          active--
          const page = pages[url.pathname + url.search.replace(/[?&]lang=ko/, '')] ?? pages[url.pathname]
          callback(
            page instanceof Error
              ? { success: false, error: page.message }
              : { success: true, html: page ?? '<div>Unexpected page</div>', finalUrl: url.href },
          )
        }, delay)
      }),
    },
  })
  return { urls, peak: () => peak }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('인천대 HTML 해석', () => {
  it.each(['course-list-item-link', 'course-card'])('메인 %s에서 교과과정만 수집하고 중복을 제거한다', className => {
    const link = `<a class="${className}" href="/course/view.php?id=10"><h5>수학 (ABC123)</h5>교수 이름</a>`
    const html = `<div class="ongoing-courses"><div class="csms-box"><div class="csms-box-header">교과과정</div>${link}${link}</div>
      <div class="csms-box"><div class="csms-box-header">자율과정</div><a class="${className}" href="/course/view.php?id=20"><h5>비교과</h5></a></div></div>`
    expect(parseCourses(cheerio.load(html))).toEqual([{ id: '10', title: '수학' }])
  })

  it('섹션에서 상태 태그와 기간을 읽고 숨은 incomplete 클래스는 무시한다', () => {
    const parsed = parseCourseActivities(
      cheerio.load(
        section(
          item('1', 'assign') +
            item('2', 'quiz', '완료') +
            item('3', 'vod', '미완료', '2026-11-10 00:00:00', '2026-11-16 23:59:00'),
        ),
      ),
      course,
    )
    expect(parsed.map(a => a.hasSubmitted)).toEqual([null, true, false])
    expect(parsed[2]).toMatchObject({
      startAt: '2026-11-10 00:00:00',
      endAt: '2026-11-16 23:59:00',
      sectionTitle: '1주차',
    })
  })

  it('시작 전 영상의 링크가 없어도 ID와 기간을 보존한다', () => {
    const html = section(item('42', 'vod', '', '2026-12-01 00:00:00').replace(/<a[^>]*>활동<\/a>/, ''))
    expect(parseCourseActivities(cheerio.load(html), course)[0]).toMatchObject({
      id: '42',
      url: 'https://lms.inu.ac.kr/mod/vod/view.php?id=42',
    })
  })

  it.each(['미완료', ''])('기간 없이 영상 길이만 있으면 출석 체크 없이 처리한다: %s', tag => {
    const html = section(
      item('42', 'vod', tag).replace(
        '<div class="activity-extend-info">',
        '<div class="activity-extend-info"><span class="text-playtime">48:49</span>',
      ),
    )
    const [result] = parseCourseActivities(cheerio.load(html), course)
    expect(result).toMatchObject({ attendanceNotRequired: true, hasSubmitted: false })
    expect(needsDetail(result, now)).toBe(false)
    expect(getTaskStatus(result, now)).not.toBe('unknown')
  })

  it('영상 길이도 기간도 없으면 출석 체크 없음으로 추정하지 않는다', () => {
    const [result] = parseCourseActivities(cheerio.load(section(item('42', 'vod'))), course)
    expect(result).toMatchObject({ attendanceNotRequired: false, hasSubmitted: null })
    expect(needsDetail(result, now)).toBe(true)
  })

  it('기간과 영상 길이가 함께 있으면 상세 진행률 조회를 유지한다', () => {
    const html = section(
      item('42', 'vod', '미완료', '2026-11-01 00:00:00', '2026-11-30 23:59:00').replace(
        '<div class="activity-extend-info">',
        '<div class="activity-extend-info"><span class="text-playtime">1:02:03</span>',
      ),
    )
    const [result] = parseCourseActivities(cheerio.load(html), course)
    expect(result).toMatchObject({ attendanceNotRequired: false })
    expect(needsDetail(result, now)).toBe(true)
  })

  it.each([
    ['제출 완료', true],
    ['미제출', false],
    ['초안', false],
  ] as const)('과제의 제출 상태 %s를 정확히 읽는다', (state, expected) => {
    expect(parseDetail(cheerio.load(assignment(state)), activity('assignment', null))).toMatchObject({
      hasSubmitted: expected,
      endAt: '2026-11-15 23:59:00',
    })
  })

  it('온라인 제출이 필요 없는 과제는 확인 불가 대신 별도로 구분하고 마감일을 유지한다', () => {
    const result = parseDetail(
      cheerio.load(assignment('온라인 제출이 필요하지 않은 과제입니다.')),
      activity('assignment', null),
    )
    expect(result).toMatchObject({
      onlineSubmissionNotRequired: true,
      hasSubmitted: false,
      endAt: '2026-11-15 23:59:00',
    })
    expect(result.syncFailed).not.toBe(true)
    expect(getTaskStatus(result, now)).not.toBe('unknown')
  })

  it('퀴즈의 종료 기록을 완료로 판정한다', () => {
    const html = `<div id="region-main">${fields({ '시험 기간': '2026-10-01 00:00:00 ~ 2026-11-30 23:59:00' })}
      <div class="user-info-item-state"><span class="user-info-value">진행 중</span></div>
      <div class="user-info-item-state"><span class="user-info-value">종료</span></div></div>`
    expect(parseDetail(cheerio.load(html), activity('quiz', null))).toMatchObject({
      hasSubmitted: true,
      endAt: '2026-11-30 23:59:00',
    })
  })

  it('퀴즈 응시 버튼만 있으면 미완료로 판정한다', () => {
    expect(
      parseDetail(cheerio.load('<div id="region-main"><button>시험 응시</button></div>'), activity('quiz', null))
        .hasSubmitted,
    ).toBe(false)
  })

  it('영상 플레이어의 로딩률 대신 실제 진도율과 활동 상태를 읽는다', () => {
    expect(parseDetail(cheerio.load(video('4.09%', '미완료')), activity('video', null))).toMatchObject({
      progress: 4.09,
      hasSubmitted: false,
    })
  })

  it('진도율 100%여도 출석 상태가 미완료면 완료로 바꾸지 않는다', () => {
    expect(parseDetail(cheerio.load(video('100%', '미완료')), activity('video', null)).hasSubmitted).toBe(false)
  })

  it('영상 진행률이 없으면 0%로 추정하지 않고 조회 실패로 처리한다', () => {
    expect(() => parseDetail(cheerio.load(video('', '미완료')), activity('video', false))).toThrow(
      'LMS_STRUCTURE_CHANGED',
    )
  })

  it('영상의 종료 문구를 출석 완료로 해석하지 않는다', () => {
    expect(() => parseDetail(cheerio.load(video('100%', '종료')), activity('video', null))).toThrow(
      'LMS_STRUCTURE_CHANGED',
    )
  })

  it('알 수 없는 HTML을 미완료로 추정하지 않는다', () => {
    expect(() =>
      parseDetail(cheerio.load('<div id="region-main">과제 완료 안내</div>'), activity('assignment', null)),
    ).toThrow('LMS_STRUCTURE_CHANGED')
    expect(() => parseCourseActivities(cheerio.load('<div>오류</div>'), course)).toThrow('LMS_STRUCTURE_CHANGED')
  })
})

describe('상세 조회 대상', () => {
  it.each([
    ['assignment', true, '', false],
    ['assignment', false, '', false],
    ['assignment', null, '', true],
    ['quiz', true, '', false],
    ['quiz', false, '', false],
    ['quiz', null, '', true],
    ['video', true, '', false],
    ['video', false, '', true],
    ['video', null, '', true],
    ['video', false, '2026-12-01 00:00:00', false],
    ['video', null, '2026-12-01 00:00:00', false],
  ] as const)('%s 상태 %s, 시작 %s → 상세 %s', (type, state, startAt, expected) => {
    expect(needsDetail(activity(type, state, { startAt }), now)).toBe(expected)
  })
})

describe('수집 및 오류 처리', () => {
  it('기본 과목 화면이 대시보드여도 섹션 모드를 지정해 활동을 가져온다', async () => {
    const requests = mockPages({
      '/course/view.php': '<div id="region-main"><div class="coursemos-course-dashboard">대시보드</div></div>',
      '/course/view.php?id=10&mode=sections': section(item('1', 'assign', '완료')),
    })
    const result = await getCourseActivities(course)
    expect(result).toHaveLength(1)
    expect(requests.urls[0].searchParams.get('mode')).toBe('sections')
  })

  it('과목 섹션은 한 번 조회하고 필요한 상세만 조회한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const requests = mockPages({
      '/course/view.php?id=10&mode=sections': section(
        item('1', 'assign', '완료') +
          item('2', 'quiz', '미완료') +
          item('3', 'assign') +
          item('4', 'vod', '완료') +
          item('5', 'vod', '미완료') +
          item('6', 'vod', '', '2026-12-01 00:00:00'),
      ),
      '/mod/assign/view.php?id=3': assignment('제출 완료'),
      '/mod/vod/view.php?id=5': video('4.09%', '미완료'),
    })
    const pending = getCourseActivities(course)
    await vi.runAllTimersAsync()
    const result = await pending
    expect(requests.urls.map(u => u.pathname + '?id=' + u.searchParams.get('id'))).toEqual([
      '/course/view.php?id=10',
      '/mod/assign/view.php?id=3',
      '/mod/vod/view.php?id=5',
    ])
    expect(result[2].hasSubmitted).toBe(true)
    expect(result[4]).toMatchObject({ progress: 4.09, hasSubmitted: false })
    expect(result[5]).not.toHaveProperty('progress')
  })

  it('여러 과목을 동시에 수집해도 요청은 최대 3개로 제한한다', async () => {
    const requests = mockPages(
      {
        '/course/view.php': section(item('1', 'vod', '미완료') + item('2', 'vod', '미완료')),
        '/mod/vod/view.php': video('15%', '미완료'),
      },
      5,
    )
    await Promise.all(Array.from({ length: 5 }, (_, id) => getCourseActivities({ ...course, id: String(id) })))
    expect(requests.urls).toHaveLength(15)
    expect(requests.peak()).toBe(3)
  })

  it('출석 체크 없는 영상은 상세 페이지 요청을 만들지 않는다', async () => {
    const html = section(
      item('42', 'vod').replace(
        '<div class="activity-extend-info">',
        '<div class="activity-extend-info"><span class="text-playtime">48:49</span>',
      ),
    )
    const requests = mockPages({ '/course/view.php': html })
    const [result] = await getCourseActivities(course)
    expect(requests.urls).toHaveLength(1)
    expect(result).toMatchObject({ attendanceNotRequired: true, hasSubmitted: false })
    expect(result.syncFailed).not.toBe(true)
  })

  it('상세 실패 시 이전 상태와 진행률을 보존하고 실패 표시를 남긴다', async () => {
    mockPages({ '/course/view.php': section(item('42', 'vod', '미완료')), '/mod/vod/view.php': new Error('network') })
    const [result] = await getCourseActivities(course, [activity('video', false, { progress: 35 })])
    expect(result).toMatchObject({ hasSubmitted: false, progress: 35, syncFailed: true })
  })

  it('이전 정보가 없는 상세 실패는 확인 불가 상태로 남긴다', async () => {
    mockPages({ '/course/view.php': section(item('42', 'assign')), '/mod/assign/view.php': new Error('network') })
    const [result] = await getCourseActivities(course)
    expect(result).toMatchObject({ hasSubmitted: null, syncFailed: true })
    expect(getTaskStatus(result)).toBe('unknown')
  })

  it('로그인 만료는 일반 미완료로 숨기지 않고 상위로 전달한다', async () => {
    mockPages({
      '/course/view.php': section(item('42', 'assign')),
      '/mod/assign/view.php': '<body id="page-login-index"><form id="login"></form></body>',
    })
    await expect(getCourseActivities(course)).rejects.toThrow('LOGIN_REQUIRED')
  })

  it('다른 도메인에는 요청하지 않는다', async () => {
    const requests = mockPages({})
    await expect(fetchAndParse('https://example.com/')).rejects.toThrow('Forbidden domain')
    expect(requests.urls).toHaveLength(0)
  })
})

const samplePath = 'samples/incheon/'
const sample = (name: string) => cheerio.load(readFileSync(samplePath + name, 'utf8'))
describe.skipIf(!existsSync(samplePath + 'main_list.html'))('로컬 실제 HTML 샘플', () => {
  it.skipIf(!existsSync(samplePath + 'section_4953_raw.html'))(
    '국제통상법의 원본 대시보드 응답 대신 섹션 화면을 요청한다',
    async () => {
      mockPages({
        '/course/view.php?id=4953': readFileSync(samplePath + 'section_4953_raw.html', 'utf8'),
        '/course/view.php?id=4953&mode=sections': readFileSync(samplePath + 'section_4953.html', 'utf8'),
        '/mod/vod/view.php': readFileSync(samplePath + 'vod.html', 'utf8'),
      })
      expect(await getCourseActivities({ id: '4953', title: '국제통상법' })).toHaveLength(12)
    },
  )

  it('목록형과 카드형에서 동일한 교과과목 6개를 추출한다', () => {
    const list = parseCourses(sample('main_list.html'))
    expect(list).toHaveLength(6)
    expect(parseCourses(sample('main_card.html'))).toEqual(list)
  })
  it('제출 완료와 미제출 과제를 구분한다', () => {
    expect(parseDetail(sample('assign_submitted.html'), activity('assignment', null)).hasSubmitted).toBe(true)
    expect(parseDetail(sample('assign_not_submitted.html'), activity('assignment', null)).hasSubmitted).toBe(false)
  })

  it('국제통상법의 기간 없는 영상은 섹션에서 출석 체크 없음으로 판정한다', () => {
    const result = parseCourseActivities(sample('section_4953.html'), { id: '4953', title: '국제통상법' }).find(
      a => a.id === '55915',
    )!
    expect(result).toMatchObject({ attendanceNotRequired: true })
    expect(needsDetail(result, now)).toBe(false)
  })
  it('응시 완료와 미응시 퀴즈를 구분한다', () => {
    expect(parseDetail(sample('quiz_completed.html'), activity('quiz', null)).hasSubmitted).toBe(true)
    expect(parseDetail(sample('quiz_not_completed.html'), activity('quiz', null)).hasSubmitted).toBe(false)
  })
  it('영상의 실제 진행률 4.09%를 추출한다', () => {
    expect(parseDetail(sample('vod.html'), activity('video', null))).toMatchObject({
      progress: 4.09,
      hasSubmitted: false,
    })
  })
  it.each([
    ['5032', 14],
    ['4953', 12],
    ['4904', 3],
    ['7466', 24],
  ] as const)('과목 %s에서 활동 %i개를 추출한다', (id, count) => {
    expect(parseCourseActivities(sample(`section_${id}.html`), { ...course, id })).toHaveLength(count)
  })
})
