/**
 * DS-01: фильтры и открытая модалка — в адресе (FRONTEND_SPEC §4):
 * `month=2026-09`, `region=all|east|south_east|south_center`, `status`, `type` — по одному значению (D-27),
 * `modal=import` — DS-02, `date=YYYY-MM-DD` — день, на который загружаем CSV (с пустого дня DS-03).
 */
import type { MenuOption } from '@/ui';
import { searchParam, type SearchParamDef } from '@/hooks/useSearchState';
import { BK } from '@/lib/dictionaries';
import {
  isRegionId,
  REGION_LABEL,
  REGIONS,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUSES,
  type RegionId,
  type RequestStatus,
} from '@/lib/statuses';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YMD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** `month=YYYY-MM`; нет или мусор — `null`, то есть текущий месяц (в адрес его не пишем). */
const monthParam: SearchParamDef<string | null> = {
  parse: (raw) => (raw !== null && MONTH.test(raw) ? raw : null),
  serialize: (value) => value,
};

/** `date=YYYY-MM-DD` для DS-02; нет или мусор — `null` (сегодня). */
const dateParam: SearchParamDef<string | null> = {
  parse: (raw) => (raw !== null && YMD.test(raw) ? raw : null),
  serialize: (value) => value,
};

export const REGION_FILTERS = ['all', ...REGIONS] as const;
export type RegionFilter = (typeof REGION_FILTERS)[number];

/** Тип заявки в адресе — ключ справочника BK: `type=connection` → `type_bk=Подключение`. */
export type BkKey = keyof typeof BK;
export const BK_KEYS = Object.keys(BK) as BkKey[];

export const calendarSearch = {
  month: monthParam,
  region: searchParam.enum(REGION_FILTERS, 'all'),
  status: searchParam.enum(REQUEST_STATUSES),
  type: searchParam.enum(BK_KEYS),
  modal: searchParam.enum(['import']),
  date: dateParam,
};

/** «Без фильтра» в пилюлях «Статус» и «Тип заявки». */
export const ALL = 'all';

export const REGION_OPTIONS: readonly MenuOption<RegionFilter>[] = [
  { value: 'all', label: 'Все регионы' },
  ...REGIONS.map((region) => ({ value: region, label: REGION_LABEL[region] })),
];

export const STATUS_OPTIONS: readonly MenuOption<RequestStatus | typeof ALL>[] = [
  { value: ALL, label: 'Все статусы' },
  ...REQUEST_STATUSES.map((status) => ({ value: status, label: REQUEST_STATUS_LABEL[status] })),
];

export const TYPE_OPTIONS: readonly MenuOption<BkKey | typeof ALL>[] = [
  { value: ALL, label: 'Все типы' },
  ...BK_KEYS.map((key) => ({ value: key, label: BK[key] })),
];

/**
 * Клик по дню → DS-03. День всегда показывает один регион (D-27): регион фильтра, а из
 * «Все регионы» — первый регион пользователя [Д].
 */
export function dayPath(
  date: string,
  region: RegionFilter,
  userRegions: readonly string[] | undefined,
): string {
  const dayRegion: RegionId =
    region !== 'all' ? region : (userRegions?.find(isRegionId) ?? REGIONS[0]);
  return `/dispatcher/day/${date}?region=${dayRegion}`;
}
