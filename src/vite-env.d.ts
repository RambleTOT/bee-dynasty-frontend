/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** База API. По умолчанию `/api/v1` — в dev через прокси Vite. */
  readonly VITE_API_URL?: string;
  /** `true` — все ручки обслуживает имитация бэка на MSW (src/mocks). */
  readonly VITE_USE_MOCKS?: string;
  /** Список флагов FEATURES через запятую, которые включить (FRONTEND_SPEC §5.4). */
  readonly VITE_FEATURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
