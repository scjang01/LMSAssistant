import { useState } from 'react'

import { ToastContainer } from './ToastContainer'
import packageJson from '../../../package.json'
import { useStorageStore } from '@/storage/useStorageStore'

import type { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error }: FallbackProps) {
  const resetStore = useStorageStore(state => state.resetStore)
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(error.stack || error.message)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div>
      <div className="d-mask d-mask-squircle fixed bottom-25px right-25px h-56px w-56px cursor-pointer bg-rose-400 bg-cover bg-center bg-no-repeat shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl font-bold text-white">!</div>
        </div>
      </div>
      <div className="fixed bottom-96px right-25px h-600px w-350px overflow-hidden rounded-36px bg-slate-100 p-16px shadow-[0_0_100px_0_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="whitespace-pre-line break-words text-xl font-bold text-gray-800">
            확장 프로그램에 문제가 발생했어요 😢
          </div>
          <div className="relative mt-4 h-200px w-full overflow-hidden whitespace-pre-wrap rounded-lg bg-white p-4 text-left text-12px text-gray-500">
            <div className="h-full overflow-auto">
              <pre className="whitespace-pre-wrap break-words">{error.stack || error.message}</pre>
            </div>
          </div>
          <div className="mt-16px flex w-full gap-8px">
            <button
              onClick={handleCopy}
              className="flex-1 rounded-lg bg-gray-200 py-10px text-14px font-bold text-gray-700 transition-colors hover:bg-gray-300"
            >
              {isCopied ? '복사됨!' : '에러 내용 복사'}
            </button>
            <button
              onClick={() => {
                resetStore()
                window.location.reload()
              }}
              className="flex-1 rounded-lg bg-rose-400 py-10px text-14px font-bold text-white transition-colors hover:bg-rose-500"
            >
              다시 시작하기
            </button>
          </div>
          <div className="mt-16px text-sm text-gray-500">버전: {packageJson.version}</div>
          <ToastContainer />
        </div>
      </div>
    </div>
  )
}
