/** Переходы между экранами оператора (FRONTEND_SPEC §8.3.3). */
import type { BookingItem } from '@/adapters/booking';

/** Состояние перехода в перенос: заявка уже найдена — второй раз не ищем; `q` — чтобы вернуться. */
export interface RescheduleState {
  item: BookingItem;
  q: string;
}

export const rescheduleUrl = (requestId: string) =>
  `/operator/reschedule/${encodeURIComponent(requestId)}`;

/**
 * O-02 с выбранной заявкой: `/operator?request=<id>`. Строку поиска возвращаем, если она была [Д]:
 * тогда слева снова тот же список.
 */
export function searchUrl(requestId: string, q?: string | null): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('request', requestId);
  return `/operator?${params.toString()}`;
}

/** Заявку не нашли по номеру — в поиск с этим номером. */
export const searchByIdUrl = (requestId: string) =>
  `/operator?${new URLSearchParams({ q: requestId }).toString()}`;
