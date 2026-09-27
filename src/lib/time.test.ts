import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromMin, nowFor, nowMsk, parseWindow, todayMsk, toMin } from './time';

afterEach(() => {
  vi.useRealTimers();
});

describe('nowMsk / todayMsk', () => {
  it('время по Москве (UTC+3)', () => {
    expect(nowMsk(new Date('2026-09-28T09:05:00Z'))).toBe('12:05');
  });

  it('полночь — 00:00, а не 24:00', () => {
    expect(nowMsk(new Date('2026-09-28T21:00:00Z'))).toBe('00:00');
  });

  it('дата по Москве, а не по UTC', () => {
    expect(todayMsk(new Date('2026-09-28T20:59:00Z'))).toBe('2026-09-28');
    expect(todayMsk(new Date('2026-09-28T21:30:00Z'))).toBe('2026-09-29');
  });

  it('по умолчанию — текущий момент', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T07:40:00Z'));
    expect(nowMsk()).toBe('10:40');
    expect(todayMsk()).toBe('2026-01-05');
  });
});

describe('nowFor', () => {
  it('часы дня, если заданы', () => {
    expect(nowFor('12:30')).toBe('12:30');
  });

  it.each([null, undefined, ''])('без часов (%s) — реальное московское время', (clock) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T16:15:00Z'));
    expect(nowFor(clock)).toBe('19:15');
  });
});

describe('toMin / fromMin', () => {
  it.each([
    ['00:00', 0],
    ['09:05', 545],
    ['9:05', 545],
    ['10:00', 600],
    ['22:00', 1320],
    ['24:00', 1440],
    ['10:00:30', 600],
  ])('toMin(%s) = %i', (time, minutes) => {
    expect(toMin(time)).toBe(minutes);
  });

  it.each(['', 'abc', '10', '10:75', '10-00'])('toMin(%j) — NaN', (time) => {
    expect(toMin(time)).toBeNaN();
  });

  it.each([
    [0, '00:00'],
    [545, '09:05'],
    [1439, '23:59'],
    [1440, '24:00'],
    [90.4, '01:30'],
    [-10, '00:00'],
    [Number.NaN, '--:--'],
  ])('fromMin(%d) = %s', (minutes, time) => {
    expect(fromMin(minutes)).toBe(time);
  });

  it('туда и обратно', () => {
    expect(fromMin(toMin('13:25'))).toBe('13:25');
  });
});

describe('parseWindow', () => {
  it('формат бэка', () => {
    expect(parseWindow('10:00-12:00')).toEqual({ start: '10:00', end: '12:00' });
  });

  it('тире, пробелы и часы без нуля', () => {
    expect(parseWindow(' 9:00 – 11:30 ')).toEqual({ start: '09:00', end: '11:30' });
  });

  it.each(['', '10:00', 'утро', '10:00-25:99'])('%j — null', (value) => {
    expect(parseWindow(value)).toBeNull();
  });
});
