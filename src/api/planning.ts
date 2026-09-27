/** Планирование: расчёт, версии, diff, сравнение, FIFO, переназначение, ресурсы (FRONTEND_SPEC §5.3). */
import { api } from './client';
import type {
  BaselineResponse,
  CompareResponse,
  ExtendResourceResponse,
  PlanDiffResponse,
  PlanListResponse,
  PlanRequestDetails,
  PlanResponse,
  PlanVersionResponse,
  ReassignCheckResponse,
  ReplanResult,
} from './types';

type Signal = AbortSignal | undefined;

/** «Построить план»: расчёт (для CSV-дня затем сразу apply, D-25). */
export const runPlan = (scenarioId: string) =>
  api.post<PlanResponse>('/planning/run', {
    scenario_id: scenarioId,
    seed: 42,
    include_baseline: true,
  });

export const getPlan = (planId: string, signal?: Signal) =>
  api.get<PlanResponse>(`/planning/${planId}`, { signal });

export const listPlans = (scenarioId: string, signal?: Signal) =>
  api.get<PlanListResponse>('/planning', { query: { scenario_id: scenarioId }, signal });

export const applyPlan = (planId: string) =>
  api.post<PlanVersionResponse>(`/planning/${planId}/apply`);

export const rejectPlan = (planId: string) =>
  api.post<PlanVersionResponse>(`/planning/${planId}/reject`);

export const getPlanDiff = (planId: string, againstId: string, signal?: Signal) =>
  api.get<PlanDiffResponse>(`/planning/${planId}/diff`, { query: { against: againstId }, signal });

export type CompareStrategy = 'ours' | 'fifo' | 'dispatcher';

export const comparePlans = (
  target: { plan_id: string } | { scenario_id: string },
  strategies: CompareStrategy[],
) => api.post<CompareResponse>('/planning/compare', { ...target, strategies });

/** Базовый FIFO — только ради `baseline_routes` (FRONTEND_SPEC §6.3). */
export const getBaseline = (planId: string) =>
  api.post<BaselineResponse>('/planning/baseline', { plan_id: planId });

export const getPlanRequest = (planId: string, requestId: string, signal?: Signal) =>
  api.get<PlanRequestDetails>(`/planning/${planId}/requests/${encodeURIComponent(requestId)}`, {
    signal,
  });

export interface ReassignBody {
  order_id: string;
  to_engineer_id: string;
  position?: number | null;
  force?: boolean;
}

export const checkReassign = (planId: string, body: ReassignBody, signal?: Signal) =>
  api.post<ReassignCheckResponse>(
    `/planning/${planId}/reassign/check`,
    { ...body, force: body.force ?? false },
    { signal },
  );

export const reassign = (planId: string, body: ReassignBody) =>
  api.post<ReplanResult>(`/planning/${planId}/reassign`, { ...body, force: body.force ?? false });

/** Рекомендация «не хватает +N инженера»: только расчёт, план не меняем (`apply: false`). */
export const extendResource = (planId: string, orderIds: string[]) =>
  api.post<ExtendResourceResponse>(`/planning/${planId}/extend-resource`, {
    order_ids: orderIds,
    option: 'add_engineer',
    apply: false,
  });
