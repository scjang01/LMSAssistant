import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  getData: vi.fn(),
  setData: vi.fn(),
  onStorageChanged: vi.fn(),
}))
vi.mock('@/storage/chromeStorageClient', () => ({ chromeStorageClient: mock }))

beforeEach(() => {
  vi.resetModules()
  mock.getData.mockReset().mockResolvedValue({})
  mock.setData.mockReset().mockResolvedValue(undefined)
  mock.onStorageChanged.mockReset()
})

async function load() {
  const { useStorageStore } = await import('@/storage/useStorageStore')
  await vi.waitFor(() => expect(useStorageStore.getState().isInitialized).toBe(true))
  return useStorageStore
}

describe('저장소 보존 및 동시 변경', () => {
  it('기본 2시간과 현재 버전을 읽되 초기화 시 기존 데이터를 다시 덮어쓰지 않는다', async () => {
    const store = await load()
    expect(store.getState().settings.refreshInterval).toBe(7200000)
    expect(store.getState().meta.version).toBe('2.2.0')
    expect(mock.setData).not.toHaveBeenCalled()
  })

  it('기존 사용자의 갱신 간격과 단축키를 유지한다', async () => {
    mock.getData.mockResolvedValue({ settings: { refreshInterval: 300000, shortcut: 'alt+q' } })
    const store = await load()
    expect(store.getState().settings).toMatchObject({ refreshInterval: 300000, shortcut: 'alt+q' })
  })

  it('동시에 선택한 필터 둘 다 보존하고 같은 항목은 중복시키지 않는다', async () => {
    const store = await load()
    await Promise.all([
      store.getState().updateData('filterOptions', prev => ({ ...prev, courseIds: [...prev.courseIds, '10'] })),
      store.getState().updateData('filterOptions', prev => ({ ...prev, courseIds: [...prev.courseIds, '20'] })),
    ])
    expect(store.getState().filterOptions.courseIds).toEqual(['10', '20'])
  })

  it('저장 실패가 다음 변경까지 막지 않는다', async () => {
    const store = await load()
    mock.setData.mockRejectedValueOnce(new Error('write failed'))
    await expect(store.getState().updateData('manualOverrides', () => ({ first: true }))).rejects.toThrow(
      'write failed',
    )
    await store.getState().updateData('manualOverrides', () => ({ second: true }))
    expect(store.getState().manualOverrides).toEqual({ second: true })
  })

  it('서버 완료 확인과 수동 체크 정리를 한 번에 저장한다', async () => {
    const store = await load()
    store.setState({ manualOverrides: { '1': true, '2': true } })
    await store.getState().updateData('contents', () => ({
      courseList: [],
      activityList: [
        {
          type: 'assignment',
          id: '1',
          title: '과제',
          courseId: '10',
          courseTitle: '수학',
          startAt: '',
          endAt: '',
          hasSubmitted: true,
        },
      ],
    }))
    expect(mock.setData).toHaveBeenCalledOnce()
    expect(mock.setData.mock.calls[0][0]).toMatchObject({ manualOverrides: { '2': true } })
    expect(store.getState().manualOverrides).toEqual({ '2': true })
  })

  it('다른 저장 영역의 같은 이름 키가 로컬 설정을 덮어쓰지 않는다', async () => {
    const store = await load()
    const onChanged = mock.onStorageChanged.mock.calls[0][0]
    onChanged({ settings: { newValue: { refreshInterval: 1 } } }, 'sync')
    expect(store.getState().settings.refreshInterval).toBe(7200000)
  })

  it('목록에서 사라진 과목 필터는 정리하고 현재 과목 필터는 보존한다', async () => {
    const store = await load()
    store.setState({ filterOptions: { statuses: [], categories: [], courseIds: ['old', '10'] } })
    await store
      .getState()
      .updateData('contents', () => ({ courseList: [{ id: '10', title: '수학' }], activityList: [] }))
    expect(store.getState().filterOptions.courseIds).toEqual(['10'])
  })

  it('확인 불가 상태가 필터 적용 중 미완료로 변하지 않는다', async () => {
    const store = await load()
    store.setState({
      contents: {
        courseList: [],
        activityList: [
          {
            type: 'assignment',
            id: '1',
            title: '과제',
            courseId: '10',
            courseTitle: '수학',
            startAt: '',
            endAt: '',
            hasSubmitted: null,
          },
        ],
      },
    })
    expect(store.getState().getFilteredActivities('')[0].hasSubmitted).toBeNull()
  })
})
