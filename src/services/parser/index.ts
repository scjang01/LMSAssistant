import * as gachon from './gachon'
import * as incheon from './incheon'

import type { LmsAdapter } from './types'

const parser: LmsAdapter = import.meta.env.VITE_UNIV_ID === 'incheon' ? incheon : gachon

export const { getCourses, getCourseActivities, restoreSession, getActivityUrl, preparePage } = parser

export { getActivities } from './activities'
