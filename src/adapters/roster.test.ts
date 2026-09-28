import { describe, expect, it } from 'vitest';
import type { EngineerOut, ExtendResourceResponse } from '@/api/types';
import { makeEngineer, makePlan } from './__fixtures__/day';
import { overlayEngineers, overlayModel } from './__fixtures__/dayOverlays';
import {
  commonShift,
  createdEngineerId,
  EMPTY_DRAFT,
  pendingLock,
  resourceAdvice,
  rosterDiff,
  rosterEvent,
  rosterRows,
  setChange,
  transportOptions,
  validateNewEngineer,
  type NewEngineer,
} from './roster';

const model = overlayModel();
const rows = rosterRows(overlayEngineers, model);
const row = (id: string) => rows.find((r) => r.id === id)!;

const newcomer: NewEngineer = {
  key: 'n1',
  name: '  Бригада Иванов ',
  skills: ['emergency'],
  transport: 'car',
  shiftStart: '10:00',
  shiftEnd: '22:00',
};

describe('строки ростера DS-09', () => {
  it('подписи, сокращения навыков, транспорт, смена из данных, «В день»', () => {
    expect(row('e1')).toMatchObject({
      label: 'Бригада Соколов',
      skillChips: ['Лок.', 'Подкл.', 'Авария'],
      transport: 'car',
      shiftText: '10:00–22:00',
      available: true,
      color: model.engineerById.get('e1')!.color,
    });
    expect(row('e5').available).toBe(false);
  });

  it('фактический транспорт важнее справочного; пустые поля не роняют', () => {
    const [changed] = rosterRows(
      [makeEngineer({ id: 'x1', name: 'x1', actual_transport: 'bike' })],
      model,
    );
    expect(changed).toMatchObject({ label: 'Бригада x1', transport: 'bike' });
    expect(
      rosterRows([{ id: 'x2' } as EngineerOut, null as unknown as EngineerOut], model),
    ).toMatchObject([{ id: 'x2', skills: [], skillChips: [], available: true, shiftText: '–' }]);
  });

  it('смена новой бригады — самая частая в ростере; пусто — нет', () => {
    const shifts = [
      { shiftStart: '09:00', shiftEnd: '19:00' },
      { shiftStart: '10:00', shiftEnd: '22:00' },
      { shiftStart: '09:00', shiftEnd: '19:00' },
    ];
    expect(commonShift(shifts)).toEqual({ start: '09:00', end: '19:00' });
    expect(commonShift([])).toBeNull();
  });

  it('варианты транспорта: справочник и незнакомый с бэка', () => {
    expect(transportOptions('car').map((o) => o.label)).toEqual([
      'Автомобиль',
      'Общ. транспорт',
      'Пешком',
      'Велосипед',
    ]);
    expect(transportOptions('scooter').at(-1)).toEqual({ value: 'scooter', label: 'scooter' });
  });
});

