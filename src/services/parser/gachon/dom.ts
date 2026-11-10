import * as cheerio from 'cheerio'

import { origin } from '@/utils'

interface HtmlResponse {
  success: boolean
  html: string
  finalUrl?: string
  error?: string
}

export async function fetchAndParse(url: string, lang: 'en' | 'ko' = 'en'): Promise<cheerio.CheerioAPI> {
  const baseUrl = url.startsWith('http') ? url : origin + url
  // 기존에 쿼리스트링에 lang이 있으면 제거하고 새로 붙임
  const cleanBaseUrl = baseUrl.replace(/[?&]lang=[^&]*/, '')
  const finalSeparator = cleanBaseUrl.includes('?') ? '&' : '?'
  const fullUrl = cleanBaseUrl + finalSeparator + `lang=${lang}`

  // CSP 제한을 피하기 위해 백그라운드 스크립트에 fetch 요청을 보냅니다.
  const response = await new Promise<HtmlResponse | undefined>(resolve => {
    chrome.runtime.sendMessage({ action: 'fetch-html', url: fullUrl }, res => {
      resolve(res)
    })
  })

  if (!response || !response.success) {
    throw new Error(response?.error || 'Failed to fetch via background')
  }

  // 1. URL 기반 로그인 페이지 리다이렉트 확인
  if (
    response.finalUrl &&
    (response.finalUrl.includes('/login/index.php') || response.finalUrl.includes('login.gachon.ac.kr'))
  ) {
    throw new Error('LOGIN_REQUIRED')
  }

  const html = response.html
  const $ = cheerio.load(html)

  // 2. HTML 내용 기반 로그인 페이지 확인 (리다이렉트가 URL에 안 나타날 경우 대비)
  // 로그인 폼의 아이디 입력란이나 로그인 버튼 존재 여부 확인
  const isLoginPage =
    $('input[name="username"]').length > 0 ||
    $('#login').length > 0 ||
    $('.login-form').length > 0 ||
    $('button:contains("로그인")').length > 0 ||
    $('input[value="로그인"]').length > 0

  if (isLoginPage) {
    throw new Error('LOGIN_REQUIRED')
  }

  $('script, style').remove()
  return $
}
