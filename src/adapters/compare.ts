/**
 * «Сравнение» и DS-05: наш план / базовый FIFO / реальный диспетчер (FRONTEND_SPEC §6.3).
 * «Наш план» — стратегия `incremental` (метрики действующего плана тем же расчётом, что FIFO
 * и диспетчер); если её нет — сводка плана.
 */
import type { BaselineResponse, CompareColumn, CompareResponse, PlanResponse, RouteOut } from '@/api/types';
import { formatDelta, formatInt, formatKm } from '@/lib/format';
import { toMin } from '@/lib/time';
import type { DayModel } from './dayModel';

export interface CompareCell {
  value: string;
  /** Δ к базовому FIFO — только у «Наш план». */
  delta?: string;
  /** «оценка», «нет данных: …». */
  note?: string;
}

export interface CompareRow {
  key: 'engineers' | 'km' | 'unassigned' | 'inWindow' | 'late';
  label: string;
  ours: CompareCell;
  fifo: CompareCell;
  dispatcher: CompareCell;
}

export interface EngineerKmRow {
  engineerId: string;
  label: string;
  short: string;
  color: DayModel['engineers'][number]['color'];
  ours: number | null;
  fifo: number | null;
  dispatcher: number | null;
  tasksOurs: number | null;
  tasksFifo: number | null;
  tasksDispatcher: number;
}

export interface CompareModel {
  rows: CompareRow[];
  note: string;
  /** Колонки «Реальный диспетчер» нет — почему. */
  dispatcherMissing: string | null;
  engineers: EngineerKmRow[];
  maxKm: number;
  hasPlan: boolean;
}

const EMPTY: CompareCell = { value: '—' };

const NOTE_BEFORE_PLAN =
  'Нажмите «Построить план», чтобы заполнить колонку «Наш план». Пробег реального диспетчера — оценка.';
const NOTE_AFTER_PLAN = 'Δ — к базовому FIFO. Пробег реального диспетчера — оценка.';

interface Visit {
  start: string;
  actual_start?: string | null;
  window_start: string;
  window_end: string;
  flags?: string[];
}

const visitsOf = (routes: readonly RouteOut[] | null | undefined): Visit[] =>
  (routes ?? []).flatMap((r) => r.route ?? []);

function startOf(v: Visit): number {
  return toMin(v.actual_start ?? v.start);
}

/** «N/M»: начало (`actual_start ?? start`) в окне. */
export function inWindow(routes: readonly RouteOut[] | null | undefined): { n: number; m: number } | null {
  const visits = visitsOf(routes);
  if (!routes) return null;
  const n = visits.filter((v) => startOf(v) >= toMin(v.window_start) && startOf(v) <= toMin(v.window_end)).length;
  return { n, m: visits.length };
}

/** Начало позже окна или флаг `late`. */
export function lateCount(routes: readonly RouteOut[] | null | undefined): number | null {
  if (!routes) return null;
  return visitsOf(routes).filter((v) => startOf(v) > toMin(v.window_end) || (v.flags ?? []).includes('late')).length;
}

const unassignedFromCoverage = (column: CompareColumn | undefined, total: number) =>
  column && Number.isFinite(column.coverage_pct) ? Math.round(total * (1 - column.coverage_pct / 100)) : null;

const num = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : n);

export interface CompareInput {
  model: Pick<DayModel, 'engineers' | 'requests' | 'routeByEngineer' | 'synthetic' | 'fromCsv'>;
  plan: PlanResponse | null;
  compare: CompareResponse | null;
  baseline: BaselineResponse | null;
}

