import { format, differenceInMinutes } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Video, FileText, CheckCircle, AlertTriangle, Clock, XCircle, HelpCircle, Check } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'

import { ACTIVITY_TYPE_MAP } from '@/constants'
import { useStorageStore } from '@/storage/useStorageStore'
import type { Activity } from '@/types'
import { cn, origin, getTaskStatus } from '@/utils'

const StatusBadge = ({
  task,
  status,
}: {
  task: Activity
  status: 'submitted' | 'expired' | 'imminent' | 'ongoing' | 'no-deadline'
}) => {
  const isVideo = task.type === 'video' || (task.type as string) === 'mooc'

  switch (status) {
    case 'submitted':
      return (
        <span className="flex items-center text-12px font-medium text-emerald-600">
          <CheckCircle size={14} className="mr-1" /> {isVideo ? '시청 완료' : '제출 완료'}
        </span>
      )
    case 'expired':
      return (
        <span className="flex items-center text-12px font-medium text-red-600">
          <XCircle size={14} className="mr-1" /> 마감 지남
        </span>
      )
    case 'imminent':
      return (
        <span className="flex items-center text-12px font-medium text-orange-600">
          <AlertTriangle size={14} className="mr-1" /> 마감 임박
        </span>
      )
    case 'ongoing':
      return (
        <span className="flex items-center text-12px font-medium text-blue-600">
          <Clock size={14} className="mr-1" /> 진행 중
        </span>
      )
    default:
      return <span className="flex items-center text-12px font-medium text-gray-400">진행 중</span>
  }
}

type Props = {
  task: Activity
}

export function TaskCard({ task }: Props) {
  const updateData = useStorageStore(state => state.updateData)
  
  const endAtDate = useMemo(() => (task.endAt ? new Date(task.endAt) : new Date(NaN)), [task.endAt])
  const isValidDate = !isNaN(endAtDate.getTime())

  // 서버 갱신 없이 시간만 실시간으로 업데이트하기 위한 상태
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 60) // 1분마다 갱신
    return () => clearInterval(timer)
  }, [])

  const status = useMemo(() => getTaskStatus(task, now), [task, now])

  const handleManualToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    updateData('manualOverrides', prev => ({
      ...prev,
      [task.id]: !task.hasSubmitted,
    }))
  }

  const deadlineText = useMemo(() => {
    if (!isValidDate) return '기한 없음'
    if (status === 'submitted') return <span>{format(endAtDate, 'MM/dd')}까지</span>
    if (status === 'expired') return <span>{format(endAtDate, 'MM/dd HH:mm')}까지</span>

    const totalMinutes = differenceInMinutes(endAtDate, now)
    if (totalMinutes <= 0) return <span>{format(endAtDate, 'MM/dd HH:mm')}까지</span>

    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const mins = totalMinutes % 60
    const relativeText = days > 0 ? `${days}일 전` : `${hours}시간 ${mins}분 전`

    return (
      <div className="flex items-baseline gap-4px">
        <span className="font-bold text-gray-800">{relativeText}</span>
        <span className="text-10px font-normal text-gray-400 opacity-80">
          ({format(endAtDate, 'MM/dd HH:mm')} 마감)
        </span>
      </div>
    )
  }, [isValidDate, status, endAtDate, now])

  const exactDeadline = useMemo(() => 
    isValidDate ? format(endAtDate, 'yyyy년 MM월 dd일 HH:mm', { locale: ko }) : '기한 없음'
  , [isValidDate, endAtDate])

  const taskLink = useMemo(() => {
    const getModPath = () => {
      switch (task.type) {
        case 'assignment': return 'assign'
        case 'video':
        case 'mooc' as any: return 'vod'
        case 'quiz': return 'quiz'
        default: return 'assign'
      }
    }
    return `${origin}/mod/${getModPath()}/view.php?id=${task.id}`
  }, [task.type, task.id])

  return (
    <a href={taskLink} target="_blank" rel="noopener noreferrer" className="block">
      <div
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-12px border-l-4 bg-white shadow-sm transition-shadow duration-300 hover:bg-gray-50 hover:shadow-md',
          {
            'border-l-emerald-500': status === 'submitted',
            'border-l-red-500': status === 'expired',
            'border-l-orange-500': status === 'imminent',
            'border-l-blue-500': status === 'ongoing',
            'border-l-gray-300': status === 'no-deadline',
          },
        )}
      >
        <div className="p-12px">
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start">
              <span className="mr-8px mt-2px flex-shrink-0 text-gray-500">
                {task.type === 'video' || (task.type as string) === 'mooc' ? (
                   <Video size={16} />
                ) : task.type === 'quiz' ? (
                  <HelpCircle size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </span>
              <div className="flex flex-1 flex-col">
                <h3 className="mb-2px flex-1 break-keep text-14px font-semibold text-gray-700">{task.title}</h3>
                <span className="text-11px text-gray-500">
                  {task.courseTitle} · {ACTIVITY_TYPE_MAP[task.type as keyof typeof ACTIVITY_TYPE_MAP] || ((task.type as any) === 'mooc' ? '녹화강의' : task.type)}
                </span>
              </div>
            </div>

            <button
              onClick={handleManualToggle}
              className={cn(
                'ml-8px flex h-24px w-24px flex-shrink-0 items-center justify-center rounded-6px border-2 transition-all',
                task.hasSubmitted
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-gray-200 bg-white text-transparent hover:border-emerald-300',
              )}
            >
              <Check size={16} strokeWidth={3} />
            </button>
          </div>
          {(task.type === 'video' || (task.type as string) === 'mooc') && 'progress' in task && task.progress !== undefined && (
            <div className="mt-8px flex flex-col gap-4px pl-24px">
              <div className="flex justify-between text-10px font-medium text-gray-400">
                <span>진행도</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-4px w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    'h-full transition-all duration-500 ease-out',
                    task.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500',
                  )}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-4px bg-gray-50 px-12px py-8px">
          <div
            className={cn(
              'd-tooltip d-tooltip-right flex cursor-help items-center text-12px font-medium',
              status === 'expired' ? 'text-gray-500' : 'text-gray-700',
            )}
            data-tip={exactDeadline}
          >
            <Clock size={14} className="mr-1 inline-block" />
            <div className="ml-4px">{deadlineText}</div>
          </div>
          <StatusBadge task={task} status={status} />
        </div>
      </div>
    </a>
  )
}
