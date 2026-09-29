import { describe, expect, it } from 'vitest';
import { lookupOf, parseSuggestions } from './address';

const feature = (properties: Record<string, unknown>, coordinates: unknown = [37.61, 55.76]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties,
});

describe('parseSuggestions — подсказки адресов', () => {
  it('дом, улица и место; в поле — город и адрес', () => {
    const list = parseSuggestions({
      type: 'FeatureCollection',
      features: [
        feature({
          osm_type: 'R',
          osm_id: 451292,
          type: 'house',
          name: 'Центральный телеграф',
          street: 'Тверская улица',
          housenumber: '7',
          district: 'Тверской',
          city: 'Москва',
        }),
        feature({ osm_type: 'W', osm_id: 1, type: 'street', name: 'Тверская улица', city: 'Москва' }),
        feature({ osm_type: 'N', osm_id: 2, type: 'house', name: 'Химки', state: 'Московская область' }, [37.43, 55.89]),
      ],
    });
    expect(list).toEqual([
      {
        id: 'R451292',
        title: 'Тверская улица, 7',
        subtitle: 'Москва, Тверской, Центральный телеграф',
        value: 'Москва, Тверская улица, 7',
        lat: 55.76,
        lon: 37.61,
      },
      { id: 'W1', title: 'Тверская улица', subtitle: 'Москва', value: 'Москва, Тверская улица', lat: 55.76, lon: 37.61 },
      { id: 'N2', title: 'Химки', subtitle: 'Московская область', value: 'Московская область, Химки', lat: 55.89, lon: 37.43 },
    ]);
  });

  it('повторы, без координат и мусор — отбрасываем', () => {
    expect(parseSuggestions(null)).toEqual([]);
    expect(parseSuggestions({ features: 'x' })).toEqual([]);
    const list = parseSuggestions({
      features: [
        feature({ osm_id: 1, name: 'Тверская улица', city: 'Москва' }),
        feature({ osm_id: 2, name: 'Тверская улица', city: 'Москва' }),
        feature({ osm_id: 3, name: 'Без точки' }, null),
        feature({ osm_id: 4 }),
      ],
    });
    expect(list.map((s) => s.value)).toEqual(['Москва, Тверская улица']);
  });
});

describe('lookupOf — адрес события без подсказки', () => {
  it('нашли, не нашли, сервис не ответил', () => {
    expect(lookupOf({ features: [feature({ osm_id: 1, name: 'Тверская улица', city: 'Москва' })] })).toMatchObject({
      status: 'found',
      suggestion: { value: 'Москва, Тверская улица' },
    });
    expect(lookupOf({ features: [] })).toEqual({ status: 'none' });
    expect(lookupOf(null)).toEqual({ status: 'unavailable' });
  });
});
