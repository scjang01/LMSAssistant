/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNIV_ID: string
  readonly VITE_UNIV_NAME: string
  readonly VITE_UNIV_URL: string
  readonly VITE_EXTENSION_NAME: string
  readonly VITE_EXTENSION_DESC: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
