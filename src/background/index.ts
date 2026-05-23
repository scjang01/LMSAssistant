import { isImminentTask } from '@/utils'

/**
 * 스토리지 데이터를 기반으로 배지 텍스트를 업데이트합니다.
 */
const updateBadge = async () => {
  try {
    const data = await chrome.storage.local.get(['contents', 'manualOverrides'])
    const activityList = data.contents?.activityList || []
    const manualOverrides = data.manualOverrides || {}

    const imminentCount = activityList.filter((task: any) => {
      // 사용자가 수동으로 체크했거나 실제 제출 상태를 반영하여 마감 임박 여부 계산
      const hasSubmitted = manualOverrides[task.id] !== undefined ? manualOverrides[task.id] : task.hasSubmitted
      return isImminentTask({ ...task, hasSubmitted })
    }).length

    if (imminentCount > 0) {
      const badgeText = imminentCount > 99 ? '99+' : imminentCount.toString()
      await chrome.action.setBadgeText({ text: badgeText })
      await chrome.action.setBadgeBackgroundColor({ color: '#F87171' }) // Red-400
    } else {
      await chrome.action.setBadgeText({ text: '' })
    }
  } catch (error) {
    console.error('[Badge] Failed to update badge:', error)
  }
}

// 1. 서비스 워커가 로드될 때 즉시 실행 (가장 중요)
updateBadge()

// 2. 설치 또는 업데이트 시 실행
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create('update-badge-alarm', { periodInMinutes: 1 })
  updateBadge()

  // 기존 탭들에 스크립트 주입 로직
  const manifest = chrome.runtime.getManifest()
  for (const cs of manifest.content_scripts ?? []) {
    for (const tab of await chrome.tabs.query({ url: cs.matches ?? [] })) {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: cs.js ?? [],
        }).catch(() => {}) // 에러 무시
      }
    }
  }
})

// 3. 브라우저 시작 시 실행
chrome.runtime.onStartup.addListener(() => {
  updateBadge()
})

// 4. 주기적 알람 (1분마다)
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'update-badge-alarm') {
    updateBadge()
  }
})

// 5. 아이콘 클릭 시 대시보드 토글
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return

  try {
    // 1. 이미 대시보드가 주입되어 있는지 확인
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-dashboard' })
  } catch (e) {
    // 2. 에러가 나면 스크립트가 아직 없는 것이므로 동적 주입 (activeTab 권한 활용)
    const manifest = chrome.runtime.getManifest()
    // CRXJS가 빌드한 실제 번들 파일 경로를 매니페스트에서 동적으로 가져옵니다.
    const contentScriptPath = manifest.content_scripts?.[0]?.js?.[0]

    if (contentScriptPath) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [contentScriptPath],
        })
        // 주입 후 약간의 대기 후 메시지 전송
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id!, { action: 'toggle-dashboard' })
        }, 150)
      } catch (scriptError) {
        console.error('Failed to inject script:', scriptError)
      }
    }
  }
})

// 6. 스토리지 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.contents || changes.manualOverrides)) {
    updateBadge()
  }
})

// 7. HTML Fetch 대행 (Open Proxy 방지)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'fetch-html') {
    const allowedOrigins = ['https://cyber.gachon.ac.kr', 'https://lib.gachon.ac.kr']

    try {
      const url = new URL(request.url)
      if (!allowedOrigins.includes(url.origin)) {
        sendResponse({ success: false, error: 'Forbidden domain' })
        return false
      }
    } catch (e) {
      sendResponse({ success: false, error: 'Invalid URL' })
      return false
    }

    fetch(request.url, { credentials: 'include' })
      .then(async response => {
        const html = await response.text()
        sendResponse({
          success: true,
          html,
          finalUrl: response.url,
        })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })

    return true // 비동기 응답을 위해 true 반환
  }
})
export {}
