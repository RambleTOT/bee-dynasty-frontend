import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRegions } from '@/api/data';
import type { RegionOut } from '@/api/types';
import { hookWrapper, TEST_OPERATOR } from './testUtils';
import { REGION_STORAGE_KEY, useOperatorRegion } from './useOperatorRegion';

vi.mock('@/api/data', () => ({ getRegions: vi.fn() }));

const region = (region_id: string, name: string): RegionOut => ({
  region_id,
  name,
  office: { address: '', lat: 0, lon: 0 },
  request_count: 0,
  engineer_count: 0,
  demo_available: false,
  has_control: false,
});

beforeEach(() => {
  window.sessionStorage.clear();
  vi.mocked(getRegions).mockResolvedValue([
    region('east', 'Восток'),
    region('south_east', 'Юго-восток'),
    region('south_center', 'Югоцентр'),
  ]);
});

describe('useOperatorRegion', () => {
  it('только регионы пользователя, по порядку; по умолчанию — первый', async () => {
    const user = { ...TEST_OPERATOR, region_ids: ['south_center', 'east'] };
    const { result } = renderHook(() => useOperatorRegion(), { wrapper: hookWrapper(user) });
    expect(result.current.regions.map((item) => item.id)).toEqual(['east', 'south_center']);
    expect(result.current.region).toBe('east');
    await waitFor(() => expect(getRegions).toHaveBeenCalled());
    expect(result.current.nameOf('south_center')).toBe('Югоцентр');
  });

  it('последний выбранный — из sessionStorage, выбор запоминается', () => {
    window.sessionStorage.setItem(REGION_STORAGE_KEY, 'south_east');
    const { result } = renderHook(() => useOperatorRegion(), { wrapper: hookWrapper() });
    expect(result.current.region).toBe('south_east');
    act(() => result.current.setRegion('south_center'));
    expect(result.current.region).toBe('south_center');
    expect(window.sessionStorage.getItem(REGION_STORAGE_KEY)).toBe('south_center');
  });

  it('сохранённый регион не из списка пользователя — первый из списка', () => {
    window.sessionStorage.setItem(REGION_STORAGE_KEY, 'east');
    const user = { ...TEST_OPERATOR, region_ids: ['south_east'] };
    const { result } = renderHook(() => useOperatorRegion(), { wrapper: hookWrapper(user) });
    expect(result.current.regions).toEqual([{ id: 'south_east', name: 'Юго-восток' }]);
    expect(result.current.region).toBe('south_east');
  });
});
