import {
  daysInMonth,
  formatDay,
  formatDayMonth,
  formatDayShort,
  formatTime,
  monthAndYear,
  monthInitial,
  monthKeyOf,
  monthName,
  monthRange,
  monthShort,
} from './month';

describe('months', () => {
  it('monthKeyOf uses UTC', () => {
    expect(monthKeyOf(new Date(Date.UTC(2026, 10, 30, 23, 59)))).toBe('2026-11');
    expect(monthKeyOf(new Date(Date.UTC(2026, 11, 1, 0, 0)))).toBe('2026-12');
  });

  it('monthRange returns 6 months ending now', () => {
    expect(monthRange('2026-11', 6)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('monthRange crosses the year', () => {
    const range = monthRange('2026-02', 6);

    expect(range[0]).toBe('2025-09');
    expect(range[5]).toBe('2026-02');
  });

  it('monthRange returns 12 months', () => {
    expect(monthRange('2026-11', 12)).toHaveLength(12);
  });

  it('daysInMonth handles leap years', () => {
    expect(daysInMonth('2026-11')).toBe(30);
    expect(daysInMonth('2026-12')).toBe(31);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('names a month', () => {
    expect(monthName('2026-11')).toBe('November');
    expect(monthInitial('2026-11')).toBe('N');
    expect(monthShort('2026-11')).toBe('Nov');
  });

  it('monthAndYear names a month and its year', () => {
    expect(monthAndYear('2026-11')).toBe('November 2026');
    expect(monthAndYear('2025-12')).toBe('December 2025');
  });

  it('formatTime uses a 24-hour clock', () => {
    expect(formatTime(new Date(2026, 10, 18, 15, 5))).toBe('15:05');
    expect(formatTime(new Date(2026, 10, 18, 0, 7))).toBe('00:07');
  });

  it('formatDayMonth shows the day and the month in words, on the phone\'s calendar', () => {
    expect(formatDayMonth(new Date(2026, 10, 16, 0, 30))).toBe('16 November');
    expect(formatDayMonth(new Date(2026, 11, 1, 23, 59))).toBe('1 December');
  });

  it('formatDay shows day, month and year', () => {
    expect(formatDay(new Date(2026, 10, 8, 12))).toBe('8 Nov 2026');
    expect(formatDay(new Date(2026, 8, 8, 12))).toBe('8 Sep 2026');
  });

  it('formatDayShort shows the day and the short month, on the phone\'s calendar', () => {
    expect(formatDayShort(new Date(2026, 10, 8, 12))).toBe('8 Nov');
    expect(formatDayShort(new Date(2026, 8, 30, 23, 59))).toBe('30 Sep');
  });
});
