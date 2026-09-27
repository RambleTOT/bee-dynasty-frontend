import { TZ } from '@/config';

const pad2 = (n: number) => String(n).padStart(2, '0');

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((p) => p.type === type)?.value);
}

/** Реальное время в Москве, 'HH:MM'. */
export function nowMsk(date: Date = new Date()): string {
  const parts = timeFormat.formatToParts(date);
  // Некоторые движки в полночь отдают '24' вместо '00'.
  return `${pad2(part(parts, 'hour') % 24)}:${pad2(part(parts, 'minute'))}`;
}

/** Сегодняшняя дата в Москве, 'YYYY-MM-DD'. */
export function todayMsk(date: Date = new Date()): string {
  const parts = dateFormat.formatToParts(date);
  return `${part(parts, 'year')}-${pad2(part(parts, 'month'))}-${pad2(part(parts, 'day'))}`;
}

/**
 * «Сейчас» дня: часы дня (`clock`, D-24), если бэк их задал, иначе реальное московское время.
 * Часы во фронте только показываем — переводит их бэк (D-28).
 */
export function nowFor(clock?: string | null): string {
  return clock || nowMsk();
}

const TIME = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/** 'HH:MM' → минуты от полуночи. Не время — `NaN`. */
export function toMin(time: string): number {
  const match = TIME.exec(time.trim());
  if (!match) return Number.NaN;
  const minutes = Number(match[2]);
  return minutes > 59 ? Number.NaN : Number(match[1]) * 60 + minutes;
}

/** Минуты от полуночи → 'HH:MM'. 1440 → '24:00' (конец суток), отрицательные → '00:00'. */
export function fromMin(minutes: number): string {
  if (!Number.isFinite(minutes)) return '--:--';
  const total = Math.max(0, Math.round(minutes));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

export interface TimeWindow {
  start: string;
  end: string;
}

/** Окно '10:00-12:00' (также с «–» и пробелами) → `{ start: '10:00', end: '12:00' }`; не окно — `null`. */
export function parseWindow(value: string): TimeWindow | null {
  const match = /^\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*$/.exec(value);
  if (!match) return null;
  const start = toMin(match[1]);
  const end = toMin(match[2]);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start: fromMin(start), end: fromMin(end) };
}
