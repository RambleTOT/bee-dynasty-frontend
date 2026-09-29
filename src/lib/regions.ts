/**
 * Подписи участков. Три участка кейса — в справочнике (`REGION_LABEL`): подпись есть и до ответа
 * `GET /regions`. Свои участки (§14, `FEATURES.anyRegion`) приходят только с бэка — их названия
 * запоминаем из ответа (hooks/useRegions.ts).
 */
import { REGION_LABEL, REGIONS } from './statuses';

const learned = new Map<string, string>();

export function rememberRegions(regions: readonly { region_id: string; name: string }[]): void {
  for (const { region_id: id, name } of regions) {
    if (id && name?.trim()) learned.set(id, name.trim());
  }
}

/** Только для тестов: забыть названия с бэка. */
export function forgetRegions(): void {
  learned.clear();
}

export const isBuiltinRegion = (id: string): boolean => (REGIONS as readonly string[]).includes(id);

/** Название участка: с бэка, иначе справочник; незнакомый участок — `null`. */
export function knownRegionName(id: string | null | undefined): string | null {
  if (!id) return null;
  return (
    learned.get(id) ?? (isBuiltinRegion(id) ? REGION_LABEL[id as keyof typeof REGION_LABEL] : null)
  );
}

/** id участка в адресе: латиница, цифры, «_» и «-» — id своих участков выдаёт бэк (§14). */
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
export const isRegionSlug = (value: unknown): value is string =>
  typeof value === 'string' && SLUG.test(value);
