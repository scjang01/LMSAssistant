import { createRoot } from 'react-dom/client'

import { App } from './App'
import { SHADOW_HOST_ID } from '@/constants'
import { preparePage } from '@/services/parser'
import styles from '@/styles/index.css?inline'
import { createShadowRoot } from '@/utils'

function initApp() {
  // 중복 실행 방지
  if (document.getElementById(SHADOW_HOST_ID)) return

  preparePage()

  const shadowRoot = createShadowRoot([styles])
  createRoot(shadowRoot).render(<App />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
