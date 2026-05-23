import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, RefreshCw, ChevronDown, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { LoadingSkeleton } from './LoadingSkeleton'
import { TaskList } from './TaskList'
import { ACTIVITY_TYPE_MAP } from '@/constants'
import { useContentsFetcher } from '@/hooks/useContentsFetcher'
import { useTaskFilter } from '@/hooks/useTaskFilter'
import { useStorageStore } from '@/storage/useStorageStore'
import type { ActivityStatus, ActivityType } from '@/types'
import { cn } from '@/utils'

const STATUS_STYLES: Record<Exclude<ActivityStatus, 'all'>, { active: string; inactive: string; label: string }> = {
  ongoing: {
    active: 'bg-blue-600 text-white shadow-md',
    inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    label: '진행 중',
  },
  imminent: {
    active: 'bg-orange-600 text-white shadow-md',
    inactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    label: '마감 임박',
  },
  expired: {
    active: 'bg-red-600 text-white shadow-md',
    inactive: 'bg-red-50 text-red-700 hover:bg-red-100',
    label: '마감 지남',
  },
  submitted: {
    active: 'bg-emerald-600 text-white shadow-md',
    inactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    label: '완료',
  },
}

const STATUS_MAP = Object.entries(STATUS_STYLES).reduce(
  (acc, [key, value]) => ({ ...acc, [key]: value.label }),
  { all: '전체' } as Record<ActivityStatus, string>,
)

export function TaskContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const meta = useStorageStore(state => state.meta)

  const { progress, isLoading, refetch, syncStatus } = useContentsFetcher()
  const { filteredTasks, summary, toggleFilter, removeFilter, filterOptions, courseList } = useTaskFilter(searchQuery)

  const formattedUpdateTime = formatDistanceToNowStrict(new Date(meta.updateAt), { addSuffix: true, locale: ko })

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return (
    <>
      <div className="bg-white bg-opacity-50 px-16px py-12px">
        <div className="mb-12px flex items-center justify-between">
          <h2 className="text-16px font-bold">과제 목록</h2>
          <div className="group relative">
            <button className="d-btn d-btn-ghost d-btn-sm p-1" onClick={refetch} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <div className="absolute right-0 z-10 mt-4px whitespace-nowrap rounded-2px bg-gray-800 px-6px py-2px text-10px text-white opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100">
              {isLoading ? '갱신 중...' : `${formattedUpdateTime} 갱신됨`}
            </div>
          </div>
        </div>

        <div className="relative mb-8px">
          <input
            type="text"
            placeholder="과제 검색"
            className="d-input d-input-sm d-input-bordered w-full pl-36px"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onKeyUp={handleInputKeyDown}
          />
          <Search size={18} className="absolute left-12px top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="mb-12px flex gap-4px">
          {Object.entries(STATUS_STYLES).map(([key, style]) => (
            <button
              key={key}
              className={cn(
                'flex flex-1 flex-col items-center justify-center rounded-lg py-8px transition-all duration-200 active:scale-95',
                filterOptions.statuses.includes(key as ActivityStatus) ? style.active : style.inactive,
              )}
              onClick={() => toggleFilter('statuses', key as ActivityStatus)}
            >
              <span className="text-16px font-bold">{summary[key as keyof typeof summary]}</span>
              <span className="text-9px font-medium opacity-80">{style.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-12px text-gray-500">
          <div className="flex min-h-24px flex-wrap items-center gap-4px">
            {filterOptions.statuses.map(s => (
              <FilterBadge key={s} label={STATUS_MAP[s]} onRemove={() => removeFilter('statuses', s)} />
            ))}
            {filterOptions.categories.map(c => (
              <FilterBadge
                key={c}
                label={ACTIVITY_TYPE_MAP[c as keyof typeof ACTIVITY_TYPE_MAP] || c}
                onRemove={() => removeFilter('categories', c)}
              />
            ))}
            {filterOptions.courseIds.map(id => (
              <FilterBadge
                key={id}
                label={courseList.find(course => course.id === id)?.title || ''}
                onRemove={() => removeFilter('courseIds', id)}
              />
            ))}
          </div>

          <button
            className="d-btn d-btn-ghost d-btn-sm flex items-center p-1"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-label={isFilterOpen ? '필터 닫기' : '필터 열기'}
          >
            <Filter size={16} />
            <motion.div initial={false} animate={{ rotate: isFilterOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={16} />
            </motion.div>
          </button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-8px space-y-8px rounded-lg border border-gray-200 bg-white p-8px shadow-sm">
                <FilterSection
                  label="상태"
                  options={STATUS_MAP}
                  selected={filterOptions.statuses}
                  onToggle={val => toggleFilter('statuses', val as ActivityStatus)}
                />
                <FilterSection
                  label="카테고리"
                  options={ACTIVITY_TYPE_MAP}
                  selected={filterOptions.categories}
                  onToggle={val => toggleFilter('categories', val as ActivityType)}
                />
                <FilterSection
                  label="과목"
                  options={courseList.reduce((acc, c) => (c.id !== '-1' ? { ...acc, [c.id]: c.title } : acc), {})}
                  selected={filterOptions.courseIds}
                  onToggle={val => toggleFilter('courseIds', val)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 실시간 로딩 바 및 상태 안내 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="z-50 w-full overflow-hidden bg-blue-50"
          >
            <div className="flex items-center justify-between px-16px py-6px">
              <span className="animate-pulse text-10px font-bold text-blue-600">
                {syncStatus || '준비 중...'}
              </span>
              <span className="text-10px font-black text-blue-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-4px w-full bg-blue-100">
              <motion.div
                className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                initial={{ width: '5%' }}
                animate={{ width: `${Math.max(progress, 5)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-10 h-16px bg-gradient-to-b from-slate-100 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 z-10 h-16px bg-gradient-to-t from-slate-100 to-transparent"></div>
        <div
          ref={scrollRef}
          className={cn('no-scrollbar h-full overscroll-contain px-16px py-20px', {
            'overflow-y-scroll': !isLoading,
            'overflow-hidden': isLoading,
          })}
        >
          {isLoading ? <LoadingSkeleton /> : <TaskList tasks={filteredTasks} />}
        </div>
      </div>
    </>
  )
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center rounded-full bg-blue-100 px-8px py-2px text-11px text-blue-700">
      {label}
      <button className="ml-4px rounded-full p-1px hover:bg-blue-200" onClick={onRemove}>
        <X size={10} />
      </button>
    </span>
  )
}

function FilterSection({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: Record<string, string>
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2px block text-11px font-medium text-gray-600">{label}</label>
      <div className="flex flex-wrap gap-4px">
        {Object.entries(options).map(([key, value]) => (
          <button
            key={key}
            className={cn('rounded-full px-8px py-2px text-11px transition-colors', {
              'bg-blue-100 text-blue-700': selected.includes(key),
              'bg-gray-100 text-gray-700 hover:bg-gray-200': !selected.includes(key),
            })}
            onClick={() => onToggle(key)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
