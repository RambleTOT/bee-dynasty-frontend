/**
 * DS-07 «Предложение» (FRONTEND_SPEC §6.4): diff новой версии к прежней, счётчики, карточка решения
 * по аварии, «Показать на карте», принять / отклонить / править вручную. `409 STALE_PROPOSAL` —
 * «План уже изменился. Пересчитать?» → повтор того же события. Из «Версий» — режим просмотра.
 */
import { useQuery } from '@tanstack/react-query';
import { Check, Map as MapIcon, Pencil, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DispatcherEvent } from '@/api/events';
import { errorMessage, isApiError } from '@/api/errors';
import { getPlan, getPlanDiff } from '@/api/planning';
import { queryKeys } from '@/api/queryKeys';
import type { DayChain } from '@/adapters/dayChain';
import type { DayModel } from '@/adapters/dayModel';
import { buildFeed } from '@/adapters/feed';
import type { RouteLine } from '@/adapters/geo';
import {
  diffCounters,
  diffGroups,
  eventTimeOf,
  eventTitle,
  metricsLine,
  urgentDecision,
} from '@/adapters/proposal';
import { typeShort } from '@/lib/dictionaries';
import { timeOfIso } from '@/lib/format';
import { isValidLatLng, type LatLng } from '@/lib/map';
import { toMin } from '@/lib/time';
import {
  Button,
  Callout,
  Drawer,
  EmptyState,
  FlagChip,
  Skeleton,
  Spinner,
  UrgentFlag,
  cx,
} from '@/ui';
import type { MapHighlight } from './DayMap';
import type { DayActions } from './useDayActions';
import styles from './Overlays.module.css';

