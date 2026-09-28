/**
 * Форматы и правила записи оператора (FRONTEND_SPEC §8.3.5).
 * Окно — строка бэка '14:00-16:00', дата — 'YYYY-MM-DD'. Незнакомый формат показываем как есть.
 */
import { isValid, parseISO } from 'date-fns';
import { BK, HD_BY_BK } from './dictionaries';
import { formatDateShort, formatDateWithWeekday, formatWeekdayShort } from './format';
import type { Transport } from './statuses';
import { parseWindow } from './time';

const isYmd = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));

// --- окна ---

/** '14:00' → «14», '09:30' → «9:30». */
function hourShort(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = String(Number(hours));
  return minutes === '00' ? hour : `${hour}:${minutes}`;
}

/** '14:00-16:00' → «14–16». */
export function windowShort(window: string): string {
  const parsed = parseWindow(window);
  return parsed ? `${hourShort(parsed.start)}–${hourShort(parsed.end)}` : window;
}

/** '14:00-16:00' → «14:00–16:00». */
export function windowFull(window: string): string {
  const parsed = parseWindow(window);
  return parsed ? `${parsed.start}–${parsed.end}` : window;
}

// --- даты ---

/** '2026-09-30' → «30.09». */
export const dateShort = (ymd: string) => (isYmd(ymd) ? formatDateShort(ymd) : ymd);

/** '2026-09-29' → «Вт, 29.09». */
export const dateWithWeekday = (ymd: string) => (isYmd(ymd) ? formatDateWithWeekday(ymd) : ymd);

/** «Вт» — для ленты дат. */
export const weekdayShort = (ymd: string) => (isYmd(ymd) ? formatWeekdayShort(ymd) : '');

/** '2026-10-01' → «1» — число месяца для ленты дат. */
export const dayOfMonth = (ymd: string) => (isYmd(ymd) ? String(Number(ymd.slice(8, 10))) : ymd);

// --- тип заявки ---

const TYPE_SHORT: Record<string, string> = {
  [BK.connection]: 'Подключение',
  [BK.local]: 'Локальная',
  [BK.emergency]: 'Авария',
  [BK.extra]: 'Дозаказ',
};

/** Тип в строке результата поиска: «Подключение», «Локальная», «Авария», «Дозаказ». */
export function typeShort(typeBk: string | null | undefined): string {
  if (!typeBk) return '';
  return TYPE_SHORT[typeBk] ?? typeBk;
}

/** «Подключение · Конвергенция абонента»; нет HD — только BK. */
export function typeFull(typeBk: string | null | undefined, typeHd?: string | null): string {
  return [typeBk, typeHd].filter(Boolean).join(' · ');
}

/** HD по умолчанию — первая (самая частая) строка списка для BK. */
export function defaultHd(typeBk: string | null | undefined): string {
  return (typeBk && HD_BY_BK[typeBk]?.[0]) || '';
}

// --- требуемый транспорт ---

/** HD, для которого нужен автомобиль (ML_SPEC §2). */
export const CABLE_HD = 'Работа с кабелем';

/** Транспорт по правилу: «Работа с кабелем» или гигабит → автомобиль, иначе не требуется. */
export function requiredTransportByRule(
  typeHd: string | null | undefined,
  gigabit: boolean,
): Transport | null {
  return typeHd === CABLE_HD || gigabit ? 'car' : null;
}

// --- телефон клиента ---

/** До 11 цифр с 7 в начале: 8 → 7, номер без кода страны — добавляем 7. */
function phoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const withCountry =
    digits[0] === '7' ? digits : `7${digits[0] === '8' ? digits.slice(1) : digits}`;
  return withCountry.slice(0, 11);
}

/** Маска при вводе: «+7 (916) 123-42-18». Разделители появляются вместе со следующей цифрой. */
export function phoneInput(raw: string): string {
  const digits = phoneDigits(raw);
  if (!digits) return '';
  const national = digits.slice(1);
  let masked = '+7';
  if (national.length > 0) masked += ` (${national.slice(0, 3)}`;
  if (national.length > 3) masked += `) ${national.slice(3, 6)}`;
  if (national.length > 6) masked += `-${national.slice(6, 8)}`;
  if (national.length > 8) masked += `-${national.slice(8, 10)}`;
  return masked;
}

/** Для API: «+79161234218». Пусто или номер не полный — `undefined`. */
export function phoneToApi(raw: string): string | undefined {
  const digits = phoneDigits(raw);
  return digits.length === 11 ? `+${digits}` : undefined;
}

/** Поле необязательное: пустое или ровно 11 цифр. */
export function phoneValid(raw: string): boolean {
  const length = phoneDigits(raw).length;
  return length === 0 || length === 11;
}

/** В сводке: «+7 916 ••• 42 18». Не полный номер — как есть. */
export function phoneMasked(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = phoneDigits(raw);
  if (digits.length !== 11) return raw;
  return `+7 ${digits.slice(1, 4)} ••• ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}
