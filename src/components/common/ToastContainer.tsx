import { Toaster } from 'react-hot-toast'

export function ToastContainer() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{
        top: 24,
      }}
      toastOptions={{
        // 기본 스타일 최적화
        className: 'text-13px font-bold shadow-xl border border-gray-100',
        duration: 3000,
        style: {
          background: '#fff',
          color: '#374151',
          padding: '12px 18px',
          borderRadius: '16px',
        },

        // 성공 토스트 스타일
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            borderLeft: '5px solid #10b981',
          },
        },

        // 에러 토스트 스타일
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            borderLeft: '5px solid #ef4444',
          },
        },
      }}
    />
  )
}
