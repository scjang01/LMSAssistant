import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { TaskCard } from '@/components/task/TaskCard'
import type { Activity } from '@/types'

vi.mock('@/storage/useStorageStore', () => ({
  useStorageStore: (selector: (state: { updateData: () => void }) => unknown) => selector({ updateData: () => {} }),
}))

const task: Activity = {
  id: '42',
  type: 'video',
  courseId: '10',
  courseTitle: '수학',
  title: '영상',
  sectionTitle: '1주차',
  startAt: '',
  endAt: '',
  hasSubmitted: null,
}

describe('수집 결과 표시', () => {
  it('출석 체크 없는 영상은 확인 불가와 진행률 없이 별도 표시한다', () => {
    const html = renderToStaticMarkup(<TaskCard task={{ ...task, hasSubmitted: false, attendanceNotRequired: true }} />)
    expect(html).toContain('출석 체크 없음')
    expect(html).not.toContain('확인 불가')
    expect(html).not.toContain('진행도')
  })

  it('온라인 제출이 없는 과제는 별도 표시한다', () => {
    const assignment: Activity = {
      ...task,
      type: 'assignment',
      hasSubmitted: false,
      onlineSubmissionNotRequired: true,
    }
    const html = renderToStaticMarkup(<TaskCard task={assignment} />)
    expect(html).toContain('온라인 제출 없음')
    expect(html).not.toContain('확인 불가')
    expect(html).not.toContain('최신 상태 확인 실패')
  })

  it('온라인 제출이 없는 과제도 사용자가 완료로 체크하면 완료로 표시한다', () => {
    const assignment: Activity = {
      ...task,
      type: 'assignment',
      hasSubmitted: true,
      onlineSubmissionNotRequired: true,
    }
    expect(renderToStaticMarkup(<TaskCard task={assignment} />)).toContain('제출 완료')
  })

  it('확인 불가 상태를 미완료나 완료로 바꾸지 않고 표시한다', () => {
    const html = renderToStaticMarkup(<TaskCard task={{ ...task, syncFailed: true }} />)
    expect(html).toContain('확인 불가')
    expect(html).toContain('최신 상태 확인 실패')
    expect(html).not.toContain('진행도')
  })

  it('수치가 없는 완료 영상에 임의의 진행률을 표시하지 않는다', () => {
    const html = renderToStaticMarkup(<TaskCard task={{ ...task, hasSubmitted: true }} />)
    expect(html).toContain('시청 완료')
    expect(html).not.toContain('진행도')
  })

  it('실제로 확인한 소수점 진행률을 표시한다', () => {
    const html = renderToStaticMarkup(<TaskCard task={{ ...task, hasSubmitted: false, progress: 4.09 }} />)
    expect(html).toContain('4.09%')
  })

  it('마감일이 없는 시작 전 영상도 오류 없이 표시한다', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString()
    expect(renderToStaticMarkup(<TaskCard task={{ ...task, startAt: tomorrow }} />)).toContain('진행 전')
  })
})
