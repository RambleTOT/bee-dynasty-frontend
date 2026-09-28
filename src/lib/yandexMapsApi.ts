/**
 * Загрузка JavaScript API Яндекс Карт 2.1 по ключу `VITE_YANDEX_MAPS_KEY` (README, «Яндекс Карты»).
 * Без ключа встроенной карты Яндекса нет — экраны показывают карту OSM. Ссылки «открыть маршрут
 * в Яндекс Картах» ключа не требуют (`lib/yandexMaps.ts`).
 */

/** Нужная нам часть API 2.1 (типов у пакета нет). */
export interface YMapsGeoObjects {
  add(object: unknown): void;
  removeAll(): void;
  getBounds(): number[][] | null;
}

export interface YMap {
  geoObjects: YMapsGeoObjects;
  setBounds(bounds: number[][], options?: Record<string, unknown>): void;
  setCenter(center: number[], zoom?: number): void;
  destroy(): void;
  container: { fitToViewport(): void };
}

export interface YMultiRoute {
  model: { events: { add(type: string, handler: () => void): void } };
  getBounds(): number[][] | null;
}

export interface YMaps {
  ready(): PromiseLike<void>;
  Map: new (
    element: HTMLElement,
    state: { center: number[]; zoom: number; controls?: string[] },
    options?: Record<string, unknown>,
  ) => YMap;
  Placemark: new (
    coordinates: number[],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  multiRouter: {
    MultiRoute: new (
      model: { referencePoints: number[][]; params?: Record<string, unknown> },
      options?: Record<string, unknown>,
    ) => YMultiRoute;
  };
}

declare global {
  interface Window {
    ymaps?: YMaps;
  }
}

export const YANDEX_MAPS_KEY: string | null = import.meta.env.VITE_YANDEX_MAPS_KEY?.trim() || null;

let loading: Promise<YMaps> | null = null;

/**
 * Яндекс не строит маршрут: ключ не активен, кончился суточный лимит, нет сети. До перезагрузки
 * страницы встроенную карту Яндекса не показываем — остаётся карта OSM, лимит не тратим.
 */
let unavailable = false;
export const yandexMapsUnavailable = () => unavailable;
export function markYandexMapsUnavailable() {
  unavailable = true;
}

export function loadYandexMaps(): Promise<YMaps> {
  if (!YANDEX_MAPS_KEY) return Promise.reject(new Error('Нет ключа Яндекс Карт'));
  if (unavailable) return Promise.reject(new Error('Яндекс Карты недоступны'));
  if (loading) return loading;
  loading = new Promise<YMaps>((resolve, reject) => {
    const done = () => {
      const ymaps = window.ymaps;
      if (!ymaps) {
        reject(new Error('Яндекс Карты не загрузились'));
        return;
      }
      ymaps.ready().then(() => resolve(ymaps), reject);
    };
    if (window.ymaps) {
      done();
      return;
    }
    const script = document.createElement('script');
    // csp=true и точная версия — режим API для сайта с Content-Security-Policy (deploy/nginx):
    // стили через blob:, без inline-стилей и eval
    script.src = `https://api-maps.yandex.ru/2.1.79/?apikey=${encodeURIComponent(YANDEX_MAPS_KEY)}&lang=ru_RU&csp=true`;
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error('Яндекс Карты не загрузились'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null; // следующая попытка — заново
    throw error;
  });
  return loading;
}

/** `routingMode` мультимаршрута по транспорту бригады. */
export function routingMode(transport: string | null | undefined, points: number): string {
  switch (transport) {
    case 'walk':
      return 'pedestrian';
    case 'bike':
      return 'bicycle';
    case 'public_transport':
      // общественный транспорт Яндекс строит только между двумя точками
      return points <= 2 ? 'masstransit' : 'auto';
    default:
      return 'auto';
  }
}
