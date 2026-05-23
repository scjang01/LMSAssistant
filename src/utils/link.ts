import { UNIVERSITY_LINK_LIST } from '@/constants'
import type { UniversityLink } from '@/constants'

/**
 * URL에서 ID 파라미터 값을 추출합니다.
 */
export function getLinkId(url: string | null | undefined): string {
  if (!url) return ''
  const idMatch = url.match(/[?&]id=(\d+)/)
  return idMatch ? idMatch[1] : ''
}

export const origin = 'https://cyber.gachon.ac.kr' as UniversityLink

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
