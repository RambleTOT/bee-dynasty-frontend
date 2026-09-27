/** Фильтры календаря в ключе запроса — по одному значению (D-27). */
export interface CalendarKeyFilters {
  region?: string;
  status?: string;
  type?: string;
}

/**
 * Ключи react-query. Первые элементы — префиксы для инвалидации после мутаций (FRONTEND_SPEC §5.3):
 * `invalidateQueries({ queryKey: ['days', date] })` задевает день во всех регионах.
 */
export const queryKeys = {
  me: ['me'] as const,
  calendar: (month: string, filters: CalendarKeyFilters = {}) =>
    ['calendar', month, filters] as const,
  days: (date: string, region = 'all') => ['days', date, region] as const,
  scenario: (id: string) => ['scenario', id] as const,
  plan: (id: string) => ['plan', id] as const,
  events: (scenarioId: string) => ['events', scenarioId] as const,
  engineerDay: () => ['engineerDay'] as const,
  engineerRoute: () => ['engineerRoute'] as const,
};
