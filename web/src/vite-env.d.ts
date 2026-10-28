/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the LogisticApi. Defaults to the same-origin "/api" that vite.config.ts proxies. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
