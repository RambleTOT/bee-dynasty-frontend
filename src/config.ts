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
  dayClock: false, // §1  ручки /data/scenarios/{id}/clock, clock в /days и /me/day
  failOther: false, // 8.3 fail.reason 'other' + comment
  engineerIncident: false, // 8.4 action 'incident' (есть в enum EngineerActionIn.action в /openapi.json)
  unavailableBeforeShift: false, // 8.5 unavailable при shift_status = not_started
  emergencyByRegion: false, // 9.1 авария оператора по params.region_id
  cancelComment: false, // 9.3 comment в отмене оператора
  addEngineerAfterPublish: false, // §12 добавить инженера в начатый день → engineer_available → предложение
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
