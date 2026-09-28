/** База API. В dev `/api` проксирует Vite (vite.config.ts), в проде — адрес бэка из VITE_API_URL. */
export const API_URL: string = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

/** Моки MSW вместо бэка (src/mocks). */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Интервалы опроса, мс (FRONTEND_SPEC §5.1). В фоновой вкладке опрос выключен — см. queryClient. */
export const POLL = { day: 10_000, engineer: 15_000, calendar: 30_000, slots: 30_000 } as const;

/** Часовой пояс всех «сейчас» и дат (FRONTEND_SPEC §7). */
export const TZ = 'Europe/Moscow';

/**
 * Правки бэка (docs/spec/BACKEND_FIXES_FINAL_28-09.md), без которых кнопка или запрос упадут.
 * Меняем руками после ответа бэка или проверки Swagger; один флаг на правку (FRONTEND_SPEC §5.4).
 */
const FEATURE_DEFAULTS = {
  dayClock: true, // §1  ручки /data/scenarios/{id}/clock, clock в /days и /me/day — есть с 28.09
  failOther: true, // 8.3 fail.reason 'other' + comment — есть с 28.09 (COMMENT_REQUIRED)
  engineerIncident: true, // 8.4 action 'incident' — есть с 28.09 (09:48)
  unavailableBeforeShift: true, // 8.5 unavailable при shift_status = not_started — проверено 28.09
  emergencyByRegion: true, // 9.1 авария оператора по params.region_id — есть с 28.09
  cancelComment: true, // 9.3 comment в отмене оператора — есть с 28.09
  // правки по docs/BACKEND_REQUESTS.md — на стенде с 28.09 19:07 (гайд бэка §9, §10)
  addEngineerAfterPublish: true, // §12, P1-6 бригада в начатый день — событие engineer_added → предложение
  extendResourceCheck: true, // P1-5 «кого не хватает» — extend-resource/check, без сохранения предложения
  comparePlanStrategy: true, // P1-8 «Наш план» в сравнении — стратегия plan тем же расчётом, что FIFO
};

export type FeatureFlag = keyof typeof FEATURE_DEFAULTS;

/** Включить флаги без правки кода (проверка на моках): VITE_FEATURES=failOther,engineerIncident */
function enabledFromEnv(raw: string | undefined): Partial<Record<FeatureFlag, boolean>> {
  const names = (raw ?? '').split(',').map((name) => name.trim());
  return Object.fromEntries(
    names.filter((name) => name in FEATURE_DEFAULTS).map((name) => [name, true]),
  );
}

export const FEATURES: Readonly<Record<FeatureFlag, boolean>> = {
  ...FEATURE_DEFAULTS,
  ...enabledFromEnv(import.meta.env.VITE_FEATURES),
};
