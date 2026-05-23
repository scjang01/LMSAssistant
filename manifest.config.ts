import { defineManifest } from '@crxjs/vite-plugin'
import { loadEnv } from 'vite'

import packageJson from './package.json'

const [major, minor, patch, label = '0'] = packageJson.version.replace(/[^\d.-]+/g, '').split(/[.-]/)

export default defineManifest(async (env) => {
  const config = loadEnv(env.mode, process.cwd())
  const isDev = env.mode === 'development'

  const extensionName = config.VITE_EXTENSION_NAME || '가천 어시스턴트'
  const extensionDesc = config.VITE_EXTENSION_DESC || packageJson.description
  const univUrl = config.VITE_UNIV_URL || 'https://cyber.gachon.ac.kr'
  const univId = config.VITE_UNIV_ID || 'gachon'

  return {
    manifest_version: 3,
    name: isDev ? `[DEV] ${extensionName}` : extensionName,
    description: extensionDesc,
    version: label === '0' ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch}.${label}`,
    version_name: packageJson.version,
    action: {
      default_title: `${extensionName} 대시보드`,
      default_icon: {
        '16': `assets/${univId}/logo16.png`,
        '48': `assets/${univId}/logo48.png`,
        '128': `assets/${univId}/logo128.png`,
      },
    },
    icons: {
      '16': `assets/${univId}/logo16.png`,
      '48': `assets/${univId}/logo48.png`,
      '128': `assets/${univId}/logo128.png`,
    },
    background: {
      service_worker: 'src/background/index.ts',
      type: 'module',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['src/content/index.tsx'],
        run_at: 'document_start',
      },
    ],
    options_page: 'src/options/index.html',
    web_accessible_resources: [
      {
        resources: [
          'assets/**/*.js',
          'assets/**/*.css',
          'assets/*.js',
          'assets/*.css',
          'assets/js/*.js',
          'assets/css/*.css',
          '*.webp',
          '*.png',
          '*.jpg',
          '*.jpeg',
          '*.gif',
          '*.svg',
        ],
        matches: ['*://*/*'],
      },
    ],
    content_security_policy: {
      extension_pages: isDev 
        ? "script-src 'self' 'wasm-unsafe-eval' http://localhost:* http://127.0.0.1:*; object-src 'self';"
        : "script-src 'self'; object-src 'self';",
    },
    host_permissions: isDev 
      ? ['<all_urls>', 'http://localhost:*', 'http://127.0.0.1:*']
      : ['<all_urls>'],
    permissions: ['storage', 'unlimitedStorage', 'scripting', 'activeTab', 'alarms'],
  }
})
