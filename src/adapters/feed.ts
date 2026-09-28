/**
 * Лента дня (FRONTEND_SPEC §6.5): строка на событие, новые сверху. Текст — `payload.headline` ⏳,
 * иначе шаблон DESIGN_SPEC §7.3 по типу события со значениями из `payload`.
 */
import {
  AlarmClockOff,
  CalendarPlus,
  Check,
  CircleDot,
  CircleX,
  ClockAlert,
  GitCompareArrows,
  MapPin,
  Timer,
  UserCheck,
  UserX,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { EventItem } from '@/api/types';
import { transportOn } from '@/lib/explainTexts';
import { timeOfIso } from '@/lib/format';
import type { StatusTone } from '@/lib/statuses';
import type { DayChain } from './dayChain';
import type { DayModel } from './dayModel';
import { eventTimeOf } from './proposal';

export interface FeedRow {
  id: string;
  time: string;
  icon: LucideIcon;
  tone: StatusTone;
  text: string;
  chip: { label: string; tone: StatusTone; icon: LucideIcon } | null;
  note: string | null;
  /** «Открыть» / «Решить» → DS-07 по предложению. */
  action: { label: string; planId: string } | null;
  needsDecision: boolean;
  event: EventItem;
}

const ICONS: Record<string, { icon: LucideIcon; tone: StatusTone }> = {
  urgent_order_added: { icon: Zap, tone: 'danger' },
  order_cancelled: { icon: CircleX, tone: 'warning' },
  engineer_unavailable: { icon: UserX, tone: 'warning' },
  engineer_available: { icon: UserCheck, tone: 'success' },
  order_added: { icon: CalendarPlus, tone: 'info' },
  plan_applied: { icon: Check, tone: 'neutral' },
  at_risk: { icon: ClockAlert, tone: 'warning' },
  engineer_delayed: { icon: ClockAlert, tone: 'warning' },
  late: { icon: AlarmClockOff, tone: 'danger' },
  finished_early: { icon: Timer, tone: 'success' },
  manual_reassign: { icon: GitCompareArrows, tone: 'changed' },
  transport_changed: { icon: CircleDot, tone: 'neutral' },
  en_route: { icon: MapPin, tone: 'info' },
  start: { icon: MapPin, tone: 'info' },
  complete: { icon: MapPin, tone: 'success' },
};

const FAIL_REASON: Record<string, string> = {
  client_refused: 'Клиент отказался',
  no_access: 'Нет доступа или техническая причина',
  client_reschedule: 'Клиент просит перенести',
  other: 'Другое',
};

const num = (id: unknown) => {
  const s = String(id ?? '');
  return s.length <= 6 ? s : `…${s.slice(-4)}`;
};

type Labels = Pick<DayModel, 'engineerById' | 'requestById'>;

function engineer(model: Labels, id: unknown): string {
  if (typeof id !== 'string' || !id) return 'Бригада';
  return model.engineerById.get(id)?.label ?? `Бригада ${id}`;
}

function textOf(event: EventItem, model: Labels): string {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const headline = p.headline;
  if (typeof headline === 'string' && headline.trim()) return headline;
  const scenario = (p.scenario ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const order = p.request_id ?? p.order_id;
  const time = eventTimeOf(event);

  switch (event.event_type) {
    case 'urgent_order_added': {
      const urgent = scenario.urgent;
      if (urgent?.engineer_id) {
        const arrival = (urgent.arrival ?? urgent.start) as string | undefined;
        return `Авария №${order} → ${engineer(model, urgent.engineer_id)}${arrival ? `, прибытие ${arrival}` : ''}`;
      }
      const address = model.requestById.get(String(order))?.addressText;
      return `Срочная заявка: Авария №${order}${address && address !== 'Адрес не указан' ? `, ${address}` : ''}`;
    }
    case 'order_cancelled': {
      const reason = typeof p.reason === 'string' ? FAIL_REASON[p.reason] : null;
      if (p.source === 'engineer') {
        const owner = model.requestById.get(String(order))?.engineerId;
        return `${engineer(model, owner)}: «${reason ?? 'Прервано'}» по №${num(order)} — требует решения`;
      }
      return `Отмена №${num(order)}${reason ? `: ${reason.toLowerCase()}` : ''}`;
    }
    case 'engineer_unavailable': {
      const left = Number(scenario.engineer_unavailable?.unassigned_count);
      return `${engineer(model, p.engineer_id)} недоступен${time ? ` с ${time}` : ''}${
        Number.isFinite(left) && left > 0 ? `: ${left} без исполнителя` : ''
      }`;
    }
    case 'engineer_available':
      return `${engineer(model, p.engineer_id)} снова доступен`;
    case 'transport_changed':
      return `${engineer(model, p.engineer_id)} ${transportOn(String(p.transport ?? ''))}`;
    case 'order_added': {
      const added = scenario.order_added;
      const request = model.requestById.get(String(order));
      return added?.engineer_id
        ? `Заявка №${num(order)} встроена к ${engineer(model, added.engineer_id)}${request ? `, окно ${request.windowShort}` : ''}`
        : `Заявка №${num(order)} добавлена`;
    }
    case 'manual_reassign':
      return `№${num(order)} → ${engineer(model, p.to_engineer_id)} вручную`;
    case 'engineer_delayed':
      return `${engineer(model, p.engineer_id)} отстаёт на ${Number(p.delay_min) || 0} мин`;
    case 'finished_early':
      return `${engineer(model, p.engineer_id)} освободился${p.actual_end ? ` в ${p.actual_end}` : ''}`;
    case 'extend_resource':
      return 'Добор ресурса под неназначенные';
    default:
      return `Событие: ${event.event_type}`;
  }
}

export interface FeedInput {
  chain: Pick<DayChain, 'events' | 'planStatus' | 'headPlanId' | 'versions'>;
  model: Labels;
}

export function buildFeed({ chain, model }: FeedInput): FeedRow[] {
  const versionOf = new Map(chain.versions.map((v) => [v.planId, v.version]));
  return chain.events.map((event) => {
    const style = ICONS[event.event_type] ?? { icon: CircleDot, tone: 'neutral' as StatusTone };
    const result = event.result_plan_id ?? null;
    const status = result ? chain.planStatus.get(result) : undefined;
    const actionable = status === 'proposed' && event.plan_id === chain.headPlanId;
    // статус плана знаем — решаем сами (бэк считает «ждёт решения» и при неназначенных в принятом плане)
    const needsDecision = status ? actionable : event.needs_decision && Boolean(result);
    const engineerFail = event.event_type === 'order_cancelled' && event.payload?.source === 'engineer';

    let note: string | null = null;
    if (status === 'applied' || status === 'superseded' || status === 'completed') {
      const version = result ? versionOf.get(result) : undefined;
      note = version ? `Принято · версия ${version}` : 'Принято';
    } else if (status === 'rejected') {
      note = 'Отклонено';
    } else if (status === 'proposed' && !actionable) {
      note = 'Устарело: план уже изменился';
    }

    return {
      id: event.event_id,
      time: eventTimeOf(event) ?? timeOfIso(event.created_at),
      icon: style.icon,
      tone: style.tone,
      text: textOf(event, model),
      chip: needsDecision
        ? engineerFail
          ? { label: 'Отменяется', tone: 'warning', icon: ClockAlert }
          : { label: 'Ждёт решения', tone: 'warning', icon: ClockAlert }
        : null,
      note,
      action: needsDecision && result ? { label: engineerFail ? 'Решить' : 'Открыть', planId: result } : null,
      needsDecision,
      event,
    };
  });
}
