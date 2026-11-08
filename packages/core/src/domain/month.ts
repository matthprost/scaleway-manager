export type MonthKey = string;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// All month maths use UTC, like Scaleway's billing periods.
function parseKey(key: MonthKey): { year: number; month: number } {
  const [year = 0, month = 1] = key.split('-').map(Number);

  return { year, month };
}

export function monthKeyOf(date: Date): MonthKey {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(current: MonthKey, count: 6 | 12): MonthKey[] {
  const { year, month } = parseKey(current);

  return Array.from({ length: count }, (_, i) =>
    monthKeyOf(new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1))),
  );
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseKey(key);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthName(key: MonthKey): string {
  return MONTHS[parseKey(key).month - 1] ?? '';
}

export function monthInitial(key: MonthKey): string {
  return monthName(key).charAt(0);
}

export function monthShort(key: MonthKey): string {
  return monthName(key).slice(0, 3);
}

// "November 2026"
export function monthAndYear(key: MonthKey): string {
  return `${monthName(key)} ${parseKey(key).year}`;
}

// Local time on a 24-hour clock, e.g. "15:05".
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

// Local day and month in words, e.g. "16 November".
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()] ?? ''}`;
}

// Local date, e.g. "8 Nov 2026".
export function formatDay(date: Date): string {
  return `${formatDayShort(date)} ${date.getFullYear()}`;
}

// Local day and short month, e.g. "8 Nov".
export function formatDayShort(date: Date): string {
  const month = (MONTHS[date.getMonth()] ?? '').slice(0, 3);

  return `${date.getDate()} ${month}`;
}