export function buildCompare({ model, plan, compare, baseline }: CompareInput): CompareModel {
  const columns = (compare?.columns ?? {}) as Record<string, CompareColumn | undefined>;
  const kmBy = (compare?.km_by_engineer ?? {}) as Record<string, Record<string, number> | undefined>;
  const hasPlan = Boolean(plan);
  const ours = columns.incremental;
  const fifo = columns.fifo;
  const disp = columns.dispatcher;
  const total = plan?.summary.total_requests ?? model.requests.length;

  let dispatcherMissing: string | null = null;
  if (compare && !disp) {
    dispatcherMissing = model.synthetic ? 'нет данных: синтетический набор' : 'нет данных: только для CSV-дня';
  } else if (!compare && model.synthetic) {
    dispatcherMissing = 'нет данных: синтетический набор';
  }
  const dispMissingCell: CompareCell | null = dispatcherMissing
    ? { value: 'нет данных', note: dispatcherMissing.replace('нет данных: ', '') }
    : null;

  // Задействовано инженеров
  const oursEng = num(ours?.engineers_used ?? plan?.summary.engineers_used);
  const fifoEng = num(fifo?.engineers_used);
  const dispEng = num(disp?.engineers_used);

  // Пробег
  const oursKm = num(ours?.km_total ?? plan?.summary.total_distance_km);
  const fifoKm = num(fifo?.km_total);
  const dispKm = num(disp?.km_total);

  // Неназначенные
  const oursUn = num(plan?.summary.unassigned_count);
  const fifoUn = num(
    baseline?.baseline.unassigned_count ?? plan?.metrics?.baseline.unassigned_count ?? unassignedFromCoverage(fifo, total),
  );
  const dispUn = num(unassignedFromCoverage(disp, total));

  // Начато в окне, просрочено
  const oursWin = plan ? inWindow(plan.routes ?? []) : null;
  const fifoWin = baseline?.baseline_routes ? inWindow(baseline.baseline_routes) : null;
  const oursLate = plan ? lateCount(plan.routes ?? []) : null;
  const fifoLate = baseline?.baseline_routes ? lateCount(baseline.baseline_routes) : null;

  const cell = (value: number | null, format: (n: number) => string = formatInt): CompareCell =>
    value == null ? EMPTY : { value: format(value) };
  const withDelta = (
    value: number | null,
    base: number | null,
    kind: Parameters<typeof formatDelta>[1],
    format: (n: number) => string = formatInt,
  ): CompareCell => {
    if (value == null || !hasPlan) return EMPTY;
    return {
      value: format(value),
      delta: base == null ? undefined : formatDelta(value - base, kind, kind === 'km' ? base : undefined),
    };
  };
  const km = (n: number) => formatKm(n);
  const winText = (w: { n: number; m: number } | null) => (w ? `${w.n}/${w.m}` : '—');

  const rows: CompareRow[] = [
    {
      key: 'engineers',
      label: 'Задействовано инженеров',
      ours: withDelta(oursEng, fifoEng, 'engineers'),
      fifo: cell(fifoEng),
      dispatcher: dispMissingCell ?? cell(dispEng),
    },
    {
      key: 'km',
      label: 'Пробег суммарно, км',
      ours: withDelta(oursKm, fifoKm, 'km', km),
      fifo: cell(fifoKm, km),
      dispatcher:
        dispMissingCell ??
        (dispKm == null ? EMPTY : { value: km(dispKm), note: disp?.km_is_estimate ? 'оценка' : undefined }),
    },
    {
      key: 'unassigned',
      label: 'Неназначенные',
      ours: withDelta(oursUn, fifoUn, 'count'),
      fifo: cell(fifoUn),
      dispatcher: dispMissingCell ?? cell(dispUn),
    },
    {
      key: 'inWindow',
      label: 'Начато в окне',
      ours:
        oursWin && hasPlan
          ? {
              value: winText(oursWin),
              delta: fifoWin ? formatDelta(oursWin.n - fifoWin.n, 'count') : undefined,
            }
          : EMPTY,
      fifo: { value: winText(fifoWin) },
      dispatcher: EMPTY,
    },
    {
      key: 'late',
      label: 'Просрочено',
      ours: withDelta(oursLate, fifoLate, 'count'),
      fifo: cell(fifoLate),
      dispatcher: EMPTY,
    },
  ];

  const baselineRoutes = new Map((baseline?.baseline_routes ?? []).map((r) => [r.engineer_id, r]));
  const dispatcherTasks = new Map<string, number>();
  for (const r of model.requests) {
    if (r.dispatcherEngineerId) dispatcherTasks.set(r.dispatcherEngineerId, (dispatcherTasks.get(r.dispatcherEngineerId) ?? 0) + 1);
  }

  const engineers: EngineerKmRow[] = model.engineers.map((e) => {
    const route = model.routeByEngineer.get(e.id);
    const used = (route?.visits.length ?? 0) > 0;
    const fifoRoute = baselineRoutes.get(e.id);
    const fifoKmByEng = kmBy.fifo?.[e.id];
    return {
      engineerId: e.id,
      label: e.label,
      short: e.short,
      color: e.color,
      ours: hasPlan && used ? (kmBy.incremental?.[e.id] ?? route?.distanceKm ?? null) : null,
      fifo: num(fifoRoute ? fifoRoute.distance_km : (fifoKmByEng ?? null)),
      dispatcher: num(kmBy.dispatcher?.[e.id] ?? null),
      tasksOurs: hasPlan ? (route?.taskCount ?? 0) : null,
      tasksFifo: fifoRoute ? fifoRoute.task_count : null,
      tasksDispatcher: dispatcherTasks.get(e.id) ?? 0,
    };
  });
  const maxKm = Math.max(0, ...engineers.flatMap((e) => [e.ours ?? 0, e.fifo ?? 0]));

  return {
    rows,
    note: hasPlan ? NOTE_AFTER_PLAN : NOTE_BEFORE_PLAN,
    dispatcherMissing,
    engineers,
    maxKm,
    hasPlan,
  };
}
