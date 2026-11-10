import { useMemo, useSyncExternalStore } from 'react'

let timestamp = Date.now()
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

export const getClockTime = () => timestamp

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener)
  if (!timer) {
    timestamp = Date.now()
    timer = setInterval(() => {
      timestamp = Date.now()
      listeners.forEach(notify => notify())
    }, 60000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useNow(): Date {
  const value = useSyncExternalStore(subscribeClock, getClockTime, getClockTime)
  return useMemo(() => new Date(value), [value])
}
