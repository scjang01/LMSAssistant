import type { Activity, Assignment, Quiz, Video } from '@/types'
import { normalizeString } from '@/utils'

/**
 * 가져온 데이터들을 하나의 활동 리스트로 통합합니다.
 */
export async function getActivities(
  courseTitle: string,
  courseId: string,
  assignmentSubmittedArray: Array<Pick<Assignment, 'id' | 'title' | 'hasSubmitted' | 'endAt' | 'startAt'>>,
  videoSubmittedArray: Array<
    Pick<Video, 'title' | 'hasSubmitted' | 'sectionTitle' | 'progress' | 'id' | 'endAt' | 'startAt'>
  >,
  quizSubmittedArray: Array<Pick<Quiz, 'id' | 'title' | 'hasSubmitted' | 'endAt' | 'startAt'>>,
): Promise<Activity[]> {
  const assignments: Assignment[] = assignmentSubmittedArray.map(a => ({
    type: 'assignment',
    id: a.id,
    courseId,
    courseTitle,
    title: a.title,
    startAt: a.startAt || '',
    endAt: a.endAt,
    hasSubmitted: a.hasSubmitted,
  }))

  const videos: Video[] = videoSubmittedArray.map(v => ({
    type: 'video',
    id: v.id || `video-${courseId}-${normalizeString(v.title)}`,
    courseId,
    courseTitle,
    title: v.title,
    startAt: v.startAt || '',
    endAt: v.endAt,
    sectionTitle: v.sectionTitle,
    hasSubmitted: v.hasSubmitted,
    progress: v.progress ?? 0,
  }))

  const quizzes: Quiz[] = quizSubmittedArray.map(q => ({
    type: 'quiz',
    id: q.id,
    courseId,
    courseTitle,
    title: q.title,
    startAt: q.startAt || '',
    endAt: q.endAt,
    hasSubmitted: q.hasSubmitted,
  }))

  return [...assignments, ...videos, ...quizzes]
}