describe('черновик и дифф состава', () => {
  it('правка и возврат к исходному значению', () => {
    let draft = setChange(EMPTY_DRAFT, row('e1'), 'transport', 'walk');
    draft = setChange(draft, row('e3'), 'available', false);
    expect(draft.changes).toEqual({ e1: { transport: 'walk' }, e3: { available: false } });
    draft = setChange(draft, row('e1'), 'transport', 'car');
    expect(draft.changes).toEqual({ e3: { available: false } });
  });

  it('PATCH только изменённых полей, POST новых; count — число изменений', () => {
    let draft = setChange(EMPTY_DRAFT, row('e2'), 'transport', 'bike');
    draft = setChange(draft, row('e2'), 'available', false);
    draft = setChange(draft, row('e5'), 'available', true);
    draft = { ...draft, additions: [newcomer] };
    expect(rosterDiff(rows, draft)).toEqual({
      patches: [
        { engineerId: 'e2', patch: { transport: 'bike', available: false } },
        { engineerId: 'e5', patch: { available: true } },
      ],
      additions: [
        {
          name: 'Бригада Иванов',
          skills: ['emergency'],
          transport: 'car',
          shift_start: '10:00',
          shift_end: '22:00',
          start: 'office',
        },
      ],
      count: 4,
    });
  });

  it('после публикации: одно изменение → событие, блокировка остального', () => {
    const planId = 'P1';
    const at = '14:32';
    const transport = setChange(EMPTY_DRAFT, row('e1'), 'transport', 'public_transport');
    expect(rosterEvent(rosterDiff(rows, transport), planId, at)).toEqual({
      type: 'transport_changed',
      plan_id: 'P1',
      event_time: '14:32',
      engineer_id: 'e1',
      params: { transport: 'public_transport' },
    });
    expect(pendingLock(rows, transport)).toEqual({
      kind: 'engineer',
      engineerId: 'e1',
      field: 'transport',
    });

    const off = setChange(EMPTY_DRAFT, row('e2'), 'available', false);
    expect(rosterEvent(rosterDiff(rows, off), planId, at)).toMatchObject({
      type: 'engineer_unavailable',
      engineer_id: 'e2',
    });
    const on = setChange(EMPTY_DRAFT, row('e5'), 'available', true);
    expect(rosterEvent(rosterDiff(rows, on), planId, at)).toMatchObject({
      type: 'engineer_available',
      engineer_id: 'e5',
    });

    const two = setChange(off, row('e1'), 'transport', 'walk');
    expect(rosterEvent(rosterDiff(rows, two), planId, at)).toBeNull();
    expect(pendingLock(rows, { ...EMPTY_DRAFT, additions: [newcomer] })).toEqual({
      kind: 'addition',
    });
    expect(pendingLock(rows, EMPTY_DRAFT)).toBeNull();
  });

  it('id новой бригады — по разнице ростера и имени', () => {
    const before = ['e1', 'e2'];
    const after = [
      makeEngineer({ id: 'e1' }),
      makeEngineer({ id: 'e2' }),
      makeEngineer({ id: 'e9', name: 'Бригада Петров' }),
      makeEngineer({ id: 'e10', name: 'Бригада Иванов' }),
    ];
    expect(createdEngineerId(before, after, 'Бригада Иванов')).toBe('e10');
    expect(createdEngineerId(before, after.slice(0, 3), 'Бригада Иванов')).toBe('e9');
    expect(createdEngineerId(before, after, 'Бригада Сидоров')).toBeNull();
  });

  it('проверка формы добавления', () => {
    expect(validateNewEngineer(newcomer)).toEqual({});
    expect(
      validateNewEngineer({
        ...newcomer,
        name: ' ',
        skills: [],
        shiftStart: '18:00',
        shiftEnd: '10:00',
      }),
    ).toEqual({
      name: 'Укажите имя',
      skills: 'Выберите хотя бы один навык',
      shift: 'Начало смены должно быть раньше окончания',
    });
  });
});

describe('рекомендация «не хватает +N инженера» (extend-resource)', () => {
  const response = (cost: Record<string, unknown> | undefined, closed?: string[]) =>
    ({
      plan: makePlan({ plan_id: 'P5', status: 'proposed' }),
      closed,
      cost,
    }) as unknown as ExtendResourceResponse;

  it('текст из cost: навык по-русски, транспорт — «на автомобиле»; N — закрытые заявки', () => {
    expect(
      resourceAdvice(
        response({ engineers_needed: 1, skills: ['emergency'], transport: 'car' }, ['a', 'b', 'c']),
        4,
      ),
    ).toEqual({
      text: 'Чтобы назначить 3 неназначенные, не хватает +1 инженера с навыком «Аварийные работы» и на автомобиле',
      proposalId: 'P5',
    });
  });

  it('формы слов по числу; несколько навыков; без транспорта; без навыка', () => {
    expect(
      resourceAdvice(response({ engineers_needed: 2, skills: ['local', 'installation'] }), 5).text,
    ).toBe(
      'Чтобы назначить 5 неназначенных, не хватает +2 инженеров с навыками «Локальные работы», «Подключение и дозаказ»',
    );
    expect(resourceAdvice(response({ engineers_needed: 1, transport: 'walk' }), 1).text).toBe(
      'Чтобы назначить 1 неназначенную, не хватает +1 инженера пешком',
    );
  });

  it('пустой cost — «Не удалось рассчитать добор ресурса», без предложения', () => {
    expect(resourceAdvice(response({}), 3)).toEqual({
      text: 'Не удалось рассчитать добор ресурса',
      proposalId: null,
    });
    expect(resourceAdvice(response(undefined), 3).proposalId).toBeNull();
    expect(resourceAdvice(null, 3).text).toBe('Не удалось рассчитать добор ресурса');
  });
});
