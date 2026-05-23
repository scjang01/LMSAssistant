import type { Cheerio } from 'cheerio'
import type { AnyNode } from 'domhandler'

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
