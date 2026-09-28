import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YMaps } from '@/lib/yandexMapsApi';
import { YandexRouteMap } from './YandexRouteMap';

const handlers = new Map<string, () => void>();

class FakeMap {
  geoObjects = { add: vi.fn(), removeAll: vi.fn(), getBounds: () => null };
  setBounds = vi.fn();
  setCenter = vi.fn();
  destroy = vi.fn();
  container = { fitToViewport: vi.fn() };
}

const fakeYmaps = {
  ready: () => Promise.resolve(),
  Map: FakeMap,
  Placemark: class {},
  multiRouter: {
    MultiRoute: class {
      model = { events: { add: (type: string, handler: () => void) => handlers.set(type, handler) } };
      getBounds = () => null;
    },
  },
} as unknown as YMaps;

vi.mock('@/lib/yandexMapsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/yandexMapsApi')>();
  return {
    ...actual,
    YANDEX_MAPS_KEY: 'test-key',
    loadYandexMaps: vi.fn(() => (actual.yandexMapsUnavailable() ? Promise.reject(new Error('нет')) : Promise.resolve(fakeYmaps))),
  };
});

const props = {
  start: { lat: 55.7, lon: 37.6 },
  stops: [{ lat: 55.71, lon: 37.61, number: 1 }],
  transport: 'car',
  colorVar: '--route-1',
  fallback: <p>Карта OSM</p>,
};

describe('YandexRouteMap: Яндекс не построил маршрут', () => {
  it('ключ не активен или кончился лимит — карта OSM, и дальше до перезагрузки только она', async () => {
    const first = render(<YandexRouteMap {...props} />);
    // карта Яндекса создана, маршрут запрошен
    await waitFor(() => expect(handlers.has('requestfail')).toBe(true));
    expect(screen.queryByText('Карта OSM')).toBeNull();

    act(() => handlers.get('requestfail')?.());
    expect(screen.getByText('Карта OSM')).toBeInTheDocument();
    first.unmount();

    // следующий экран с картой сразу берёт OSM и лимит не тратит
    render(<YandexRouteMap {...props} />);
    expect(screen.getByText('Карта OSM')).toBeInTheDocument();
  });
});
