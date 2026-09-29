/**
 * Подсказки адресов (Photon, GeoJSON) → строки для поля адреса: «Тверская улица, 7» и ниже
 * «Москва, Тверской». В поле уходит полный адрес — его же найдёт геокодер бэка.
 */

export interface AddressSuggestion {
  id: string;
  /** Главная строка: улица и дом или название места. */
  title: string;
  /** Вторая строка: город, район. */
  subtitle: string;
  /** В поле адреса: «Москва, Тверская улица, 7». */
  value: string;
  lat: number;
  lon: number;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function unique(parts: (string | null)[]): string[] {
  const out: string[] = [];
  for (const part of parts) if (part && !out.includes(part)) out.push(part);
  return out;
}

function suggestionOf(feature: unknown, index: number): AddressSuggestion | null {
  if (!isObject(feature) || !isObject(feature.properties) || !isObject(feature.geometry)) return null;
  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lon, lat] = coords.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const p = feature.properties;
  const name = text(p.name);
  const street = text(p.street);
  const house = text(p.housenumber);
  const city = text(p.city) ?? text(p.locality) ?? text(p.county) ?? text(p.state);
  const district = text(p.district);

  // дом: «Тверская улица, 7»; улица или место: название; название дома — во вторую строку
  const address = street ? unique([street, house]).join(', ') : unique([name, house]).join(', ');
  if (!address) return null;
  const place = street && name && name !== street ? name : null;
  return {
    id: `${text(p.osm_type) ?? ''}${String(p.osm_id ?? index)}`,
    title: address,
    subtitle: unique([city, district, place]).join(', '),
    value: unique([city, address]).join(', '),
    lat,
    lon,
  };
}

/** Ответ Photon → подсказки без повторов; мусор — пустой список. */
export function parseSuggestions(response: unknown): AddressSuggestion[] {
  if (!isObject(response) || !Array.isArray(response.features)) return [];
  const seen = new Set<string>();
  const out: AddressSuggestion[] = [];
  response.features.forEach((feature, index) => {
    const suggestion = suggestionOf(feature, index);
    if (!suggestion || seen.has(suggestion.value)) return;
    seen.add(suggestion.value);
    out.push(suggestion);
  });
  return out;
}

/**
 * Первый вариант адреса для события без выбранной подсказки: `found` — с координатами, `none` —
 * сервис ответил, но адреса нет, `unavailable` — сервис выключен или не ответил.
 */
export type AddressLookup =
  | { status: 'found'; suggestion: AddressSuggestion }
  | { status: 'none' }
  | { status: 'unavailable' };

export function lookupOf(response: unknown): AddressLookup {
  if (response === null || response === undefined) return { status: 'unavailable' };
  const [first] = parseSuggestions(response);
  return first ? { status: 'found', suggestion: first } : { status: 'none' };
}
