import { describe, expect, it } from 'vitest';
import { makeEvent, makePlanItem, makeRegion } from './__fixtures__/day';
import { resolveDayChain } from './dayChain';

const region = makeRegion({ active_plan_id: 'P1', plan_state: 'applied', version: 1 });

describe('resolveDayChain', () => {
  it('без событий — голова = активный план дня', () => {
    const chain = resolveDayChain(region, [], [makePlanItem({ plan_id: 'P1' })]);
    expect(chain.headPlanId).toBe('P1');
    expect(chain.version).toBe(1);
    expect(chain.versions.map((v) => v.planId)).toEqual(['P1']);
    expect(chain.pendingProposals).toEqual([]);
  });

  it('принятое предложение из производного сценария становится головой, версия +1', () => {
    const events = [
      makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2', created_at: '2026-09-28T10:00:00Z' }),
      makeEvent({ event_id: 'E2', plan_id: 'P2', scenario_id: 'S1', result_plan_id: 'P3', created_at: '2026-09-28T11:00:00Z' }),
    ];
    const plans = [
      makePlanItem({ plan_id: 'P1', status: 'superseded' }),
      makePlanItem({ plan_id: 'P2', scenario_id: 'S1', status: 'applied' }),
      makePlanItem({ plan_id: 'P3', scenario_id: 'S2', status: 'proposed' }),
    ];
    const chain = resolveDayChain(region, events, plans);
    expect(chain.headPlanId).toBe('P2');
    expect(chain.version).toBe(2);
    expect(chain.versions.map((v) => [v.planId, v.version])).toEqual([
      ['P2', 2],
      ['P1', 1],
    ]);
    expect(chain.versions[0].event?.event_id).toBe('E1');
    // предложение к голове ждёт решения, хотя /days его не видит
    expect(chain.pendingProposals).toEqual([
      expect.objectContaining({ plan_id: 'P3', event_id: 'E2', event_type: 'urgent_order_added' }),
    ]);
    // лента — события всех версий, новые сверху
    expect(chain.events.map((e) => e.event_id)).toEqual(['E2', 'E1']);
  });

  it('отклонённое предложение не двигает голову и не ждёт решения', () => {
    const events = [makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2' })];
    const plans = [makePlanItem({ plan_id: 'P1' }), makePlanItem({ plan_id: 'P2', status: 'rejected' })];
    const chain = resolveDayChain(region, events, plans);
    expect(chain.headPlanId).toBe('P1');
    expect(chain.pendingProposals).toEqual([]);
  });

  it('предложение к устаревшей версии не показываем', () => {
    const events = [
      makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2' }),
      makeEvent({ event_id: 'E2', plan_id: 'P1', result_plan_id: 'P3' }),
    ];
    const plans = [
      makePlanItem({ plan_id: 'P1', status: 'superseded' }),
      makePlanItem({ plan_id: 'P2', status: 'applied' }),
      makePlanItem({ plan_id: 'P3', status: 'proposed' }),
    ];
    expect(resolveDayChain(region, events, plans).pendingProposals).toEqual([]);
  });

  it('черновик дня из записей оператора', () => {
    const chain = resolveDayChain(
      makeRegion({ draft_plan_id: 'D1', plan_state: 'draft' }),
      [],
      [makePlanItem({ plan_id: 'D1', status: 'draft' })],
    );
    expect(chain.headPlanId).toBe('D1');
    expect(chain.version).toBe(0);
    expect(chain.versions).toEqual([]);
  });

  it('плана нет', () => {
    const chain = resolveDayChain(makeRegion(), [], []);
    expect(chain.headPlanId).toBeNull();
    expect(chain.version).toBe(0);
  });

  it('предложения, которые бэк отдал сам, не дублируются', () => {
    const events = [makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2' })];
    const plans = [makePlanItem({ plan_id: 'P1' }), makePlanItem({ plan_id: 'P2', status: 'proposed' })];
    const chain = resolveDayChain(
      { ...region, pending_proposals: [{ plan_id: 'P2', event_id: 'E1', headline: 'Предложение ждёт решения' }] },
      events,
      plans,
    );
    expect(chain.pendingProposals).toHaveLength(1);
  });

  it('событие plan_applied первой версии (петля P1 → P1) не обрывает цепочку', () => {
    const events = [
      makeEvent({ event_id: 'A1', event_type: 'plan_applied', plan_id: 'P1', result_plan_id: 'P1', created_at: '2026-09-28T09:00:00Z' }),
      makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2', created_at: '2026-09-28T10:00:00Z' }),
      makeEvent({ event_id: 'A2', event_type: 'plan_applied', plan_id: 'P1', result_plan_id: 'P2', created_at: '2026-09-28T10:05:00Z' }),
    ];
    const plans = [makePlanItem({ plan_id: 'P1', status: 'superseded' }), makePlanItem({ plan_id: 'P2', status: 'applied' })];
    const chain = resolveDayChain(region, events, plans);
    expect(chain.headPlanId).toBe('P2');
    expect(chain.versions[0].event?.event_id).toBe('E1');
  });

  it('бэк с правкой п. 3 отдаёт голову сам — прежние версии находим назад по событиям', () => {
    const events = [
      makeEvent({ event_id: 'A1', event_type: 'plan_applied', plan_id: 'P1', result_plan_id: 'P1', created_at: '2026-09-28T09:00:00Z' }),
      makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2', created_at: '2026-09-28T10:00:00Z' }),
      makeEvent({ event_id: 'A2', event_type: 'plan_applied', plan_id: 'P1', result_plan_id: 'P2', created_at: '2026-09-28T10:05:00Z' }),
      makeEvent({ event_id: 'E2', plan_id: 'P2', scenario_id: 'S1', result_plan_id: 'P3', created_at: '2026-09-28T11:00:00Z' }),
      makeEvent({ event_id: 'E3', plan_id: 'P3', scenario_id: 'S2', result_plan_id: 'P4', created_at: '2026-09-28T12:00:00Z' }),
    ];
    const plans = [
      makePlanItem({ plan_id: 'P1', status: 'superseded', version: 1 }),
      makePlanItem({ plan_id: 'P2', scenario_id: 'S1', status: 'superseded', version: 2 }),
      // номер 4: третий занял отклонённое предложение (BACKEND_REQUESTS п. 20)
      makePlanItem({ plan_id: 'P3', scenario_id: 'S2', status: 'applied', version: 4 }),
      makePlanItem({ plan_id: 'P4', scenario_id: 'S3', status: 'proposed', version: 5 }),
    ];
    const chain = resolveDayChain(
      makeRegion({ active_plan_id: 'P3', plan_state: 'applied', version: 4 }),
      events,
      plans,
    );
    expect(chain.headPlanId).toBe('P3');
    expect(chain.version).toBe(3);
    expect(chain.versions.map((v) => [v.planId, v.version, v.event?.event_id ?? null])).toEqual([
      ['P3', 3, 'E2'],
      ['P2', 2, 'E1'],
      ['P1', 1, null],
    ]);
    expect(chain.pendingProposals.map((p) => p.plan_id)).toEqual(['P4']);
    // лента — события всех версий, не только головы
    expect(chain.events.map((e) => e.event_id)).toEqual(['E3', 'E2', 'A2', 'E1', 'A1']);
  });

  it('без событий до головы — номер из /days', () => {
    const chain = resolveDayChain(
      makeRegion({ active_plan_id: 'P3', plan_state: 'applied', version: 3 }),
      [],
      [makePlanItem({ plan_id: 'P3', scenario_id: 'S2', status: 'applied' })],
    );
    expect(chain.version).toBe(3);
    expect(chain.versions.map((v) => v.version)).toEqual([3]);
  });

  it('цикл в данных не зацикливает', () => {
    const events = [
      makeEvent({ event_id: 'E1', plan_id: 'P1', result_plan_id: 'P2' }),
      makeEvent({ event_id: 'E2', plan_id: 'P2', result_plan_id: 'P1' }),
    ];
    const plans = [makePlanItem({ plan_id: 'P1' }), makePlanItem({ plan_id: 'P2' })];
    expect(resolveDayChain(region, events, plans).headPlanId).toBe('P2');
  });
});
