/**
 * Встроенная Яндекс Карта с маршрутом: старт, точки с номерами, одна линия цветом бригады.
 * - Маршрут сначала просим у Яндекса (мультимаршрут по точкам по порядку). Не построил (бесплатный
 *   ключ: сервис маршрутов отвечает 401) — рисуем на карте Яндекса свою линию маршрута (`line`,
 *   дорожная геометрия с бэка), дальше до перезагрузки маршрутизатор не дёргаем.
 * - Нет ключа, API не загрузился или карта не грузит тайлы (ключ не активен, кончился суточный
 *   лимит) — `fallback` (карта OSM).
 * Цвет — CSS-переменная с элемента карты: JS API понимает только готовый цвет.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  loadYandexMaps,
  markYandexMapsUnavailable,
  markYandexRoutingUnavailable,
  routingMode,
  YANDEX_MAPS_KEY,
  yandexMapsUnavailable,
  yandexRoutingUnavailable,
  type YMap,
  type YMaps,
} from '@/lib/yandexMapsApi';
import { cx, Spinner } from '@/ui';
import styles from './YandexRouteMap.module.css';

/** Сколько ждём первые тайлы карты, прежде чем уйти на карту OSM. */
const TILES_TIMEOUT_MS = 12_000;

export interface RouteStop {
  lat: number;
  lon: number;
  /** Номер на метке — `sequence`. */
  number: number | string;
  hint?: string;
}

interface YandexRouteMapProps {
  start: { lat: number; lon: number } | null;
  stops: RouteStop[];
  /** Линия маршрута `[lat, lon]` — если Яндекс маршрут не построит; нет — прямые между точками. */
  line?: readonly (readonly [number, number])[];
  transport: string | null;
  /** CSS-переменная цвета маршрута, например `--engineer-route` или `--route-3`. */
  colorVar: string;
  fallback: ReactNode;
  className?: string;
}

function cssColor(element: HTMLElement, name: string): string {
  const style = getComputedStyle(element);
  return (style.getPropertyValue(name) || style.getPropertyValue('--route-1')).trim();
}

function draw(
  ymaps: YMaps,
  map: YMap,
  element: HTMLElement,
  props: YandexRouteMapProps,
  onRoutingFail: () => void,
) {
  map.geoObjects.removeAll();
  const color = cssColor(element, props.colorVar);
  const refs = [...(props.start ? [props.start] : []), ...props.stops].map((p) => [p.lat, p.lon]);
  if (refs.length >= 2 && !yandexRoutingUnavailable()) {
    const route = new ymaps.multiRouter.MultiRoute(
      { referencePoints: refs, params: { routingMode: routingMode(props.transport, refs.length), results: 1 } },
      {
        boundsAutoApply: true,
        wayPointVisible: false,
        viaPointVisible: false,
        pinVisible: false,
        routeActiveStrokeColor: color,
        routeActiveStrokeWidth: 5,
        routeActivePedestrianSegmentStrokeStyle: 'solid',
        routeActivePedestrianSegmentStrokeColor: color,
      },
    );
    route.model.events.add('requestfail', onRoutingFail);
    map.geoObjects.add(route);
  } else if (refs.length >= 2) {
    const line = props.line && props.line.length >= 2 ? props.line.map(([lat, lon]) => [lat, lon]) : refs;
    map.geoObjects.add(new ymaps.Polyline(line, {}, { strokeColor: color, strokeWidth: 5, strokeOpacity: 0.9 }));
  }
  if (props.start) {
    map.geoObjects.add(
      new ymaps.Placemark([props.start.lat, props.start.lon], { hintContent: 'Старт' }, { preset: 'islands#blackCircleDotIcon' }),
    );
  }
  for (const stop of props.stops) {
    map.geoObjects.add(
      new ymaps.Placemark(
        [stop.lat, stop.lon],
        { iconContent: String(stop.number), hintContent: stop.hint },
        { preset: 'islands#icon', iconColor: color },
      ),
    );
  }
  const bounds = map.geoObjects.getBounds();
  if (bounds && refs.length >= 2) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
  else if (refs.length === 1) map.setCenter(refs[0], 15);
}

export function YandexRouteMap(props: YandexRouteMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<{ ymaps: YMaps; map: YMap } | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(
    YANDEX_MAPS_KEY && !yandexMapsUnavailable() ? 'loading' : 'failed',
  );

  const redraw = useRef(() => {
    const current = map.current;
    if (current && element.current) {
      draw(current.ymaps, current.map, element.current, latest.current, routingFailed.current);
    }
  });
  // маршрут Яндекс не построил — та же карта, но со своей линией маршрута
  const routingFailed = useRef(() => {
    markYandexRoutingUnavailable();
    redraw.current();
  });
  // тайлы не грузятся — карта OSM до перезагрузки страницы
  const fail = useRef(() => {
    markYandexMapsUnavailable();
    map.current?.map.destroy();
    map.current = null;
    setState('failed');
  });

  useEffect(() => {
    if (!YANDEX_MAPS_KEY || yandexMapsUnavailable()) return;
    let cancelled = false;
    let tilesTimer: ReturnType<typeof setTimeout> | undefined;
    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !element.current) return;
        const instance = new ymaps.Map(
          element.current,
          { center: [55.751, 37.618], zoom: 11, controls: ['zoomControl'] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        );
        map.current = { ymaps, map: instance };
        let tiles = false;
        instance.layers.each((layer) =>
          layer.events.add('tileloadchange', (event) => {
            if (Number(event.get('readyTileNumber')) > 0) tiles = true;
          }),
        );
        tilesTimer = setTimeout(() => {
          if (!cancelled && !tiles) fail.current();
        }, TILES_TIMEOUT_MS);
        redraw.current();
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
      clearTimeout(tilesTimer);
      map.current?.map.destroy();
      map.current = null;
    };
  }, []);

  // перерисовываем, только когда меняется набор точек — опрос не сбивает ручной масштаб
  const signature = [
    props.start ? `${props.start.lat},${props.start.lon}` : '-',
    ...props.stops.map((s) => `${s.number}:${s.lat},${s.lon}`),
    props.transport,
    props.line?.length ?? 0,
  ].join('|');
  useEffect(() => {
    redraw.current();
  }, [signature]);

  if (state === 'failed') return <>{props.fallback}</>;
  return (
    <div className={cx(styles.wrap, props.className)}>
      <div ref={element} className={styles.map} />
      {state === 'loading' && (
        <div className={styles.loading}>
          <Spinner size={24} label="Загрузка Яндекс Карт" />
        </div>
      )}
    </div>
  );
}
