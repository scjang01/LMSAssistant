import * as cheerio from 'cheerio'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAssignmentSubmitted, getCourseActivities, getCourses, getQuizSubmitted } from '@/services/parser/gachon'
import { getTaskStatus } from '@/utils/task'

const mocks = vi.hoisted(() => ({ fetchAndParse: vi.fn() }))
vi.mock('@/services/parser/gachon/dom', () => ({ fetchAndParse: mocks.fetchAndParse }))

function pages(html: Record<string, string>) {
  mocks.fetchAndParse.mockReset().mockImplementation(async (url: string) => {
    if (!(url in html)) throw new Error('Unexpected URL')
    return cheerio.load(html[url])
  })
}

afterEach(() => vi.restoreAllMocks())

describe('가천대 기존 수집 호환성', () => {
  it.each(['assign', 'video', 'quiz'])('조회 실패(%s)를 빈 목록으로 숨기지 않는다', async target => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const html: Record<string, string> = {
      '/mod/assign/index.php?id=10': '<table></table>',
      '/mod/quiz/index.php?id=10': '<table></table>',
      '/report/ubcompletion/user_progress.php?id=10': '<table></table>',
      '/course/view.php?id=10': '<div></div>',
    }
    const failed =
      target === 'video' ? '/report/ubcompletion/user_progress.php?id=10' : `/mod/${target}/index.php?id=10`
    delete html[failed]
    pages(html)
    await expect(getCourseActivities({ id: '10', title: '수학' })).rejects.toThrow('Unexpected URL')
  })

  it('기존 과목 목록 주소와 과목명 정제를 유지한다', async () => {
    pages({
      '/local/ubion/user/index.php':
        '<div class="my-course-lists"><a href="/course/view.php?id=10">수학 [123] (2026_02)</a></div>',
    })
    expect(await getCourses()).toEqual([{ id: '10', title: '수학' }])
    expect(mocks.fetchAndParse).toHaveBeenCalledWith('/local/ubion/user/index.php', 'ko')
  })

  it('기존 과제 표의 제출 여부와 마감일 해석을 유지한다', async () => {
    pages({
      '/mod/assign/index.php?id=10':
        '<table><tbody><tr><td class="c1"><a href="/mod/assign/view.php?id=42">과제</a></td><td class="c2">2026-11-15 23:59</td><td class="c3">제출 완료</td><td class="c4">-</td></tr></tbody></table>',
    })
    expect(await getAssignmentSubmitted('10')).toEqual([
      { id: '42', title: '과제', startAt: '', endAt: '2026-11-15 23:59:00', hasSubmitted: true },
    ])
  })

  it('기존 퀴즈 목록과 상세 조회를 유지한다', async () => {
    pages({
      '/mod/quiz/index.php?id=10':
        '<table><tbody><tr><td class="c1"><a href="/mod/quiz/view.php?id=43">퀴즈</a></td><td class="c2">2026-11-16 23:59</td><td class="c3">-</td></tr></tbody></table>',
      '/mod/quiz/view.php?id=43': '<div id="region-main"><span class="csms-chips-status-icon-done"></span></div>',
    })
    expect((await getQuizSubmitted('10'))[0]).toMatchObject({ id: '43', hasSubmitted: true })
  })

  it('공통 진입점 변경 후에도 기존 출석 현황 주소와 진행률을 유지한다', async () => {
    pages({
      '/mod/assign/index.php?id=10': '<table></table>',
      '/mod/quiz/index.php?id=10': '<table></table>',
      '/report/ubcompletion/user_progress.php?id=10':
        '<table class="user_progress"><tbody><tr><td class="sectiontitle" title="1주차"><img src="/vod/icon.png"></td><td class="text-left">영상</td><td>10:00</td><td>05:00</td><td>X</td></tr></tbody></table>',
      '/course/view.php?id=10':
        '<div class="modtype_vod"><div class="activityinstance"><a href="/mod/vod/view.php?id=44"><span class="instancename">영상 Vod</span></a></div><div class="displayoptions"><span class="text-ubstrap">2026-11-01 00:00 ~ 2026-11-30 23:59</span></div></div>',
    })
    expect(await getCourseActivities({ id: '10', title: '수학' })).toEqual([
      {
        type: 'video',
        id: '44',
        title: '영상',
        courseId: '10',
        courseTitle: '수학',
        sectionTitle: '1주차',
        startAt: '2026-11-01 00:00',
        endAt: '2026-11-30 23:59',
        hasSubmitted: false,
        progress: 50,
      },
    ])
    expect(mocks.fetchAndParse).toHaveBeenCalledTimes(4)
  })

  it('서로 다른 한글 영상의 진행률과 ID를 섞지 않는다', async () => {
    const titles = ['경제학', '통계학']
    pages({
      '/mod/assign/index.php?id=10': '<table></table>',
      '/mod/quiz/index.php?id=10': '<table></table>',
      '/report/ubcompletion/user_progress.php?id=10': `<table class="user_progress"><tbody>${titles
        .map(
          title =>
            `<tr><td><img src="/vod/icon.png"></td><td class="text-left">${title}</td><td>10:00</td><td>05:00</td><td>X</td></tr>`,
        )
        .join('')}</tbody></table>`,
      '/course/view.php?id=10': titles
        .map(
          (title, index) =>
            `<div class="modtype_vod"><div class="activityinstance"><a href="/mod/vod/view.php?id=${41 + index}"><span class="instancename">${title} Vod</span></a></div></div>`,
        )
        .join(''),
    })
    const result = await getCourseActivities({ id: '10', title: '수학' })
    expect(result.map(a => a.id)).toEqual(['41', '42'])
  })

  it('완료·진행 중·시작 전 상태의 기존 표시를 유지한다', () => {
    const task = {
      type: 'assignment' as const,
      id: '1',
      courseId: '10',
      courseTitle: '수학',
      title: '과제',
      startAt: '',
      endAt: '',
      hasSubmitted: false,
    }
    const now = new Date(2026, 10, 10, 12)
    expect(getTaskStatus({ ...task, hasSubmitted: true }, now)).toBe('submitted')
    expect(getTaskStatus(task, now)).toBe('no-deadline')
    expect(getTaskStatus({ ...task, startAt: '2026-11-11 00:00:00' }, now)).toBe('upcoming')
    expect(getTaskStatus({ ...task, endAt: '2026-11-09 00:00:00' }, now)).toBe('expired')
  })
})
