import { SettingItem } from './SettingItem'
import { Shortcut } from './Shortcut'
import packageJson from '../../../package.json'
import { useStorageStore } from '@/storage/useStorageStore'

const { version } = packageJson

const REFRESH_INTERVAL_OPTIONS = [
  { value: 1000 * 60 * 5, label: '5분' },
  { value: 1000 * 60 * 10, label: '10분' },
  { value: 1000 * 60 * 30, label: '30분' },
  { value: 1000 * 60 * 60, label: '1시간' },
  { value: 1000 * 60 * 120, label: '2시간' },
]

export function SettingsContent() {
  const settings = useStorageStore(state => state.settings)
  const updateData = useStorageStore(state => state.updateData)

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto bg-gray-50">
      <div className="mb-12px mt-4px bg-white bg-opacity-50 px-16px py-12px">
        <h2 className="text-16px font-bold">설정</h2>
      </div>

      <div className="flex-1 space-y-12px px-16px pb-24px">
        <Shortcut />

        <SettingItem title="자동 갱신 간격" description="데이터를 자동으로 새로고침할 주기를 설정합니다.">
          <select
            className="d-select d-select-bordered d-select-sm w-full"
            value={settings.refreshInterval}
            onChange={e => updateData('settings', prev => ({ ...prev, refreshInterval: Number(e.target.value) }))}
          >
            {REFRESH_INTERVAL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingItem>

        <div className="mt-24px pt-24px text-center">
          <div className="text-12px text-gray-400">가천 어시스턴트 v{version}</div>
          <div className="mt-4px text-10px text-gray-300">© 2026 Sechang Jang. All rights reserved.</div>
        </div>
      </div>
    </div>
  )
}
