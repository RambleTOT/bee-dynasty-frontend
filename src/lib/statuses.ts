/**
 * Справочники подписей — дословно по FRONTEND_SPEC §10.1 и ТЗ. Тона и цвета — отдельно (этап 02).
 * Статусы и флаги в интерфейсе берём только отсюда (правила проекта).
 */

export const REQUEST_STATUSES = [
  'unassigned',
  'planned',
  'en_route',
  'in_progress',
  'done',
  'cancel_pending',
  'cancelled',
  'reschedule_pending',
  'rescheduled',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  unassigned: 'Не назначена',
  planned: 'Запланирована',
  en_route: 'В пути',
  in_progress: 'В работе',
  done: 'Выполнена',
  cancel_pending: 'Отменяется',
  cancelled: 'Отменена',
  reschedule_pending: 'Переносится',
  rescheduled: 'Перенесена',
};

export const FLAGS = [
  'urgent',
  'at_risk',
  'late',
  'changed',
  'started_early',
  'reaction_late',
] as const;
export type Flag = (typeof FLAGS)[number];

export const FLAG_LABEL: Record<Flag, string> = {
  urgent: 'Срочная',
  at_risk: 'Под угрозой',
  late: 'Просрочена',
  changed: 'Изменено',
  started_early: 'Начата раньше окна',
  reaction_late: 'Реакция > 2 ч',
};

export const SKILLS = ['local', 'installation', 'emergency'] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABEL: Record<Skill, string> = {
  local: 'Локальные работы',
  installation: 'Подключение и дозаказ',
  emergency: 'Аварийные работы',
};

export const TRANSPORTS = ['car', 'public_transport', 'walk', 'bike'] as const;
export type Transport = (typeof TRANSPORTS)[number];

export const TRANSPORT_LABEL: Record<Transport, string> = {
  car: 'Автомобиль',
  public_transport: 'Общественный транспорт',
  walk: 'Пешком',
  bike: 'Велосипед',
};

export const REGIONS = ['east', 'south_east', 'south_center'] as const;
export type RegionId = (typeof REGIONS)[number];

export const REGION_LABEL: Record<RegionId, string> = {
  east: 'Восток',
  south_east: 'Юго-восток',
  south_center: 'Югоцентр',
};

/** Подпись по справочнику. Незнакомое значение с бэка показываем как есть, пустое — ''. */
export function labelOf<K extends string>(
  labels: Record<K, string>,
  value: string | null | undefined,
): string {
  if (!value) return '';
  return Object.hasOwn(labels, value) ? labels[value as K] : value;
}
