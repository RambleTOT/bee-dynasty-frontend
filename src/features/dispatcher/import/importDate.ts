import { todayMsk } from '@/lib/time';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Дата импорта CSV — сегодня по Москве (D-26): в форме даты нет.
 * Только в dev-сборке её можно подменить `VITE_DEV_IMPORT_DATE=YYYY-MM-DD` в `.env.local`, чтобы
 * проверить импорт на стенде, не трогая сегодняшний демо-день.
 * В прод-сборке переменная не читается.
 */
export function importDate(): string {
  const override: unknown = import.meta.env.DEV ? import.meta.env.VITE_DEV_IMPORT_DATE : undefined;
  return typeof override === 'string' && YMD.test(override) ? override : todayMsk();
}
