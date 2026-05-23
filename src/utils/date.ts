/**
 * Safari 등 다양한 브라우저에서 날짜 문자열을 안전하게 파싱합니다.
 * "2024-05-01 23:59:59" 포맷을 "2024-05-01T23:59:59"로 변환하여 처리합니다.
 */
export const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null
  try {
    const isoStr = dateStr.trim().replace(' ', 'T')
    const date = new Date(isoStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
