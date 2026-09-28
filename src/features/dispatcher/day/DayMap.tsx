/**
 * Карта дня (DS-03): маршруты бригад, точки с номерами, аварии, неназначенные, офис (FRONTEND_SPEC §6.6).
 * Цвет маршрута — CSS-класс `--route-N` на <path> и маркере: Leaflet пишет цвет в атрибут, где var() не работает.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
  Minus,
  Plus,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { GeoJsonCollection } from '@/api/types';
import { matchesFilters, type DayFilters, type DayModel, type DayRequest } from '@/adapters/dayModel';
import { dayBounds, hasNonCarRoutes, routeLines, type RouteLine } from '@/adapters/geo';
import { countOf, PL_REQUEST } from '@/lib/format';
import { MOSCOW_CENTER, OSM_TILES, type LatLng } from '@/lib/map';
import mapStyles from '@/lib/map.module.css';
import { IconButton, cx } from '@/ui';
import { BUILDING_SVG, CHECK_SVG, ZAP_SVG } from './markerIcons';
import styles from './DayMap.module.css';

export interface MapHighlight {
  /** Бригады, чьи маршруты меняются: подсвечены, остальные приглушены. */
  engineers: ReadonlySet<string>;
  /** Новые линии этих бригад (из предложения). */
  lines: RouteLine[];
  /** Прежние линии этих бригад — серым пунктиром. */
  ghost: RouteLine[];
  /** Предложение, к которому можно вернуться. */
  planId: string | null;
}

interface DayMapProps {
  model: DayModel;
  geojson: GeoJsonCollection | null;
  filters: DayFilters;
  brigade: string | null;
  selectedRequest: string | null;
  highlight?: MapHighlight | null;
  onOpenRequest: (id: string) => void;
  onOpenUnassigned: (id: string) => void;
}

const colorClass = (index: number) => styles[`c${index}`];

function FitBounds({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 13);
    // только при смене дня / региона: иначе опрос каждые 10 с сбрасывал бы масштаб
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);
  return null;
}

function ZoomButtons() {
  const map = useMap();
  return (
    <div className={styles.zoom}>
      <IconButton icon={Plus} label="Приблизить" variant="secondary" onClick={() => map.zoomIn()} />
      <IconButton icon={Minus} label="Отдалить" variant="secondary" onClick={() => map.zoomOut()} />
    </div>
  );
}

function RequestTooltip({ request, model }: { request: DayRequest; model: DayModel }) {
  const engineer = request.engineerId ? model.engineerById.get(request.engineerId) : null;
  return (
    <>
      <div className={styles.tipTitle}>
        №{request.id} · {request.typeBk} · окно {request.windowShort}
      </div>
      <div className={styles.tipSub}>
        {engineer && request.visit
          ? `${engineer.label} · начало ${request.visit.start}`
          : request.status === 'unassigned' && model.plan
            ? 'Не назначена'
            : request.addressText}
      </div>
    </>
  );
}

