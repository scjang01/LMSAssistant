import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    env: { VITE_UNIV_ID: 'incheon', VITE_UNIV_URL: 'https://lms.inu.ac.kr', VITE_UNIV_NAME: '인천대학교' },
  },
})
