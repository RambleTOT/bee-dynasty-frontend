/**
 * Справочники и помощники подписей (FRONTEND_SPEC §10.1, §6.8, §8.3.7).
 * `*_display` с бэка важнее словаря: словарь — запасной путь.
 */
import { Bike, Bus, Car, Footprints, Plug, Wrench, Zap, type LucideIcon } from 'lucide-react';
import {
  labelOf,
  REGION_LABEL,
  SKILL_LABEL,
  TRANSPORT_LABEL,
  type Skill,
  type Transport,
} from './statuses';

export const SKILL_SHORT: Record<Skill, string> = {
  local: 'Лок.',
  installation: 'Подкл.',
  emergency: 'Авария',
};

export const SKILL_ICON: Record<Skill, LucideIcon> = {
  local: Wrench,
  installation: Plug,
  emergency: Zap,
};

export const TRANSPORT_ICON: Record<Transport, LucideIcon> = {
  car: Car,
  public_transport: Bus,
  walk: Footprints,
  bike: Bike,
};

/** Короткие подписи транспорта для узких мест (select в «Составе и ресурсах»). */
export const TRANSPORT_SHORT: Record<Transport, string> = {
  car: 'Автомобиль',
  public_transport: 'Общ. транспорт',
  walk: 'Пешком',
  bike: 'Велосипед',
};

export const skillLabel = (skill: string | null | undefined, display?: string | null) =>
  display || labelOf(SKILL_LABEL, skill);
export const transportLabel = (transport: string | null | undefined, display?: string | null) =>
  display || labelOf(TRANSPORT_LABEL, transport);
export const regionLabel = (region: string | null | undefined) => labelOf(REGION_LABEL, region);

/** Типы заявки BK — строки из выданных CSV (§8.3.7). */
export const BK = {
  connection: 'Подключение',
  local: 'Локальная заявка',
  emergency: 'Глобальная проблема',
  extra: 'Дозаказ',
} as const;

/** BK обычной записи оператора (без «Глобальной проблемы» — это авария). */
export const BK_REGULAR: readonly string[] = [BK.connection, BK.local, BK.extra];

/** HD по BK, первая строка — самая частая. */
export const HD_BY_BK: Record<string, readonly string[]> = {
  [BK.connection]: [
    'Конвергенция абонента',
    'Заявка на подключение',
    'Заказ подключения/Дозаказ оборудования',
  ],
  [BK.local]: [
    'Нет линка',
    'Работа с кабелем',
    'Переключение на Гбит/с',
    'IP-адрес 169...',
    'Разрывы',
    'Рост ошибок на порту',
    'Низкая скорость',
    'Роутер. Замена техническим специалистом',
    'TVE/ENT. Замена приставки техником',
    'ТВ. Замена приставки техником',
    'TVE/ENT. Другие ошибки',
    'Мониторинг',
  ],
  [BK.extra]: [
    'Дозаказ оборудования',
    'Заказ подключения/Дозаказ оборудования',
    'Конвергенция абонента',
  ],
  [BK.emergency]: ['Авария', 'Информация'],
};

/** Короткий тип для таймлайна и тултипов диспетчера (§8.2): «Подкл.», «Лок.», «Дозак.», «Авария». */
const BK_SHORT: Record<string, string> = {
  [BK.connection]: 'Подкл.',
  [BK.local]: 'Лок.',
  [BK.extra]: 'Дозак.',
  [BK.emergency]: 'Авария',
};

/** Полный тип по навыку, когда нет type_bk (синтетика, §6.8). */
const SKILL_TYPE_FULL: Record<Skill, string> = {
  emergency: 'Авария',
  installation: 'Подключение и дозаказ',
  local: 'Локальные работы',
};

export function typeShort(typeBk: string | null | undefined, skill: string | null | undefined) {
  if (typeBk) return BK_SHORT[typeBk] ?? typeBk;
  return labelOf(SKILL_SHORT, skill);
}

/** «Подключение · Конвергенция абонента»; нет BK — подпись по навыку. */
export function typeFull(
  typeBk: string | null | undefined,
  typeHd: string | null | undefined,
  skill?: string | null,
): string {
  if (typeBk) return typeHd ? `${typeBk} · ${typeHd}` : typeBk;
  return labelOf(SKILL_TYPE_FULL, skill);
}

/** Тип одним словом: BK, иначе по навыку. */
export function typeBkOrSkill(typeBk: string | null | undefined, skill: string | null | undefined) {
  return typeBk || labelOf(SKILL_TYPE_FULL, skill);
}

/** №: id до 6 символов — целиком («T012»), длиннее — последние 4 цифры («…7741»). */
export function shortId(id: string | null | undefined): string {
  if (!id) return '';
  return id.length <= 6 ? id : `…${id.slice(-4)}`;
}

const BRIGADE = /^Бригада\s+/i;

/** «Бригада Соколов». Пустое имя или имя = id (синтетика) → «Бригада E00». */
export function engineerLabel(name: string | null | undefined, id: string): string {
  const clean = (name ?? '').trim();
  if (!clean || clean === id) return `Бригада ${id}`;
  return clean;
}

/** Имя без «Бригада»: «Соколов»; «Капитанчук Александр» → «Капитанчук»; нет имени → id. */
export function engineerShort(name: string | null | undefined, id: string): string {
  const clean = (name ?? '').trim();
  if (!clean || clean === id) return id;
  const withoutPrefix = clean.replace(BRIGADE, '');
  // «Бригада 1» (демо-набор): одна цифра в чипе непонятна — оставляем имя целиком
  if (/^\d+$/.test(withoutPrefix)) return clean;
  return withoutPrefix.split(/\s+/)[0] || id;
}
