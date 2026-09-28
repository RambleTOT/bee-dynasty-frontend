/**
 * Живые обновления для вошедшего пользователя (docs/REALTIME.md): сокет открывается после входа,
 * закрывается при выходе. Событие → обновление запросов пачкой и, если нужно, тост с «Открыть».
 * Флаг `realtime` выключен (бэк ещё не сделал п. 38) — провайдер ничего не делает, работает опрос.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRealtimeTicket, realtimeUrl } from '@/api/realtime';
import { useAuth } from '@/auth/useAuth';
import { FEATURES } from '@/config';
import { notify } from '@/lib/notify';
import { RealtimeClient, type RealtimeStatus } from './client';
import { effectsFor, RESYNC_KEYS } from './effects';
import { createInvalidationBatch } from './invalidationBatch';
import { RealtimeContext } from './useRealtime';

export function RealtimeProvider({
  children,
  enabled = FEATURES.realtime,
}: {
  children: ReactNode;
  /** Для тестов; в приложении — флаг `realtime`. */
  enabled?: boolean;
}) {
  const { status: auth, role, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!enabled || auth !== 'authenticated' || !role || !userId) return;
    const batch = createInvalidationBatch(queryClient);
    const client = new RealtimeClient({
      getTicket: getRealtimeTicket,
      url: (ticket, since) => realtimeUrl(ticket, since),
      onEvent: (event) => {
        const { invalidate, notice } = effectsFor(event, role);
        batch.add(invalidate);
        if (!notice) return;
        const link = notice.link;
        notify(notice.text, notice.kind, {
          description: notice.description,
          persistent: notice.persistent,
          action: link ? { label: 'Открыть', onClick: () => navigateRef.current(link) } : undefined,
        });
      },
      onResync: () => batch.add(RESYNC_KEYS),
      onStatus: setStatus,
    });
    client.start();
    // сеть вернулась — переподключаемся сразу, не дожидаясь паузы
    const online = () => client.reconnectNow();
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      client.stop();
      batch.cancel();
      setStatus('idle');
    };
  }, [enabled, auth, role, userId, queryClient]);

  return <RealtimeContext.Provider value={status}>{children}</RealtimeContext.Provider>;
}
