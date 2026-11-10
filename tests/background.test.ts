import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  get: vi.fn(),
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
  onInstalled: vi.fn(),
  onStartup: vi.fn(),
  onMessage: vi.fn(),
  onAlarm: vi.fn(),
  onChanged: vi.fn(),
  createAlarm: vi.fn(),
  fetch: vi.fn(),
}))
beforeEach(() => {
  vi.resetModules()
  Object.values(mock).forEach(fn => fn.mockReset())
  mock.get.mockResolvedValue({})
  mock.createAlarm.mockResolvedValue(undefined)
  vi.stubGlobal('fetch', mock.fetch)
  vi.stubGlobal('chrome', {
    runtime: {
      onInstalled: { addListener: mock.onInstalled },
      onStartup: { addListener: mock.onStartup },
      onMessage: { addListener: mock.onMessage },
    },
    action: {
      onClicked: { addListener: vi.fn() },
      setBadgeText: mock.setBadgeText,
      setBadgeBackgroundColor: mock.setBadgeBackgroundColor,
    },
    storage: { local: { get: mock.get }, onChanged: { addListener: mock.onChanged } },
    alarms: { create: mock.createAlarm, onAlarm: { addListener: mock.onAlarm } },
  })
})
afterEach(() => vi.unstubAllGlobals())

async function load() {
  await import('@/background')
}

describe('백그라운드 배지 및 요청 처리', () => {
  it('수동 미완료 값이 남아 있어도 서버가 완료한 항목은 배지에 세지 않는다', async () => {
    mock.get.mockResolvedValue({
      contents: {
        activityList: [
          {
            id: '1',
            type: 'assignment',
            hasSubmitted: true,
            startAt: '',
            endAt: new Date(Date.now() + 3600000).toISOString(),
          },
        ],
      },
      manualOverrides: { '1': false },
    })
    await load()
    await vi.waitFor(() => expect(mock.setBadgeText).toHaveBeenCalledWith({ text: '' }))
  })

  it('브라우저 재시작 시 배지 알람을 다시 등록한다', async () => {
    await load()
    await mock.onStartup.mock.calls[0][0]()
    expect(mock.createAlarm).toHaveBeenCalledWith('update-badge-alarm', { periodInMinutes: 1 })
  })

  it('학교와 다른 도메인 요청은 전송하지 않는다', async () => {
    await load()
    const respond = vi.fn()
    expect(mock.onMessage.mock.calls[0][0]({ action: 'fetch-html', url: 'https://example.com/' }, {}, respond)).toBe(
      false,
    )
    expect(respond).toHaveBeenCalledWith({ success: false, error: 'Forbidden domain' })
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('HTTP 오류 페이지를 정상 수집 결과로 반환하지 않는다', async () => {
    mock.fetch.mockResolvedValue({ ok: false, status: 503 })
    await load()
    const respond = vi.fn()
    mock.onMessage.mock.calls[0][0]({ action: 'fetch-html', url: 'https://lms.inu.ac.kr/' }, {}, respond)
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ success: false, error: 'LMS_HTTP_503' }))
  })

  it('정상 요청에는 브라우저 인증과 시간 제한을 적용한다', async () => {
    mock.fetch.mockResolvedValue({ ok: true, text: async () => '<html>OK</html>', url: 'https://lms.inu.ac.kr/' })
    await load()
    const respond = vi.fn()
    mock.onMessage.mock.calls[0][0]({ action: 'fetch-html', url: 'https://lms.inu.ac.kr/' }, {}, respond)
    await vi.waitFor(() =>
      expect(respond).toHaveBeenCalledWith({
        success: true,
        html: '<html>OK</html>',
        finalUrl: 'https://lms.inu.ac.kr/',
      }),
    )
    expect(mock.fetch.mock.calls[0][1]).toMatchObject({ credentials: 'include', signal: expect.any(AbortSignal) })
  })
})
