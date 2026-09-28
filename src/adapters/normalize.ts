/**
 * Синтетические наборы и пустые поля (FRONTEND_SPEC §6.8). Компоненты берут готовые подписи
 * отсюда и из dayModel, сырые поля заявок и бригад напрямую не читают.
 */
import type { EngineerOut, RequestOut, ScenarioOut } from '@/api/types';
import { engineerLabel, engineerShort, shortId, typeFull, typeShort } from '@/lib/dictionaries';
import { MOSCOW_CENTER, isValidLatLng, type LatLng } from '@/lib/map';

/** Рамка Московского региона: точки вне неё — условные координаты (§6.8). */
const MOSCOW_BOX = { latMin: 54.2, latMax: 57.0, lonMin: 35.1, lonMax: 40.3 };
const KM_PER_DEGREE = 111.32;

export function insideMoscowRegion(lat: number, lon: number): boolean {
  return (
    lat >= MOSCOW_BOX.latMin &&
    lat <= MOSCOW_BOX.latMax &&
    lon >= MOSCOW_BOX.lonMin &&
    lon <= MOSCOW_BOX.lonMax
  );
}

/**
 * Признак синтетики [Д], по первому сработавшему условию: источник, вид id, точки вне рамки региона.
 */
export function isSynthetic(scenario: Pick<ScenarioOut, 'source' | 'requests' | 'engineers'>) {
  if (/synth|instance|bench/i.test(scenario.source ?? '')) return true;
  const requests = scenario.requests ?? [];
  const engineers = scenario.engineers ?? [];
  if (
    requests.length > 0 &&
    requests.every((r) => /^T\d{3}$/.test(r.id)) &&
    engineers.every((e) => /^E\d{2}$/.test(e.id))
  ) {
    return true;
  }
  return pointsOf(requests, engineers).some(([lat, lon]) => !insideMoscowRegion(lat, lon));
}

function pointsOf(requests: readonly RequestOut[], engineers: readonly EngineerOut[]): LatLng[] {
  const points: LatLng[] = [];
  for (const r of requests) if (isValidLatLng(r.latitude, r.longitude)) points.push([r.latitude, r.longitude]);
  for (const e of engineers) if (isValidLatLng(e.latitude, e.longitude)) points.push([e.latitude, e.longitude]);
  return points;
}

export type CoordTransform = (lat: number, lon: number) => LatLng;

export interface Coordinates {
  /** Координаты пришли условные (плоские км) — облако перенесено к офису. */
  approx: boolean;
  transform: CoordTransform;
}

const identity: CoordTransform = (lat, lon) => [lat, lon];

/**
 * Перенос условных координат к офису (§6.8): одно преобразование для точек, стартов и линий.
 * `lat = lat0 + (y − ȳ)/111,32`, `lon = lon0 + (x − x̄)/(111,32 · cos lat0)`.
 */
export function coordinatesFor(
  requests: readonly RequestOut[],
  engineers: readonly EngineerOut[],
  office?: { lat?: number | null; lon?: number | null } | null,
): Coordinates {
  const points = pointsOf(requests, engineers);
  if (points.length === 0 || points.every(([lat, lon]) => insideMoscowRegion(lat, lon))) {
    return { approx: false, transform: identity };
  }
  const [lat0, lon0] =
    office && isValidLatLng(office.lat, office.lon)
      ? [office.lat as number, office.lon as number]
      : MOSCOW_CENTER;
  const meanY = points.reduce((sum, [lat]) => sum + lat, 0) / points.length;
  const meanX = points.reduce((sum, [, lon]) => sum + lon, 0) / points.length;
  const cos = Math.cos((lat0 * Math.PI) / 180);
  return {
    approx: true,
    transform: (y, x) => [lat0 + (y - meanY) / KM_PER_DEGREE, lon0 + (x - meanX) / (KM_PER_DEGREE * cos)],
  };
}

/** Подписи заявки без обращений к сырым полям в компонентах. */
export function requestLabels(request: Pick<RequestOut, 'id' | 'type_bk' | 'type_hd' | 'required_skill' | 'address' | 'district'>) {
  const address = (request.address ?? '').trim();
  return {
    shortId: shortId(request.id),
    number: `№${request.id}`,
    typeShort: typeShort(request.type_bk, request.required_skill),
    typeFull: typeFull(request.type_bk, request.type_hd, request.required_skill),
    typeBk: request.type_bk || typeFull(null, null, request.required_skill),
    hasAddress: address.length > 0,
    addressText: address || 'Адрес не указан',
    district: request.district?.trim() || null,
  };
}

export function engineerLabels(engineer: Pick<EngineerOut, 'id' | 'name'>) {
  return {
    label: engineerLabel(engineer.name, engineer.id),
    short: engineerShort(engineer.name, engineer.id),
  };
}
