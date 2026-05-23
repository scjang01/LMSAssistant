import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

import { pxToRemMap } from '@/styles/pxToRemMap'

import type { ClassValue } from 'clsx'

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': Object.keys(pxToRemMap).map(key => `text-${key}`),
      'border-w': Object.keys(pxToRemMap).map(key => `border-${key}`),
    },
  },
})

/**
 * Tailwind 클래스들을 조건부로 병합합니다.
 */
export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs))
}
