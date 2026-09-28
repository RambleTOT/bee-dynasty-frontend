import { describe, expect, it } from 'vitest';
import type { EngineerRoute } from '@/api/types';
import {
  dayRouteUrl,
  linkTransport,
  nextLegUrl,
  routeUrlTo,
  toEngineerRoute,
} from './engineerRoute';

const raw: EngineerRoute = {
  transport: 'car',
  start: { lat: 55.7098, lon: 37.7805, label: 'ул. Окская' },
  points: [
    { request_id: 'B', sequence: 6, lat: 55.7133, lon: 37.7481 },
    { request_id: 'A', sequence: 5, lat: 55.7071, lon: 37.7612 },
    { request_id: 'X', sequence: 7, lat: Number.NaN, lon: 37.7 },
  ],
  geometry: {
    type: 'LineString',
    coordinates: [
      [37.7805, 55.7098],
      [37.7612, 55.7071],
      [37.7481, 55.7133],
    ],
  },
};

describe('toEngineerRoute', () => {
  it('точки по sequence, без битых координат; линия [lon, lat] → [lat, lon]', () => {
    const route = toEngineerRoute(raw);
    expect(route.points.map((p) => p.requestId)).toEqual(['A', 'B']);
    expect(route.line[0]).toEqual([55.7098, 37.7805]);
    expect(route.start).toEqual({ lat: 55.7098, lon: 37.7805 });
    expect(route.transport).toBe('car');
  });

  it('пустой ответ — пустой маршрут', () => {
    expect(toEngineerRoute(null)).toEqual({ transport: null, start: null, points: [], line: [] });
  });
});

describe('ссылки в Яндекс Карты', () => {
  const route = toEngineerRoute(raw);
  const rtext = (url: string | null) => new URL(url ?? '').searchParams.get('rtext');

  it('«До следующей» — старт и первая точка', () => {
    expect(rtext(nextLegUrl(route, 'car'))).toBe('55.709800,37.780500~55.707100,37.761200');
  });

  it('«Маршрут на день» — все точки', () => {
    expect(rtext(dayRouteUrl(route, 'walk'))?.split('~')).toHaveLength(3);
    expect(dayRouteUrl(route, 'walk')).toMatch(/&rtt=pd$/);
  });

  it('из карточки — до этой заявки включительно; нет в маршруте — ссылки нет', () => {
    expect(rtext(routeUrlTo(route, 'A', 'car'))?.split('~')).toHaveLength(2);
    expect(rtext(routeUrlTo(route, 'B', 'car'))?.split('~')).toHaveLength(3);
    expect(routeUrlTo(route, 'Z', 'car')).toBeNull();
  });

  it('без старта — от первой точки; одной точки мало', () => {
    const noStart = toEngineerRoute({ ...raw, start: null });
    expect(rtext(dayRouteUrl(noStart, 'car'))).toBe('55.707100,37.761200~55.713300,37.748100');
    expect(nextLegUrl(noStart, 'car')).toBeNull();
  });

  it('транспорт: фактический, иначе по справочнику, иначе из маршрута', () => {
    expect(linkTransport({ actualTransport: 'bike', transport: 'car' })).toBe('bike');
    expect(linkTransport({ actualTransport: null, transport: 'walk' }, route)).toBe('walk');
    expect(linkTransport({ actualTransport: null, transport: null }, route)).toBe('car');
    expect(linkTransport({ actualTransport: null, transport: null })).toBe('car');
  });
});
