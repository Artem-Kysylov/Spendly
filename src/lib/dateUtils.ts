export const getPreviousMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const start = new Date(previousYear, previousMonth, 1);
  const end = new Date(previousYear, previousMonth + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  // Текущая дата как конец текущего месяца (для счетчиков «на сегодня»)
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Financial month helpers for custom budget cycles
export const getFinancialMonthStart = (
  resetDay: number,
  now: Date = new Date(),
): Date => {
  const normalizedDay = Math.min(31, Math.max(1, Math.floor(resetDay || 1)));
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();

  // If today >= resetDay, current cycle started this month
  if (currentDay >= normalizedDay) {
    const start = new Date(year, month, normalizedDay, 0, 0, 0, 0);
    // Handle case where resetDay doesn't exist in this month (e.g., Feb 31)
    if (start.getDate() !== normalizedDay) {
      // Use last day of month
      return new Date(year, month + 1, 0, 0, 0, 0, 0);
    }
    return start;
  }

  // Otherwise, cycle started last month
  const start = new Date(year, month - 1, normalizedDay, 0, 0, 0, 0);
  // Handle case where resetDay doesn't exist in previous month
  if (start.getDate() !== normalizedDay) {
    // Use last day of previous month
    return new Date(year, month, 0, 0, 0, 0, 0);
  }
  return start;
};

export const getFinancialMonthFullRange = (
  resetDay: number,
  now: Date = new Date(),
): { start: Date; end: Date } => {
  const start = getFinancialMonthStart(resetDay, now);
  const nextStart = new Date(start);
  nextStart.setMonth(nextStart.getMonth() + 1);
  
  // Handle case where next month doesn't have resetDay (e.g., Jan 31 -> Feb 28)
  const normalizedDay = Math.min(31, Math.max(1, Math.floor(resetDay || 1)));
  if (nextStart.getDate() !== normalizedDay) {
    // Set to last day of the month
    nextStart.setDate(0);
  }
  
  // End is one millisecond before next cycle starts
  const end = new Date(nextStart.getTime() - 1);
  return { start, end };
};

export const getFinancialMonthToDateRange = (
  resetDay: number,
  now: Date = new Date(),
): { start: Date; end: Date } => {
  const start = getFinancialMonthStart(resetDay, now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getPreviousFinancialMonthFullRange = (
  resetDay: number,
  now: Date = new Date(),
): { start: Date; end: Date } => {
  const currentStart = getFinancialMonthStart(resetDay, now);
  const start = new Date(currentStart);
  start.setMonth(start.getMonth() - 1);
  
  // Handle case where previous month doesn't have resetDay
  const normalizedDay = Math.min(31, Math.max(1, Math.floor(resetDay || 1)));
  if (start.getDate() !== normalizedDay) {
    // Set to last day of previous month
    start.setDate(0);
  }
  
  // End is one millisecond before current cycle starts
  const end = new Date(currentStart.getTime() - 1);
  return { start, end };
};

export const formatDateOnly = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const mergeDateWithTime = (datePart: Date, timeSource: Date): Date => {
  const next = new Date(datePart);
  next.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );
  return next;
};

export const toOffsetISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, "0");
  const offsetMins = String(absOffsetMinutes % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${sign}${offsetHours}:${offsetMins}`;
};
