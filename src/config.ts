/** База API. В dev `/api` проксирует Vite (vite.config.ts), в проде — адрес бэка из VITE_API_URL. */
export const API_URL: string = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

/** Моки MSW вместо бэка (src/mocks). */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Интервалы опроса, мс (FRONTEND_SPEC §5.1). В фоновой вкладке опрос выключен — см. queryClient. */
export const POLL = { day: 10_000, engineer: 15_000, calendar: 30_000 } as const;

/** Часовой пояс всех «сейчас» и дат (FRONTEND_SPEC §7). */
export const TZ = 'Europe/Moscow';

/** Выключатели функций, которые ждут бэка или решения. */
export const FEATURES = { calendarMultiFilter: false, engineerIncident: false } as const;
