import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import manifest from './manifest.config'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tsconfigPaths(),
    crx({
      manifest,
      contentScripts: {
        injectCss: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/assets': resolve(__dirname, './src/assets'),
    },
  },
  // 배포 시 디버거를 제거하고 오류 로그는 유지합니다.
  esbuild: {
    drop: command === 'build' ? ['debugger'] : [],
  },
  build: {
    // 빌드 결과물 최적화
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  // 배포 시 불필요한 서버 설정 제거
  server:
    command === 'serve'
      ? {
          port: 5173,
          strictPort: true,
          hmr: {
            port: 5173,
          },
        }
      : undefined,
}))
