/**
 * Данные экрана инженера (FRONTEND_SPEC §9.1, §9.3): день с опросом 15 с, маршрут для карты и
 * действия. Ответ действия (`day`) сразу кладём в кэш дня; статус визита меняем оптимистично,
 * ошибка — откат и тост с сообщением бэка.
 */
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentVisit, toEngineerDay, withVisitStatus } from '@/adapters/engineerDay';
import { toEngineerRoute } from '@/adapters/engineerRoute';
import { getMyDay, getMyRoute, postAction } from '@/api/engineer';
import { errorMessage, isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { EngineerAction, EngineerActionIn, EngineerMeDay } from '@/api/types';
import { POLL } from '@/config';
import { notify } from '@/lib/notify';
import type { RequestStatus } from '@/lib/statuses';
import { doneToastText, showDoneToast } from './doneToastStore';

export function useEngineerDay() {
  return useQuery({
    queryKey: queryKeys.engineerDay(),
    queryFn: ({ signal }) => getMyDay(signal),
    select: toEngineerDay,
    refetchInterval: POLL.engineer,
  });
}

/** Маршрут по оставшимся точкам (E-04, ссылки в Яндекс Карты). `poll` — пока открыта карта. */
export function useEngineerRoute({ enabled = true, poll = false } = {}) {
  return useQuery({
    queryKey: queryKeys.engineerRoute(),
    queryFn: ({ signal }) => getMyRoute(signal),
    select: toEngineerRoute,
    enabled,
    refetchInterval: poll ? POLL.engineer : false,
  });
}

const ACTION_KEY = ['engineerAction'] as const;

/** Статус визита сразу после нажатия — до ответа бэка. */
const OPTIMISTIC: Partial<Record<EngineerAction, RequestStatus>> = {
  en_route: 'en_route',
  start: 'in_progress',
  complete: 'done',
};

/** Тосты после действий (§9.2): тексты — дословно из ТЗ. */
const SUCCESS_TEXT: Partial<Record<EngineerAction, string>> = {
  fail: 'Отправлено диспетчеру. Можно ехать к следующей заявке',
  incident: 'Сообщили диспетчеру',
  unavailable: 'Сообщили диспетчеру',
};

interface ActionContext {
  previous?: EngineerMeDay;
}

/**
 * Действие инженера. Тосты и тост «Заявка … выполнена» — здесь: они должны появиться, даже если
 * экран с кнопкой уже сменился. `COMMENT_REQUIRED` показывает сама шторка — подсветкой поля.
 */
export function useEngineerAction() {
  const queryClient = useQueryClient();
  const dayKey = queryKeys.engineerDay();

  return useMutation<
    Awaited<ReturnType<typeof postAction>>,
    Error,
    EngineerActionIn,
    ActionContext
  >({
    mutationKey: ACTION_KEY,
    mutationFn: (body) => postAction(body),
    onMutate: async (body) => {
      // идущий опрос не должен затереть ни оптимистичный статус, ни ответ действия
      await queryClient.cancelQueries({ queryKey: dayKey });
      const previous = queryClient.getQueryData<EngineerMeDay>(dayKey);
      const status = OPTIMISTIC[body.action];
      if (previous && status && body.request_id) {
        queryClient.setQueryData(dayKey, withVisitStatus(previous, body.request_id, status));
      }
      return { previous };
    },
    onError: (error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(dayKey, context.previous);
      void queryClient.invalidateQueries({ queryKey: dayKey });
      if (isApiError(error) && error.code === 'COMMENT_REQUIRED') return;
      notify(errorMessage(error), 'error');
    },
    onSuccess: (result, body, context) => {
      const day = result?.day ?? undefined;
      if (day) queryClient.setQueryData(dayKey, day);
      else void queryClient.invalidateQueries({ queryKey: dayKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.engineerRoute() });

      if (body.action === 'complete' && body.request_id) {
        const after = toEngineerDay(
          day ?? context?.previous ?? { engineer: { id: '' }, summary: {} },
        );
        const done = after.visits.find((visit) => visit.id === body.request_id);
        const next = currentVisit({
          visits: after.visits.filter((visit) => visit.id !== body.request_id),
          activeRequestId: after.activeRequestId === body.request_id ? null : after.activeRequestId,
        });
        showDoneToast(doneToastText(body.request_id, done ?? null, next));
      }
      const text = SUCCESS_TEXT[body.action];
      if (text) notify(text, 'success');
    },
  });
}

/** Идёт действие инженера — кнопки статуса неактивны (двойное нажатие исключено). */
export const useActionPending = () => useIsMutating({ mutationKey: ACTION_KEY }) > 0;
