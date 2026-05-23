import { AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useHotkeys } from 'react-hotkeys-hook'

import { ErrorFallback } from '@/components/common/ErrorFallback'
import { MainModal } from '@/components/layout/MainModal'
import { ContentThemeProvider } from '@/components/layout/ContentThemeProvider'
import { useShadowRoot } from '@/hooks/useShadowRoot'
import { useStorageStore } from '@/storage/useStorageStore'

const isActiveElementEditable = (element: Element | null): boolean => {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
}

export function App() {
  const [isOpen, setIsOpen] = useState(false)
  const { settings, isInitialized, isEditing } = useStorageStore()
  const shadowRoot = useShadowRoot()

  const toggleOpen = () => setIsOpen(prev => !prev)

  const handleHotkey = () => {
    const activeElement = shadowRoot?.activeElement
    if (isEditing || isActiveElementEditable(activeElement ?? null)) {
      return
    }

    toggleOpen()
  }

  useHotkeys(settings.shortcut, handleHotkey, [isEditing, shadowRoot, settings.shortcut])

  useEffect(() => {
    const messageListener = (request: { action: string }) => {
      if (request.action === 'toggle-dashboard') {
        toggleOpen()
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [])

  if (!isInitialized) return null

  return (
    <ContentThemeProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AnimatePresence>{isOpen && <MainModal />}</AnimatePresence>
      </ErrorBoundary>
    </ContentThemeProvider>
  )
}