export function DayMap({
  model,
  geojson,
  filters,
  brigade,
  selectedRequest,
  highlight,
  onOpenRequest,
  onOpenUnassigned,
}: DayMapProps) {
  const [legendOpen, setLegendOpen] = useState(false);
  const hasPlan = Boolean(model.plan);
  const lines = useMemo(() => {
    const current = hasPlan ? routeLines(model, geojson) : [];
    if (!highlight) return current;
    // изменённые бригады — линиями предложения, остальные — как в действующем плане
    return [...current.filter((l) => !highlight.engineers.has(l.engineerId)), ...highlight.lines];
  }, [model, geojson, hasPlan, highlight]);
  const bounds = useMemo(() => dayBounds(model), [model]);
  const fitKey = `${model.date}:${model.regionId}:${model.planId ?? 'none'}:${bounds.length > 0}`;

  const dimmedEngineer = (engineerId: string | null) => {
    if (highlight) return !engineerId || !highlight.engineers.has(engineerId);
    return Boolean(brigade) && engineerId !== brigade;
  };

  const markers = model.requests
    .filter((r) => r.point && r.status !== 'cancelled' && r.status !== 'rescheduled')
    .map((request) => {
      const engineer = request.engineerId ? model.engineerById.get(request.engineerId) : null;
      const visible = matchesFilters(request, filters);
      const dim = !visible || dimmedEngineer(request.engineerId);
      const selected = request.id === selectedRequest;
      let html: string;
      let size = 24;
      let kind: 'stop' | 'urgent' | 'unassigned' | 'plain';
      if (!hasPlan) {
        // до плана — нейтральные точки (§6.6)
        kind = 'plain';
      } else if (request.emergency && request.status !== 'done') {
        kind = 'urgent';
      } else if (!request.visit) {
        kind = 'unassigned';
      } else {
        kind = 'stop';
      }
      if (kind === 'urgent') {
        size = 28;
        html = `<div class="${cx(styles.urgent, selected && styles.selected)}">${ZAP_SVG(16)}</div>`;
      } else if (kind === 'unassigned') {
        html = `<div class="${cx(styles.unassigned, selected && styles.selected)}">!</div>`;
      } else if (kind === 'plain') {
        size = 14;
        html = `<div class="${styles.plain}"></div>`;
      } else {
        const done = request.status === 'done';
        const active = request.status === 'in_progress' || request.status === 'en_route';
        html = `<div class="${cx(
          styles.stop,
          engineer && colorClass(engineer.color.index),
          done && styles.done,
          active && styles.active,
          selected && styles.selected,
        )}">${done ? CHECK_SVG(14) : request.visit?.sequence ?? ''}</div>`;
      }
      const icon = L.divIcon({
        className: cx(styles.marker, dim && styles.dim),
        html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      return (
        <Marker
          key={`${request.id}:${kind}:${dim}:${selected}:${request.status}:${request.visit?.sequence ?? ''}`}
          position={request.point as LatLng}
          icon={icon}
          zIndexOffset={kind === 'urgent' ? 600 : selected ? 800 : dim ? -200 : 0}
          eventHandlers={{
            click: () => {
              if (!hasPlan) return;
              if (request.visit) onOpenRequest(request.id);
              else onOpenUnassigned(request.id);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -size / 2 - 4]} className={styles.tooltip} opacity={1}>
            <RequestTooltip request={request} model={model} />
          </Tooltip>
        </Marker>
      );
    });

  const officeIcon = L.divIcon({
    className: styles.marker,
    html: `<div class="${styles.office}">${BUILDING_SVG(16)}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const requestCount = model.requests.length;
  const nonCar = hasPlan && hasNonCarRoutes(model);

  return (
    <div className={styles.wrap}>
      <MapContainer
        className={cx(mapStyles.muted, styles.map)}
        center={bounds[0] ?? MOSCOW_CENTER}
        zoom={11}
        zoomControl={false}
        attributionControl
      >
        <TileLayer url={OSM_TILES.url} attribution={OSM_TILES.attribution} maxZoom={OSM_TILES.maxZoom} />
        <FitBounds points={bounds} fitKey={fitKey} />
        {highlight?.ghost.map((line) => (
          <Polyline
            key={`ghost-${line.engineerId}`}
            positions={line.points}
            pathOptions={{ className: styles.ghost, weight: 3, dashArray: '6 6', opacity: 1 }}
          />
        ))}
        {lines.map((line) => {
          const engineer = model.engineerById.get(line.engineerId);
          if (!engineer) return null;
          const dim = dimmedEngineer(line.engineerId);
          return (
            <Polyline
              key={`${line.engineerId}:${dim}`}
              positions={line.points}
              pathOptions={{
                className: cx(styles.route, colorClass(engineer.color.index)),
                weight: 4,
                opacity: dim ? 0.25 : 0.9,
                dashArray: engineer.color.dashed ? '10 6' : undefined,
              }}
            />
          );
        })}
        {model.office && (
          <Marker position={model.office.point} icon={officeIcon} zIndexOffset={400}>
            <Tooltip direction="top" offset={[0, -18]} className={styles.tooltip} opacity={1}>
              <div className={styles.tipTitle}>Офис</div>
              {model.office.address && <div className={styles.tipSub}>{model.office.address}</div>}
            </Tooltip>
          </Marker>
        )}
        {markers}
        <ZoomButtons />
      </MapContainer>

      {!hasPlan && (
        <div className={styles.topPill}>
          <MapPin size={16} aria-hidden />
          {countOf(requestCount, PL_REQUEST)} {model.fromCsv ? 'загружены из CSV' : 'на день'} · план ещё не
          построен
        </div>
      )}
      {model.coordsApprox && (
        <div className={cx(styles.topPill, hasPlan ? undefined : styles.topPillSecond)}>
          <TriangleAlert size={16} aria-hidden />
          Координаты условные
        </div>
      )}

      <div className={cx(styles.legend, legendOpen && styles.legendOpen)}>
        {legendOpen && (
          <ul className={styles.legendList}>
            <li>
              <span className={cx(styles.legendLine)} aria-hidden /> линия — маршрут бригады, цвет — бригада
            </li>
            <li>
              <span className={cx(styles.stop, styles.legendIcon)} aria-hidden>
                3
              </span>
              порядок визита в маршруте
            </li>
            <li>
              <span className={cx(styles.stop, styles.done, styles.c12, styles.legendIcon)} aria-hidden>
                <Check size={12} strokeWidth={2.5} />
              </span>
              заявка выполнена
            </li>
            <li>
              <span className={cx(styles.urgent, styles.legendIcon)} aria-hidden>
                <Zap size={12} strokeWidth={2.25} />
              </span>
              аварийные работы
            </li>
            <li>
              <span className={cx(styles.unassigned, styles.legendIcon)} aria-hidden>
                !
              </span>
              не назначена
            </li>
            <li>
              <span className={cx(styles.office, styles.legendIcon)} aria-hidden>
                <Building2 size={12} strokeWidth={2.25} />
              </span>
              офис
            </li>
            {nonCar && <li className={styles.legendNote}>линия — по дорогам, время — по типу транспорта</li>}
            {model.coordsApprox && <li className={styles.legendNote}>координаты условные: прямые отрезки</li>}
          </ul>
        )}
        <button type="button" className={styles.legendToggle} onClick={() => setLegendOpen((v) => !v)} aria-expanded={legendOpen}>
          <Layers size={16} aria-hidden />
          Легенда · линия = маршрут бригады
          {legendOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronUp size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
