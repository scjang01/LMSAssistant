import { format, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useMemo, useEffect, useRef } from 'react'

import { TaskCard } from './TaskCard'
import type { Activity } from '@/types'

type Props = {
  tasks: Activity[]
}

export function TaskList({ tasks }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Activity[]> = {}

    tasks.forEach(task => {
      const date = task.endAt ? task.endAt.split(' ')[0] : 'no-deadline'
      if (!groups[date]) groups[date] = []
      groups[date].push(task)
    })

    return Object.keys(groups)
      .sort((a, b) => (a === 'no-deadline' ? 1 : b === 'no-deadline' ? -1 : a.localeCompare(b)))
      .reduce(
        (acc, date) => {
          acc[date] = groups[date]
          return acc
        },
        {} as Record<string, Activity[]>,
      )
  }, [tasks])

  // 지능형 자동 스크롤 로직 (오늘 -> 가장 가까운 미래)
  useEffect(() => {
    if (!listRef.current || tasks.length === 0) return

    const scrollTimer = setTimeout(() => {
      const container = listRef.current?.closest('.overflow-y-scroll')
      if (!container) return

      // 모든 날짜 그룹 요소 가져오기
      const groupElements = Array.from(listRef.current!.querySelectorAll('[data-date]')) as HTMLElement[]
      if (groupElements.length === 0) return

      // 1. '오늘' 그룹 검색
      let targetElement = groupElements.find(el => el.dataset.date === todayStr)

      // 2. '오늘'이 없으면, 오늘 이후의 첫 번째 그룹(가장 가까운 미래) 검색
      if (!targetElement) {
        targetElement = groupElements.find(el => {
          const groupDate = el.dataset.date
          return groupDate && groupDate !== 'no-deadline' && groupDate > todayStr
        })
      }

      // 3. 대상이 발견되면 정밀 스크롤 수행
      if (targetElement) {
        const containerRect = container.getBoundingClientRect()
        const targetRect = targetElement.getBoundingClientRect()
        
        // 컨테이너 상단으로부터의 상대 위치 계산 (padding 고려)
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop - 20 

        container.scrollTo({
          top: Math.max(0, relativeTop),
          behavior: 'smooth'
        })
      }
    }, 150)

    return () => clearTimeout(scrollTimer)
  }, [groupedTasks, todayStr, tasks.length])

  if (tasks.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center text-gray-400">
        <p className="text-14px font-medium">표시할 과제가 없습니다</p>
      </div>
    )
  }

  const getDisplayDate = (date: string) => {
    if (date === 'no-deadline') return '기한 없음'
    try {
      const d = new Date(date)
      const formatted = format(d, 'MM/dd (eee)', { locale: ko })
      return isToday(d) ? `오늘 (${formatted})` : formatted
    } catch {
      return date
    }
  }

  return (
    <div ref={listRef} className="space-y-24px pb-40px">
      {Object.entries(groupedTasks).map(([date, items]) => (
        <div key={date} data-date={date} className="space-y-12px">
          <h3 className="px-4px text-12px font-bold text-gray-400">
            {getDisplayDate(date)}
          </h3>
          <div className="grid gap-12px">
            {items.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <TaskCard task={task} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
