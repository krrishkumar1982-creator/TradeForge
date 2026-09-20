/**
 * Centralized Timezone-Aware Date & Time Utilities for TradeForge.
 * Strictly formats all dates and timestamps using the trader's canonical IANA timezone,
 * preferred date format, and preferred 12h/24h time format.
 *
 * GUARANTEE: "Invalid Date" or NaN must NEVER appear in the UI.
 * Any malformed, null, undefined, or unparseable input returns a safe fallback (default '—').
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function sanitizeTimezone(tz?: string): string {
  if (!tz) return 'America/New_York';
  return isValidTimezone(tz) ? tz : 'America/New_York';
}

export type DateFormatOption = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
export type TimeFormatOption = '12h' | '24h';

/**
 * Parses any date input into a valid Date object, or null if invalid.
 */
export function parseSafeDate(dateInput: string | number | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  try {
    // If it's a numeric string timestamp
    if (typeof dateInput === 'string' && /^\d{10,14}$/.test(dateInput.trim())) {
      const num = Number(dateInput.trim());
      const d = new Date(num < 10000000000 ? num * 1000 : num);
      return isNaN(d.getTime()) ? null : d;
    }
    // If it's a plain YYYY-MM-DD string, parse components to prevent timezone shift
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      const [y, m, d] = dateInput.trim().split('-').map(Number);
      const parsed = new Date(y, m - 1, d, 12, 0, 0);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Checks if an input can produce a valid Date object.
 */
export function isValidDate(dateInput: string | number | Date | null | undefined): boolean {
  return parseSafeDate(dateInput) !== null;
}

/**
 * Extracts a normalized YYYY-MM-DD date key from any valid date representation.
 */
export function toISODateKey(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return dateInput.trim();
    }
    const d = parseSafeDate(dateInput);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Returns safe year (e.g. 2026) and 0-indexed month (0-11) for a date.
 * Defaults to current year & month if dateInput is missing or invalid.
 */
export function getYearMonth(dateInput: string | number | Date | null | undefined): { year: number; month: number } {
  const d = parseSafeDate(dateInput) || new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
  return { year, month };
}

/**
 * Formats Month and Year safely (e.g. "August 2026"). Never returns "NaN" or "undefined".
 */
export function formatMonthYear(year: number, month: number): string {
  const safeYear = isNaN(year) ? new Date().getFullYear() : year;
  const safeMonth = isNaN(month) ? new Date().getMonth() : Math.max(0, Math.min(11, month));
  const monthName = MONTH_NAMES[safeMonth] || 'Month';
  return `${monthName} ${safeYear}`;
}

/**
 * Finds the latest trade date in a list of trades and returns its { year, month }
 */
export function getLatestTradeMonth(trades: Array<{ entryDate?: string | null; exitDate?: string | null }>): { year: number; month: number } {
  if (!trades || trades.length === 0) {
    return getYearMonth(new Date());
  }

  let latestTimestamp = -Infinity;
  let latestDate: Date | null = null;

  for (const t of trades) {
    const raw = t.entryDate || t.exitDate;
    const d = parseSafeDate(raw);
    if (d && d.getTime() > latestTimestamp) {
      latestTimestamp = d.getTime();
      latestDate = d;
    }
  }

  return latestDate ? getYearMonth(latestDate) : getYearMonth(new Date());
}

/**
 * Formats a date string or Date object into a readable date in the given timezone and format.
 * Guaranteed safe fallback if date is invalid or missing.
 */
export function formatTimezoneDate(
  dateInput: string | number | Date | null | undefined,
  timezone = 'America/New_York',
  options?: Intl.DateTimeFormatOptions,
  dateFormat: DateFormatOption = 'YYYY-MM-DD',
  fallback = '—'
): string {
  if (!dateInput) return fallback;
  try {
    const d = parseSafeDate(dateInput);
    if (!d) return fallback;
    const tz = sanitizeTimezone(timezone);

    if (options) {
      const res = new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZone: tz,
      }).format(d);
      return res.includes('Invalid') ? fallback : res;
    }

    // Format parts to handle requested standard
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);

    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';

    if (!year || !month || !day) return fallback;

    if (dateFormat === 'MM/DD/YYYY') {
      return `${month}/${day}/${year}`;
    }
    if (dateFormat === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    }
    // Default YYYY-MM-DD
    return `${year}-${month}-${day}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats a date string or Date object into a readable time in the given timezone and clock standard.
 * Guaranteed safe fallback if date is invalid or missing.
 */
export function formatTimezoneTime(
  dateInput: string | number | Date | null | undefined,
  timezone = 'America/New_York',
  options?: Intl.DateTimeFormatOptions,
  timeFormat: TimeFormatOption = '12h',
  fallback = '—'
): string {
  if (!dateInput) return fallback;
  try {
    const d = parseSafeDate(dateInput);
    if (!d) return fallback;
    const tz = sanitizeTimezone(timezone);
    const hour12 = timeFormat === '12h';

    const res = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      ...(options?.second ? { second: options.second } : {}),
      hour12,
      ...options,
      timeZone: tz,
    }).format(d);

    return res.includes('Invalid') ? fallback : res;
  } catch {
    return fallback;
  }
}

/**
 * Returns formatted trade entry info: { date, time, full } in trader's timezone, date format, and time format.
 * Never throws, never returns "Invalid Date".
 */
export function formatTradeTimestamp(
  dateInput: string | number | Date | null | undefined,
  timezone = 'America/New_York',
  dateFormat: DateFormatOption = 'YYYY-MM-DD',
  timeFormat: TimeFormatOption = '12h',
  fallback = '—'
): { date: string; time: string; full: string } {
  if (!dateInput) return { date: fallback, time: '', full: fallback };
  try {
    const d = parseSafeDate(dateInput);
    if (!d) return { date: fallback, time: '', full: fallback };

    const dateStr = formatTimezoneDate(d, timezone, undefined, dateFormat, fallback);
    const timeStr = formatTimezoneTime(d, timezone, undefined, timeFormat, '');

    return {
      date: dateStr,
      time: timeStr,
      full: timeStr ? `${dateStr} ${timeStr}` : dateStr,
    };
  } catch {
    return { date: fallback, time: '', full: fallback };
  }
}

/**
 * General-purpose safe date formatter.
 * Returns fallback (e.g. '—') if input is invalid or falsy. Never returns "Invalid Date".
 */
export function safeFormatDate(
  dateInput: string | number | Date | null | undefined,
  fallback = '—',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return fallback;
  try {
    const d = parseSafeDate(dateInput);
    if (!d) return fallback;
    const formatted = d.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
    return formatted.includes('Invalid') ? fallback : formatted;
  } catch {
    return fallback;
  }
}

/**
 * General-purpose safe date+time formatter.
 */
export function safeFormatDateTime(
  dateInput: string | number | Date | null | undefined,
  fallback = '—'
): string {
  if (!dateInput) return fallback;
  try {
    const d = parseSafeDate(dateInput);
    if (!d) return fallback;
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (datePart.includes('Invalid') || timePart.includes('Invalid')) return fallback;
    return `${datePart} ${timePart}`;
  } catch {
    return fallback;
  }
}

/**
 * Specific trade table entry timestamp formatter.
 * Produces { date: 'Sep 18,', time: '09:30 AM' } safely.
 */
export function safeFormatEntryTime(
  dateInput: string | number | Date | null | undefined,
  fallback = '—'
): { date: string; time: string } {
  if (!dateInput) return { date: fallback, time: '' };
  try {
    const d = parseSafeDate(dateInput);
    if (!d) return { date: fallback, time: '' };
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ',';
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (dateFormatted.includes('Invalid')) return { date: fallback, time: '' };
    return { date: dateFormatted, time: timeFormatted.includes('Invalid') ? '' : timeFormatted };
  } catch {
    return { date: fallback, time: '' };
  }
}
