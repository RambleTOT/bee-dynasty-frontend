import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, type CSSProperties } from 'react';
import {
  buildCalendarMonth,
  calendarRange,
  calendarSummary,
  summaryRegionCount,
} from '@/adapters/calendar';
import { getCalendar } from '@/api/calendar';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/auth/useAuth';
import { POLL } from '@/config';
import { useSearchState } from '@/hooks/useSearchState';
import { BK } from '@/lib/dictionaries';
import { formatMonthTitle } from '@/lib/format';
import { addMonths, monthGrid, monthOf, todayMsk } from '@/lib/time';
import { Button, cx, ErrorState, FilterPill, IconButton } from '@/ui';
import { ImportModal } from '../import/ImportModal';
import {
  ALL,
  calendarSearch,
  dayPath,
  REGION_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from './calendarSearch';
import { MonthGrid, SkeletonGrid, WeekdayHeader } from './MonthGrid';
import { regionsQuery } from './regionsQuery';
import styles from './CalendarPage.module.css';
import tones from './tones.module.css';

/**
 * DS-01 «Календарь заявок» — главный экран диспетчера (FRONTEND_SPEC §8.2): месяц, фильтры в адресе,
 * опрос раз в 30 с, клик по дню — в DS-03. `modal=import` открывает DS-02.
 */
export default function CalendarPage() {
  const [search, setSearch] = useSearchState(calendarSearch);
  const { user } = useAuth();
  const today = todayMsk();
  const currentMonth = monthOf(today);
  const month = search.month ?? currentMonth;
  const { region, status, type } = search;

  const calendar = useQuery({
    queryKey: queryKeys.calendar(month, {
      region,
      status: status ?? undefined,
      type: type ?? undefined,
    }),
    queryFn: ({ signal }) =>
      getCalendar(
        {
          ...calendarRange(month),
          region_id: region,
          status: status ?? undefined,
          type_bk: type ? BK[type] : undefined,
        },
        signal,
      ),
    refetchInterval: POLL.calendar,
  });
  const regions = useQuery(regionsQuery);

  const model = useMemo(
    () => (calendar.data ? buildCalendarMonth(month, calendar.data, today) : null),
    [calendar.data, month, today],
  );

  const userRegions = user?.region_ids;
  const dayHref = useCallback(
    (date: string) => dayPath(date, region, userRegions),
    [region, userRegions],
  );

  const goToMonth = (next: string) => setSearch({ month: next === currentMonth ? null : next });
  const filtered = region !== 'all' || status !== null || type !== null;
  const loadError = calendar.isError && !calendar.data ? calendar.error : null;
  const gridDays = monthGrid(month).length;

  return (
    <div className={styles.page} style={{ '--weeks': gridDays / 7 } as CSSProperties}>
      <div className={styles.header}>
        <h1 className={styles.title}>Календарь заявок</h1>
        <div className={styles.monthNav}>
          <IconButton
            icon={ChevronLeft}
            label="Предыдущий месяц"
            variant="secondary"
            size="sm"
            onClick={() => goToMonth(addMonths(month, -1))}
          />
          <span className={styles.monthTitle}>{formatMonthTitle(month)}</span>
          <IconButton
            icon={ChevronRight}
            label="Следующий месяц"
            variant="secondary"
            size="sm"
            onClick={() => goToMonth(addMonths(month, 1))}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => goToMonth(currentMonth)}>
          Сегодня
        </Button>
        <span className={styles.spacer} />
        {model && (
          <span className={styles.summary}>
            {calendarSummary(model.total, summaryRegionCount(region, regions.data))}
          </span>
        )}
      </div>

      <div className={styles.toolbar}>
        <FilterPill
          label="Регион"
          options={REGION_OPTIONS}
          value={region}
          allValue="all"
          onChange={(value) => setSearch({ region: value })}
        />
        <FilterPill
          label="Статус"
          options={STATUS_OPTIONS}
          value={status ?? ALL}
          allValue={ALL}
          onChange={(value) => setSearch({ status: value === ALL ? null : value })}
        />
        <FilterPill
          label="Тип заявки"
          options={TYPE_OPTIONS}
          value={type ?? ALL}
          allValue={ALL}
          onChange={(value) => setSearch({ type: value === ALL ? null : value })}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={!filtered}
          onClick={() => setSearch({ region: 'all', status: null, type: null })}
        >
          Сбросить
        </Button>
        <span className={styles.spacer} />
        {model && model.legend.length > 0 && (
          <ul className={styles.legend} aria-label="Статусы в полосе">
            {model.legend.map((item) => (
              <li key={item.status} className={styles.legendItem}>
                <span className={cx(styles.swatch, tones[item.tone])} aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <WeekdayHeader />
      <div className={styles.gridArea}>
        {model ? (
          <MonthGrid model={model} dayHref={dayHref} />
        ) : loadError ? (
          <div className={styles.errorPanel}>
            <ErrorState
              message={
                isApiError(loadError) && loadError.status !== 0 ? loadError.message : undefined
              }
              onRetry={() => void calendar.refetch()}
              retrying={calendar.isFetching}
            />
          </div>
        ) : (
          <SkeletonGrid cells={gridDays} />
        )}
      </div>

      {search.modal === 'import' && (
        <ImportModal
          initialDate={search.date}
          onClose={() => setSearch({ modal: null, date: null })}
        />
      )}
    </div>
  );
}