export function ProposalDrawer({
  planId,
  against,
  model,
  chain,
  actions,
  sentEvent,
  onResent,
  onShowOnMap,
  onEditManually,
  onOpenRequest,
  onClose,
}: {
  planId: string;
  /** Режим просмотра из «Версий»: `planId` — прежняя версия, `against` — текущая. */
  against: string | null;
  model: DayModel;
  chain: DayChain;
  actions: DayActions;
  sentEvent: DispatcherEvent | null;
  onResent: (planId: string, event: DispatcherEvent) => void;
  onShowOnMap: (highlight: MapHighlight) => void;
  onEditManually: (orderId: string, basePlanId: string) => void;
  /** Номер заявки в «Что изменится» — её карточка поверх предложения; закрыли — снова предложение. */
  onOpenRequest: (requestId: string) => void;
  onClose: () => void;
}) {
  const viewMode = Boolean(against);
  // в просмотре: что изменилось от выбранной версии к текущей
  const newId = viewMode ? (against as string) : planId;
  const baseId = viewMode ? planId : null;

  const planQuery = useQuery({
    queryKey: queryKeys.plan(newId),
    queryFn: ({ signal }) => getPlan(newId, signal),
    staleTime: 60_000,
  });
  const parentId = baseId ?? planQuery.data?.parent_plan_id ?? null;
  const diffQuery = useQuery({
    queryKey: queryKeys.diff(newId, parentId ?? 'parent'),
    queryFn: ({ signal }) => getPlanDiff(newId, parentId as string, signal),
    enabled: Boolean(parentId),
    staleTime: Infinity,
    retry: false,
  });
  const baseQuery = useQuery({
    queryKey: queryKeys.plan(parentId ?? '-'),
    queryFn: ({ signal }) => getPlan(parentId as string, signal),
    enabled: Boolean(parentId) && parentId !== model.planId,
    staleTime: 60_000,
  });

  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = planQuery.data ?? null;
  const basePlan = parentId === model.planId ? model.plan : (baseQuery.data ?? null);
  const diff = diffQuery.data ?? null;

  const event = useMemo(
    () => chain.events.find((e) => e.result_plan_id === (viewMode ? newId : planId)) ?? null,
    [chain.events, newId, planId, viewMode],
  );
  const feedText = useMemo(() => {
    if (!event) return null;
    return buildFeed({ chain: { ...chain, events: [event] }, model })[0]?.text ?? null;
  }, [event, chain, model]);

  const versionOf = new Map(chain.versions.map((v) => [v.planId, v.version]));
  const status = chain.planStatus.get(planId) ?? plan?.status ?? null;
  const actionable = !viewMode && status === 'proposed' && plan?.parent_plan_id === model.planId;

  const newRoutes = useMemo(() => {
    const byEngineer = new Map<string, string[]>();
    const points = new Map<string, { start: string; end: string; skill: string }>();
    for (const route of plan?.routes ?? []) {
      const sorted = [...(route.route ?? [])].sort((a, b) => a.sequence - b.sequence);
      byEngineer.set(route.engineer_id, sorted.map((p) => p.request_id));
      for (const p of sorted) points.set(p.request_id, { start: p.start, end: p.end, skill: p.required_skill });
    }
    return { byEngineer, points };
  }, [plan]);
  const baseOwner = useMemo(() => {
    const owner = new Map<string, string>();
    for (const route of basePlan?.routes ?? []) for (const p of route.route ?? []) owner.set(p.request_id, route.engineer_id);
    return owner;
  }, [basePlan]);

  // новая бригада (P1-6) есть только в маршрутах предложения
  const names = useMemo(
    () => new Map((plan?.routes ?? []).map((r) => [r.engineer_id, r.engineer_name ?? `Бригада ${r.engineer_id}`])),
    [plan],
  );
  const groups = diff
    ? diffGroups(diff, {
        engineerById: model.engineerById,
        requestById: model.requestById,
        names,
        baseEngineerOf: (id) => baseOwner.get(id) ?? null,
        newOrderOf: (engineerId) => newRoutes.byEngineer.get(engineerId) ?? [],
        requestInfo: (id) => {
          const known = model.requestById.get(id);
          if (known) return { typeShort: known.typeShort, duration: known.durationMinutes };
          const point = newRoutes.points.get(id);
          return point
            ? { typeShort: typeShort(null, point.skill), duration: toMin(point.end) - toMin(point.start) }
            : null;
        },
        engineerOrder: model.engineers.map((e) => e.id),
      })
    : [];
  const counters = diff ? diffCounters(diff.summary) : [];
  const metrics = diff ? metricsLine(diff) : null;

  const payload = (event?.payload ?? {}) as Record<string, unknown>;
  const orderId = String(payload.request_id ?? payload.order_id ?? '') || null;
  const decision =
    !viewMode && event?.event_type === 'urgent_order_added'
      ? urgentDecision(model, payload.scenario as Record<string, unknown>, diff, event ? eventTimeOf(event) : null, orderId)
      : null;

  const title = viewMode
    ? `Версия ${versionOf.get(planId) ?? '—'} → ${versionOf.get(newId) ?? model.version}`
    : `Предложение: ${event ? eventTitle(model, event.event_type, payload) : 'изменение плана'}`;
  const subtitle = viewMode
    ? 'Режим просмотра: что изменилось с выбранной версии'
    : `Версия ${model.version} → ${model.version + 1}${plan?.created_at ? ` · рассчитано в ${timeOfIso(plan.created_at)}` : ''}`;
  const headline = [feedText, diff?.headline].filter(Boolean).join('; ');

  const accept = async () => {
    setError(null);
    try {
      await actions.acceptProposal.mutateAsync({ planId, nextVersion: model.version + 1 });
      onClose();
    } catch (e) {
      if (isApiError(e) && e.code === 'STALE_PROPOSAL') setStale(true);
      else setError(errorMessage(e));
    }
  };

  const resend = async () => {
    if (!sentEvent || !model.planId) return;
    setError(null);
    try {
      const next = { ...sentEvent, plan_id: model.planId } as DispatcherEvent;
      const result = await actions.sendEvent.mutateAsync(next);
      setStale(false);
      onResent(result.plan.plan_id, next);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const reject = async () => {
    setError(null);
    try {
      await actions.rejectProposal.mutateAsync(planId);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const showOnMap = () => {
    const changed = new Set(
      (diff?.engineers ?? []).filter((e) => e.route_changed).map((e) => e.engineer_id),
    );
    const toLine = (engineerId: string, start: LatLng | null, pts: { lat: number; lon: number }[]): RouteLine | null => {
      const points = [start, ...pts.filter((p) => isValidLatLng(p.lat, p.lon)).map((p) => model.transform(p.lat, p.lon))].filter(
        (p): p is LatLng => Boolean(p),
      );
      return points.length >= 2 ? { engineerId, points, road: false } : null;
    };
    const lines: RouteLine[] = [];
    for (const route of plan?.routes ?? []) {
      if (!changed.has(route.engineer_id)) continue;
      const start =
        isValidLatLng(route.start_latitude, route.start_longitude)
          ? model.transform(route.start_latitude as number, route.start_longitude as number)
          : null;
      const sorted = [...(route.route ?? [])].sort((a, b) => a.sequence - b.sequence);
      const line = toLine(route.engineer_id, start, sorted.map((p) => ({ lat: p.latitude, lon: p.longitude })));
      if (line) lines.push(line);
    }
    const ghost: RouteLine[] = [];
    for (const route of basePlan?.routes ?? []) {
      if (!changed.has(route.engineer_id)) continue;
      const start =
        isValidLatLng(route.start_latitude, route.start_longitude)
          ? model.transform(route.start_latitude as number, route.start_longitude as number)
          : null;
      const sorted = [...(route.route ?? [])].sort((a, b) => a.sequence - b.sequence);
      const line = toLine(route.engineer_id, start, sorted.map((p) => ({ lat: p.latitude, lon: p.longitude })));
      if (line) ghost.push(line);
    }
    onShowOnMap({ engineers: changed, lines, ghost, planId: viewMode ? null : planId });
  };

  const editOrder =
    orderId ??
    ((diff?.changes ?? []) as { request_id?: string }[]).find((c) => c.request_id)?.request_id ??
    null;

  const footer = actionable ? (
    <>
      <Button variant="ghost" loading={actions.rejectProposal.isPending} onClick={() => void reject()}>
        Отклонить
      </Button>
      <Button
        variant="tertiary"
        icon={Pencil}
        disabled={!editOrder}
        onClick={() => editOrder && onEditManually(editOrder, planId)}
      >
        Править вручную
      </Button>
      <Button
        variant="primary"
        icon={Check}
        loading={actions.acceptProposal.isPending}
        disabled={stale}
        onClick={() => void accept()}
      >
        Принять изменения
      </Button>
    </>
  ) : undefined;

  const loading = planQuery.isPending || (Boolean(parentId) && diffQuery.isPending);

  return (
    <Drawer open width={560} onClose={onClose} title={title} subtitle={subtitle} footer={footer}>
      {loading ? (
        <>
          <Skeleton height={24} />
          <Skeleton height={32} />
          <Skeleton height={140} />
          <div className={styles.loadingRow}>
            <Spinner size={20} label="Считаем изменения" />
          </div>
        </>
      ) : !diff ? (
        <EmptyState title="Не удалось получить изменения">
          {diffQuery.error ? errorMessage(diffQuery.error) : 'У версии нет базовой для сравнения'}
        </EmptyState>
      ) : (
        <>
          {!viewMode && status && status !== 'proposed' && (
            <Callout tone="neutral">
              {status === 'applied' || status === 'superseded'
                ? 'Предложение уже принято'
                : status === 'rejected'
                  ? 'Предложение отклонено'
                  : `Статус версии: ${status}`}
            </Callout>
          )}
          {!viewMode && status === 'proposed' && plan?.parent_plan_id !== model.planId && !stale && (
            <Callout tone="warning">Предложение считалось от прежней версии плана — его нельзя принять.</Callout>
          )}
          {stale && (
            <Callout
              tone="warning"
              action={
                sentEvent ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RefreshCw}
                    loading={actions.sendEvent.isPending}
                    onClick={() => void resend()}
                  >
                    Пересчитать
                  </Button>
                ) : undefined
              }
            >
              План уже изменился. Пересчитать?
              {!sentEvent && ' Отклоните предложение и добавьте событие заново.'}
            </Callout>
          )}
          {error && <Callout tone="danger">{error}</Callout>}

          {headline && <p className={styles.headline}>{headline.charAt(0).toUpperCase() + headline.slice(1)}</p>}
          <div className={styles.counters}>
            {counters.map((c) => (
              <span key={c.key} className={cx(styles.counter, c.n === 0 && styles.counterZero)}>
                {c.label}
                <b>{c.n}</b>
              </span>
            ))}
          </div>

          {decision && (
            <div className={styles.decision}>
              <div className={styles.decisionHead}>
                <UrgentFlag size="sm" />
                <span className={styles.decisionTitle}>
                  {decision.engineerId
                    ? `${decision.engineerLabel} — прибытие ${decision.arrival ?? decision.start ?? '—'}${
                        decision.reactionMin != null ? `, реакция ${decision.reactionMin} мин` : ''
                      }`
                    : 'Аварию не удалось назначить: подходящей бригады нет'}
                </span>
                {decision.late && <FlagChip flag="reaction_late" size="sm" />}
              </div>
              {decision.engineerId && (
                <div className={styles.caption}>
                  Выбрана бригада, которая приедет раньше всех. Текущую работу не прерываем.
                </div>
              )}
            </div>
          )}

          <h3 className={styles.h3}>Что изменится</h3>
          {groups.length === 0 ? (
            <div className={styles.caption}>Назначения не меняются</div>
          ) : (
            groups.map((group) => (
              <div key={group.engineerId ?? '-'} className={styles.group}>
                <div className={styles.groupHead}>
                  <span
                    className={cx(styles.dot, group.color ? styles[`c${group.color.index}`] : styles.dotMuted)}
                    aria-hidden
                  />
                  {group.label}
                </div>
                {group.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className={styles.diffItem}>
                      <span className={cx(styles.diffIcon, styles[`tone_${item.tone}`])}>
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className={styles.diffKind}>{item.label}</span>
                      <span className={styles.diffText}>
                        {item.parts.map((part, partIndex) =>
                          typeof part === 'string' ? (
                            part
                          ) : (
                            <button
                              key={partIndex}
                              type="button"
                              className={styles.requestLink}
                              title="Открыть заявку"
                              onClick={() => onOpenRequest(part.requestId)}
                            >
                              {part.label}
                            </button>
                          ),
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          <div className={styles.metricsBar}>
            <span>{metrics ?? ''}</span>
            <Button variant="secondary" size="sm" icon={MapIcon} onClick={showOnMap}>
              Показать на карте
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
