import type { Cheerio } from 'cheerio'
import type { AnyNode } from 'domhandler'

import { SHADOW_HOST_ID, UNIVERSITY_LINK_LIST } from '@/constants'
import type { UniversityLink } from '@/constants'

/**
 * 쉐도우 루트를 생성하고 기본 스타일을 적용합니다.
 */
export function createShadowRoot(styles: string[]): ShadowRoot {
  const host = document.createElement('div')
  host.setAttribute('id', SHADOW_HOST_ID)
  
  // 호스트를 전체 화면으로 설정하되, 클릭은 통과시키도록 함
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'none', 
  })

  const shadowRoot = host.attachShadow({ mode: 'open' })

  // style 태그 방식으로 스타일 주입
  const styleTag = document.createElement('style')
  styleTag.textContent = styles.join('\n')
  shadowRoot.appendChild(styleTag)

  document.body.appendChild(host)

  return shadowRoot
}

/**
 * URL에서 ID 파라미터 값을 추출합니다.
 */
export function getLinkId(url: string | null | undefined): string {
  if (!url) return ''
  const idMatch = url.match(/[?&]id=(\d+)/)
  return idMatch ? idMatch[1] : ''
}

export const origin = import.meta.env.VITE_UNIV_URL as UniversityLink

/**
 * URL의 origin을 기반으로 대학교 링크를 반환합니다.
 */
export const getOrigin = (url?: string): UniversityLink => {
  if (url) {
    try {
      const parsedUrl = new URL(url)
      const matched = UNIVERSITY_LINK_LIST.find(u => u === parsedUrl.origin)
      if (matched) return matched
    } catch (e) {
      // url이 상대 경로이거나 절대 경로가 아님. 기본 origin 반환.
    }
  }
  return origin
}

/**
 * Cheerio 엘리먼트 배열을 매핑하여 배열로 반환합니다.
 */
export const mapElement = <T,>(
  elements: Cheerio<AnyNode>,
  callback: (i: number, el: AnyNode) => T | undefined,
): T[] => {
  return elements
    .map((i, el) => callback(i, el))
    .get()
    .filter((item): item is T => item !== undefined)
}

/**
 * 엘리먼트의 텍스트를 트리밍하여 가져옵니다.
 */
export const getText = ($el: Cheerio<AnyNode>): string => $el.text().trim()

/**
 * 엘리먼트의 직계 자식 텍스트만 가져옵니다.
 */
export const getDirectText = ($el: Cheerio<AnyNode>): string => {
  return $el
    .contents()
    .filter((_, el) => el.type === 'text')
    .text()
    .trim()
}

/**
 * 엘리먼트의 속성 값을 가져옵니다.
 */
export const getAttr = ($el: Cheerio<AnyNode>, attr: string): string | undefined => $el.attr(attr)

/**
 * 문자열을 정규화합니다 (공백/특수문자 제거 및 소문자화).
 */
export const normalizeString = (str: string) => str.replace(/[\s\W_]/g, '').toLowerCase()

/**
 * 시간 문자열(HH:MM:SS)을 초 단위로 변환합니다.
 */
export const timeToSeconds = (time: string) => {
  const parts = time.split(':').map(Number).filter(n => !isNaN(n))
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}
