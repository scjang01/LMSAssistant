import * as cheerio from 'cheerio'

import { origin } from '@/utils/dom'

interface HtmlResponse {
  success: boolean
  html: string
  finalUrl?: string
  error?: string
}

let activeRequests = 0
const waiting: Array<() => void> = []

export async function fetchAndParse(path: string): Promise<cheerio.CheerioAPI> {
  const url = new URL(path, String(origin))
  if (url.origin !== origin) throw new Error('Forbidden domain')
  url.searchParams.set('lang', 'ko')

  await new Promise<void>(resolve => {
    const start = () => {
      activeRequests++
      resolve()
    }
    if (activeRequests < 3) start()
    else waiting.push(start)
  })

  try {
    const response = await new Promise<HtmlResponse>((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetch-html', url: url.href }, (response: HtmlResponse) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
        else resolve(response)
      })
    })
    if (!response?.success) throw new Error(response?.error || 'Failed to fetch LMS page')
    if (response.finalUrl) {
      const finalUrl = new URL(response.finalUrl)
      if (finalUrl.origin !== origin || finalUrl.pathname.startsWith('/login/')) throw new Error('LOGIN_REQUIRED')
    }
    const $ = cheerio.load(response.html)
    if ($('form#login, form input[name="username"], .login-form, body#page-login-index').length) {
      throw new Error('LOGIN_REQUIRED')
    }
    $('script, style').remove()
    return $
  } finally {
    activeRequests--
    waiting.shift()?.()
  }
}
