/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** База API. По умолчанию `/api/v1` — в dev через прокси Vite. */
  readonly VITE_API_URL?: string;
  /** `true` — ручки /auth/* обслуживает MSW (src/mocks), остальное идёт на бэк. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
