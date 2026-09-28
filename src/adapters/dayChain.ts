/**
 * Цепочка версий дня. На бэке 28.09 версии после события живут в производных сценариях: `/days`
 * по-прежнему отдаёт первую применённую версию и не видит предложений к следующим
 * (docs/API_NOTES.md). Поэтому голову цепочки находим сами: от `active_plan_id` дня идём по событиям
 * (`plan_id` → `result_plan_id`) к применённым версиям. Если бэк начнёт отдавать голову сам,
 * цепочка просто окажется из одной версии.
 */
import type { DayRegion, EventItem, PendingProposal, PlanListItem } from '@/api/types';

const LIVE_STATUSES = new Set(['applied', 'completed']);
const MAX_DEPTH = 100;

export interface DayVersion {
  planId: string;
  /** Номер по порядку: первая применённая версия дня — 1. */
  version: number;
  createdAt: string | null;
  status: string;
  engineersUsed: number | null;
  plannedCount: number | null;
  distanceKm: number | null;
  /** Событие, которое породило версию; у первой — нет. */
  event: EventItem | null;
}

export interface DayChain {
  /** Действующая версия (или черновик дня из записей оператора). */
  headPlanId: string | null;
  /** Номер действующей версии; 0 — плана нет или он не опубликован. */
  version: number;
  /** Применённые версии, новые сверху. */
  versions: DayVersion[];
  /** Предложения к действующей версии, ждущие решения. */
  pendingProposals: PendingProposal[];
  /** События дня — по всем версиям цепочки, новые сверху. */
  events: EventItem[];
  /** Статусы известных планов: ленте нужно знать, ждёт ли предложение решения. */
  planStatus: ReadonlyMap<string, string>;
}

function time(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

const newestFirst = (a: EventItem, b: EventItem) => time(b.created_at) - time(a.created_at);

function headlineOf(event: EventItem): string | null {
  const headline = event.payload?.headline;
  return typeof headline === 'string' && headline.trim() ? headline : null;
}

export function resolveDayChain(
  region: Pick<
    DayRegion,
    'scenario_id' | 'active_plan_id' | 'draft_plan_id' | 'plan_state' | 'version' | 'pending_proposals'
  >,
  events: readonly EventItem[],
  plans: readonly PlanListItem[],
): DayChain {
  const planStatus = new Map(plans.map((p) => [p.plan_id, p.status]));
  const planById = new Map(plans.map((p) => [p.plan_id, p]));
  const byBase = new Map<string, EventItem[]>();
  for (const event of events) {
    if (!event.plan_id) continue;
    const list = byBase.get(event.plan_id) ?? [];
    list.push(event);
    byBase.set(event.plan_id, list);
  }

  const root = region.active_plan_id ?? null;
  const draft = region.draft_plan_id ?? null;
  const chain: { planId: string; event: EventItem | null }[] = [];

  if (root) {
    chain.push({ planId: root, event: null });
    const visited = new Set([root]);
    let head = root;
    for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
      // `plan_applied` первой версии ссылается сам на себя — петли и пройденные версии пропускаем
      const next = (byBase.get(head) ?? [])
        .filter(
          (e) =>
            e.result_plan_id &&
            !visited.has(e.result_plan_id) &&
            LIVE_STATUSES.has(planStatus.get(e.result_plan_id) ?? ''),
        )
        .sort((a, b) => Number(a.event_type === 'plan_applied') - Number(b.event_type === 'plan_applied') || newestFirst(a, b))[0];
      if (!next?.result_plan_id) break;
      head = next.result_plan_id;
      visited.add(head);
      chain.push({ planId: head, event: next });
    }
  }

  const headPlanId = chain.at(-1)?.planId ?? draft;
  const firstVersion = Math.max(1, Number(region.version) || 1);
  const version = root ? firstVersion + chain.length - 1 : 0;

  const versions: DayVersion[] = chain
    .map(({ planId, event }, index) => {
      const item = planById.get(planId);
      return {
        planId,
        version: firstVersion + index,
        createdAt: item?.created_at ?? event?.created_at ?? null,
        status: item?.status ?? (index === chain.length - 1 ? 'applied' : 'superseded'),
        engineersUsed: item?.engineers_used ?? null,
        plannedCount: item?.planned_count ?? null,
        distanceKm: item?.total_distance_km ?? null,
        event,
      };
    })
    .reverse();

  // предложения к голове: из событий (бэк их не видит) + то, что бэк отдал сам
  const pendingProposals: PendingProposal[] = [];
  const seen = new Set<string>();
  if (root && headPlanId) {
    for (const event of [...(byBase.get(headPlanId) ?? [])].sort(newestFirst)) {
      const planId = event.result_plan_id;
      if (!planId || seen.has(planId) || planStatus.get(planId) !== 'proposed') continue;
      seen.add(planId);
      pendingProposals.push({
        plan_id: planId,
        event_id: event.event_id,
        event_type: event.event_type,
        headline: headlineOf(event),
        created_at: event.created_at,
      });
    }
  }
  for (const proposal of region.pending_proposals ?? []) {
    if (seen.has(proposal.plan_id)) continue;
    if (planStatus.has(proposal.plan_id) && planStatus.get(proposal.plan_id) !== 'proposed') continue;
    seen.add(proposal.plan_id);
    pendingProposals.push(proposal);
  }

  const chainIds = new Set(chain.map((c) => c.planId));
  if (draft) chainIds.add(draft);
  const dayEvents = events
    .filter(
      (e) =>
        (e.plan_id && chainIds.has(e.plan_id)) ||
        (region.scenario_id && e.scenario_id === region.scenario_id),
    )
    .filter((e, i, list) => list.findIndex((x) => x.event_id === e.event_id) === i)
    .sort(newestFirst);

  return { headPlanId, version, versions, pendingProposals, events: dayEvents, planStatus };
}
