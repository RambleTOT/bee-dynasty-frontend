import { useAuth } from '@/auth/useAuth';
import { currentVisit, hasActiveVisit, pageState, plannedLeft } from '@/adapters/engineerDay';
import { searchParam, useSearchState } from '@/hooks/useSearchState';
import { Placeholder } from '@/pages/Placeholder';
import { DayError, DaySkeleton, NoVisits, PlanNotPublished } from './DayStates';
import { DoneToast } from './DoneToast';
import { EngineerHeader } from './EngineerHeader';
import { EngineerMenu } from './EngineerMenu';
import { EngineerPage } from './EngineerPage';
import { InterruptSheet } from './InterruptSheet';
import { useEngineerAction, useEngineerDay } from './useEngineerDay';
import { MyVisits } from './VisitList';

/** Вид и открытая шторка — в адресе (§4): `view=list|map`, `sheet=…` (E-02, E-06, E-07, E-08). */
const engineerSearch = {
  view: searchParam.enum(['list', 'map'] as const, 'list'),
  sheet: searchParam.enum([
    'transport',
    'interrupt',
    'incident',
    'unavailable',
    'shift_end',
  ] as const),
};

type Sheet = NonNullable<ReturnType<typeof engineerSearch.sheet.parse>>;

/**
 * `/engineer` — экран инженера по состоянию дня (FRONTEND_SPEC §9.1): загрузка, ошибка, план не
 * опубликован, заявок нет, E-01 до смены, E-03 / E-04 на смене, E-10 после.
 */
export default function EngineerApp() {
  const { user } = useAuth();
  const query = useEngineerDay();
  const [search, setSearch] = useSearchState(engineerSearch);
  const shiftEnd = useEngineerAction();
  const day = query.data;

  const openSheet = (sheet: Sheet) => setSearch({ sheet });
  const closeSheet = () => setSearch({ sheet: null });

  // «Завершить смену» (§9.2): без запланированных — сразу, иначе — подтверждение
  const requestShiftEnd = () => {
    if (!day || hasActiveVisit(day) || shiftEnd.isPending) return;
    if (plannedLeft(day) === 0) shiftEnd.mutate({ action: 'shift_end' });
    else openSheet('shift_end');
  };

  const header = (
    <EngineerHeader
      name={day?.engineer.name ?? user?.name ?? ''}
      menu={
        <EngineerMenu
          day={day}
          onUnavailable={() => openSheet('unavailable')}
          onShiftEnd={requestShiftEnd}
        />
      }
    />
  );

  if (!day) {
    return (
      <EngineerPage header={header}>
        {query.isError ? (
          <DayError onRetry={() => void query.refetch()} retrying={query.isFetching} />
        ) : (
          <DaySkeleton />
        )}
      </EngineerPage>
    );
  }

  const state = pageState(day);
  const routeColor = day.engineer.routeColor;
  const current = currentVisit(day);

  return (
    <EngineerPage header={header} routeColor={routeColor}>
      {state === 'unpublished' && <PlanNotPublished />}
      {state === 'empty' && <NoVisits />}
      {state === 'preview' && <Placeholder id="E-01" title="Превью до начала смены" />}
      {(state === 'shift' || state === 'unavailable') && (
        <MyVisits
          day={day}
          limited={state === 'unavailable'}
          onInterrupt={() => openSheet('interrupt')}
          onIncident={() => openSheet('incident')}
          onShiftEnd={requestShiftEnd}
          shiftEndPending={shiftEnd.isPending}
        />
      )}
      {state === 'finished' && <Placeholder id="E-10" title="Итоги смены" />}
      <DoneToast />

      {search.sheet === 'interrupt' && state === 'shift' && current && (
        <InterruptSheet visit={current} dayDate={day.date} onClose={closeSheet} />
      )}
    </EngineerPage>
  );
}
