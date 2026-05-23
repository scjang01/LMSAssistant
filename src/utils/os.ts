/**
 * 현재 운영체제가 macOS인지 확인합니다.
 */
export const isMac = () => {
  if (typeof window === 'undefined') return false
  return window.navigator.platform.toUpperCase().indexOf('MAC') >= 0
}
