import { describe, expect, it } from 'vitest';
import {
  engineerLabel,
  engineerShort,
  HD_BY_BK,
  shortId,
  typeFull,
  typeShort,
} from './dictionaries';

describe('shortId', () => {
  it('короткий id целиком, длинный — последние 4 цифры', () => {
    expect(shortId('T012')).toBe('T012');
    expect(shortId('U-0001')).toBe('U-0001');
    expect(shortId('305838184')).toBe('…8184');
    expect(shortId('')).toBe('');
  });
});

describe('подписи бригад', () => {
  it('engineerLabel', () => {
    expect(engineerLabel('Бригада Соколов', 'E01')).toBe('Бригада Соколов');
    expect(engineerLabel('', 'E00')).toBe('Бригада E00');
    expect(engineerLabel('E03', 'E03')).toBe('Бригада E03');
    expect(engineerLabel('Капитанчук Александр', 'E07')).toBe('Капитанчук Александр');
  });

  it('engineerShort — без «Бригада», первое слово', () => {
    expect(engineerShort('Бригада Соколов', 'E01')).toBe('Соколов');
    expect(engineerShort('Капитанчук Александр', 'E07')).toBe('Капитанчук');
    expect(engineerShort(null, 'E00')).toBe('E00');
    expect(engineerShort('Бригада 1', 'E01')).toBe('Бригада 1');
  });
});

describe('типы заявки', () => {
  it('typeShort: по BK, без BK — по навыку (§6.8)', () => {
    expect(typeShort('Подключение', 'installation')).toBe('Подкл.');
    expect(typeShort('Локальная заявка', 'local')).toBe('Лок.');
    expect(typeShort('Дозаказ', 'installation')).toBe('Дозак.');
    expect(typeShort('Глобальная проблема', 'emergency')).toBe('Авария');
    expect(typeShort(null, 'emergency')).toBe('Авария');
    expect(typeShort(undefined, 'installation')).toBe('Подкл.');
    expect(typeShort('', 'local')).toBe('Лок.');
  });

  it('typeFull', () => {
    expect(typeFull('Подключение', 'Конвергенция абонента')).toBe(
      'Подключение · Конвергенция абонента',
    );
    expect(typeFull('Подключение', null)).toBe('Подключение');
    expect(typeFull(null, null, 'installation')).toBe('Подключение и дозаказ');
  });

  it('HD по BK, первая строка — самая частая', () => {
    expect(HD_BY_BK['Подключение'][0]).toBe('Конвергенция абонента');
    expect(HD_BY_BK['Глобальная проблема']).toEqual(['Авария', 'Информация']);
  });
});
