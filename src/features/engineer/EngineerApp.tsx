import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  currentVisit,
  hasActiveVisit,
  latestBanner,
  pageState,
  plannedLeft,
  type EngineerBannerModel,
} from '@/adapters/engineerDay';
import { useAuth } from '@/auth/useAuth';
import { searchParam, useSearchState } from '@/hooks/useSearchState';
import { Button } from '@/ui';
import { Placeholder } from '@/pages/Placeholder';
import { DayError, DaySkeleton, NoVisits, PlanNotPublished } from './DayStates';
import { DoneToast } from './DoneToast';
import { EngineerHeader } from './EngineerHeader';
import { EngineerMenu } from './EngineerMenu';
import { EngineerPage } from './EngineerPage';
import { InterruptSheet } from './InterruptSheet';
import { visitPath } from './paths';
import { PlanChangedBanner, UnavailableBanner } from './PlanChangedBanner';
import { PreviewScreen } from './PreviewScreen';
import { isSeen, markSeen, useSeenVersion } from './seen';
import { TransportSheet } from './TransportSheet';
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

/** «Посмотреть» у баннера без заявки — к «Далее по маршруту» (§9.2 E-09). */
function scrollToRoute() {
  window.requestAnimationFrame(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('engineer-next')
      ?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
}

/**
 * `/engineer` — экран инженера по состоянию дня (FRONTEND_SPEC §9.1): загрузка, ошибка, план не
 * опубликован, заявок нет, E-01 до смены, E-03 / E-04 на смене, E-10 после.
 */
export default function EngineerApp() {
  const { user } = useAuth();
  const query = useEngineerDay();
  const [search, setSearch] = useSearchState(engineerSearch);
  const shiftEnd = useEngineerAction();
  const navigate = useNavigate();
  useSeenVersion();
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

  // E-09: самый свежий непросмотренный баннер; «Посмотреть» — карточка заявки или список
  const viewBanner = (banner: EngineerBannerModel) => {
    markSeen(banner.key);
    if (banner.requestId && day.visits.some((visit) => visit.id === banner.requestId)) {
      navigate(visitPath(banner.requestId));
      return;
    }
    setSearch({ view: 'list', sheet: null });
    scrollToRoute();
  };
  const withBanner = state === 'preview' || state === 'shift' || state === 'unavailable';
  const banner = withBanner ? latestBanner(day.banners, isSeen) : null;
  const bannerNode = banner ? (
    <PlanChangedBanner banner={banner} onView={() => viewBanner(banner)} />
  ) : state === 'unavailable' ? (
    <UnavailableBanner availableUntil={day.engineer.availableUntil} />
  ) : null;

  // E-01: действия внизу экрана
  const footer =
    state === 'preview' ? (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        icon={Play}
        onClick={() => openSheet('transport')}
      >
        Начать смену
      </Button>
    ) : null;

  return (
    <EngineerPage header={header} banner={bannerNode} footer={footer} routeColor={routeColor}>
      {state === 'unpublished' && <PlanNotPublished />}
      {state === 'empty' && <NoVisits />}
      {state === 'preview' && <PreviewScreen day={day} />}
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

      {search.sheet === 'transport' && state === 'preview' && (
        <TransportSheet engineer={day.engineer} onClose={closeSheet} />
      )}
      {search.sheet === 'interrupt' && state === 'shift' && current && (
        <InterruptSheet visit={current} dayDate={day.date} onClose={closeSheet} />
      )}
    </EngineerPage>
  );
}
