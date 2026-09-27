/** События дня (FRONTEND_SPEC §6.4): все с apply: false, id заявки — order_id. */
import { api } from './client';
import type { EventItem, ReplanResult, UrgentRequestIn } from './types';

type Signal = AbortSignal | undefined;

export type DispatcherEvent =
  | {
      type: 'urgent_order_added';
      plan_id: string;
      event_time?: string;
      request: UrgentRequestIn;
    }
  | {
      type: 'order_cancelled';
      plan_id: string;
      event_time?: string;
      order_id: string;
      params: { reason: 'client_refused' | 'other'; comment?: string };
    }
  | {
      type: 'engineer_unavailable';
      plan_id: string;
      event_time?: string;
      engineer_id: string;
      params?: { reason?: string };
    }
  | {
      type: 'engineer_available';
      plan_id: string;
      event_time?: string;
      engineer_id: string;
    }
  | {
      type: 'transport_changed';
      plan_id: string;
      event_time?: string;
      engineer_id: string;
      params: { transport: string };
    };

export function applyEvent(event: DispatcherEvent) {
  return api.post<ReplanResult>('/events/apply', { ...event, source: 'dispatcher', apply: false });
}

export const listEvents = (scenarioId: string, signal?: Signal) =>
  api.get<EventItem[]>('/events', { query: { scenario_id: scenarioId, limit: 50 }, signal });
