import { SHADOW_HOST_ID } from '@/constants'

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
