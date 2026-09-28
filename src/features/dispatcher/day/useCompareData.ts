/**
 * Данные «Сравнения» и DS-05: `POST /planning/compare` + `POST /planning/baseline` (FRONTEND_SPEC §6.3).
 * Кэш — на версию плана: расчёт не повторяем при каждом опросе дня.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { comparePlans, getBaseline } from '@/api/planning';
import { queryKeys } from '@/api/queryKeys';
import { buildCompare } from '@/adapters/compare';
import type { DayModel } from '@/adapters/dayModel';

export function useCompareData(model: DayModel | null) {
  const plan = model?.plan ?? null;
  const planId = plan?.plan_id ?? null;
  const scenarioId = model?.scenarioId ?? null;

  const compareQuery = useQuery({
    queryKey: queryKeys.compare(planId ? `plan:${planId}` : `scenario:${scenarioId}`),
    queryFn: () =>
      comparePlans(
        { scenario_id: scenarioId as string, plan_id: planId },
        planId ? ['incremental', 'fifo', 'dispatcher'] : ['fifo', 'dispatcher'],
      ),
    enabled: Boolean(scenarioId),
    staleTime: Infinity,
    retry: false,
  });

  const baselineQuery = useQuery({
    queryKey: queryKeys.baseline(planId ?? '-'),
    queryFn: () => getBaseline(planId as string),
    enabled: Boolean(planId),
    staleTime: Infinity,
    retry: false,
  });

  const compare = useMemo(
    () =>
      model
        ? buildCompare({
            model,
            plan,
            compare: compareQuery.data ?? null,
            baseline: baselineQuery.data ?? null,
          })
        : null,
    [model, plan, compareQuery.data, baselineQuery.data],
  );

  return {
    compare,
    loading: compareQuery.isPending && compareQuery.fetchStatus !== 'idle',
    failed: compareQuery.isError,
  };
}
