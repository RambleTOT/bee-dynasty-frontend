/**
 * Подсказки адресов и адрес точки — Photon (OpenStreetMap), настройки — ADDRESS_SUGGEST в config.ts.
 * Ответ — GeoJSON как есть; разбор — adapters/address.ts.
 */
import { ADDRESS_SUGGEST } from '@/config';
import { fetchExternalJson } from './client';

export const addressSuggestEnabled = ADDRESS_SUGGEST.url !== null;

/** Подсказки по набранному тексту: Москва и область, ближе к центру — выше. */
export function suggestAddresses(query: string, signal?: AbortSignal): Promise<unknown> {
  if (!ADDRESS_SUGGEST.url) return Promise.resolve(null);
  const params = new URLSearchParams({
    q: query,
    lat: String(ADDRESS_SUGGEST.center.lat),
    lon: String(ADDRESS_SUGGEST.center.lon),
    bbox: ADDRESS_SUGGEST.bbox,
    limit: String(ADDRESS_SUGGEST.limit),
  });
  return fetchExternalJson(`${ADDRESS_SUGGEST.url}/api/?${params}`, signal);
}

/** Адрес точки на карте. */
export function reverseAddress(lat: number, lon: number, signal?: AbortSignal): Promise<unknown> {
  if (!ADDRESS_SUGGEST.url) return Promise.resolve(null);
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), limit: '1' });
  return fetchExternalJson(`${ADDRESS_SUGGEST.url}/reverse?${params}`, signal);
}
