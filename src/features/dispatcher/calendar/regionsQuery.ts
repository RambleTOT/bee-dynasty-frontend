import { queryOptions } from '@tanstack/react-query';
import { getRegions } from '@/api/data';
import { queryKeys } from '@/api/queryKeys';

/**
 * `GET /regions`: число регионов в итоге календаря и «N бригад» в карточках импорта (DS-01, DS-02).
 * Справочник меняется редко — не перезапрашиваем чаще раза в 5 минут.
 */
export const regionsQuery = queryOptions({
  queryKey: queryKeys.regions,
  queryFn: ({ signal }) => getRegions(signal),
  staleTime: 5 * 60_000,
});
