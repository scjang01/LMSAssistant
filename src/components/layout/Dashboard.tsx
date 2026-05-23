import { useState, useMemo } from 'react'

import { BottomNavigation } from './BottomNavigation'
import { SettingsContent } from '../setting/SettingsContent'
import { TaskContent } from '../task/TaskContent'
import { ToastContainer } from '../common/ToastContainer'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'settings'>('tasks')

  const content = useMemo(() => {
    if (activeTab === 'tasks') return <TaskContent />
    return <SettingsContent />
  }, [activeTab])

  return (
    <div className="flex h-full flex-col">
      {content}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastContainer />
    </div>
  )
}
