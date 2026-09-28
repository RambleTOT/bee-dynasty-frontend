/**
 * Маршрут инженера по оставшимся точкам из `GET /engineers/me/route?remaining=true` (FRONTEND_SPEC
 * §9.2 E-04): старт, точки с номерами, линия для карты и ссылки в Яндекс Карты.
 * Координаты проверяем: условные или пустые точки на карту и в ссылки не попадают.
 */
import type { EngineerRoute } from '@/api/types';
import { isValidLatLng, type LatLng } from '@/lib/map';
import { isTransport, type Transport } from '@/lib/statuses';
import { yandexRouteUrl, type LatLon } from '@/lib/yandexMaps';

export interface RoutePointModel extends LatLon {
  requestId: string;
  sequence: number;
}

export interface EngineerRouteModel {
  transport: Transport | null;
  /** Последняя выполненная заявка или стартовая точка (D-21). */
  start: LatLon | null;
  /** Оставшиеся точки по порядку. */
  points: RoutePointModel[];
  /** Линия для Leaflet: GeoJSON `[lon, lat]` → `[lat, lon]`. */
  line: LatLng[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null;

export function toEngineerRoute(raw: EngineerRoute | null | undefined): EngineerRouteModel {
  const start =
    isObject(raw?.start) && isValidLatLng(raw.start.lat, raw.start.lon) ? raw.start : null;
  const points = (Array.isArray(raw?.points) ? raw.points : [])
    .filter((point) => isObject(point) && isValidLatLng(point.lat, point.lon))
    .map((point) => ({
      requestId: String(point.request_id),
      sequence: Number(point.sequence) || 0,
      lat: point.lat,
      lon: point.lon,
    }))
    .sort((a, b) => a.sequence - b.sequence);
  const coordinates = isObject(raw?.geometry) ? raw.geometry.coordinates : null;
  const line = (Array.isArray(coordinates) ? coordinates : [])
    .filter((pair) => Array.isArray(pair) && isValidLatLng(pair[1], pair[0]))
    .map(([lon, lat]): LatLng => [lat, lon]);
  return {
    transport: isTransport(raw?.transport) ? raw.transport : null,
    start: start ? { lat: start.lat, lon: start.lon } : null,
    points,
    line,
  };
}

/** Ссылка на маршрут в Яндекс Картах от старта через точки; без точек — null. */
export function routeUrl(
  route: EngineerRouteModel,
  points: readonly LatLon[],
  transport: Transport,
): string | null {
  const [first, ...rest] = route.start ? [route.start, ...points] : points;
  if (!first || rest.length === 0) return null;
  return yandexRouteUrl(first, rest, transport);
}

/** «До следующей» — первая оставшаяся точка. */
export const nextLegUrl = (route: EngineerRouteModel, transport: Transport) =>
  routeUrl(route, route.points.slice(0, 1), transport);

/** «Маршрут на день» — все оставшиеся точки. */
export const dayRouteUrl = (route: EngineerRouteModel, transport: Transport) =>
  routeUrl(route, route.points, transport);

/** Из карточки заявки (E-03.1) — точки до этой заявки включительно; её нет в маршруте — null. */
export function routeUrlTo(
  route: EngineerRouteModel,
  requestId: string,
  transport: Transport,
): string | null {
  const index = route.points.findIndex((point) => point.requestId === requestId);
  return index < 0 ? null : routeUrl(route, route.points.slice(0, index + 1), transport);
}

/** Транспорт для ссылки: фактический, иначе по справочнику, иначе из маршрута; неизвестно — авто [Д]. */
export function linkTransport(
  engineer: { actualTransport: Transport | null; transport: Transport | null },
  route?: EngineerRouteModel | null,
): Transport {
  return engineer.actualTransport ?? engineer.transport ?? route?.transport ?? 'car';
}
