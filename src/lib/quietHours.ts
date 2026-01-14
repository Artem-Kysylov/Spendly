export type QuietHoursPreference = {
  quiet_hours_enabled?: boolean | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_timezone?: string | null;
};

function parseHHMM(value: string | null | undefined): { h: number; m: number } | null {
  if (!value) return null;
  const parts = String(value).split(":");
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0] ?? "", 10);
  const m = Number.parseInt(parts[1] ?? "", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const year = Number.parseInt(get("year") ?? "", 10);
  const month = Number.parseInt(get("month") ?? "", 10);
  const day = Number.parseInt(get("day") ?? "", 10);
  const hour = Number.parseInt(get("hour") ?? "", 10);
  const minute = Number.parseInt(get("minute") ?? "", 10);
  const second = Number.parseInt(get("second") ?? "", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    throw new Error("Failed to parse zoned date parts");
  }

  return { year, month, day, hour, minute, second };
}

function minutesSinceMidnight(h: number, m: number) {
  return h * 60 + m;
}

function isInQuietHours(nowMin: number, startMin: number, endMin: number) {
  // If start < end: same-day interval (e.g. 13:00-14:00)
  // If start >= end: overnight interval (e.g. 22:00-08:00)
  return startMin < endMin
    ? nowMin >= startMin && nowMin < endMin
    : nowMin >= startMin || nowMin < endMin;
}

function dateForZonedLocalTime(
  base: Date,
  timeZone: string,
  localHour: number,
  localMinute: number,
  addDays: number,
) {
  // We want a real UTC instant which, when formatted in `timeZone`,
  // yields (base local date + addDays) at localHour:localMinute.
  // We do a small iterative solve to handle DST transitions.
  const baseParts = getZonedParts(base, timeZone);
  const localDateUTCGuess = Date.UTC(
    baseParts.year,
    baseParts.month - 1,
    baseParts.day + addDays,
    localHour,
    localMinute,
    0,
    0,
  );

  let candidate = new Date(localDateUTCGuess);

  for (let i = 0; i < 4; i++) {
    const p = getZonedParts(candidate, timeZone);
    const diffMinutes =
      minutesSinceMidnight(localHour, localMinute) -
      minutesSinceMidnight(p.hour, p.minute);

    if (diffMinutes === 0 && p.day === baseParts.day + addDays) {
      break;
    }

    candidate = new Date(candidate.getTime() + diffMinutes * 60 * 1000);
  }

  return candidate;
}

export function computeNextAllowedTime(
  base: Date,
  pref?: QuietHoursPreference | null,
) {
  try {
    if (!pref?.quiet_hours_enabled) return base;

    const start = parseHHMM(pref.quiet_hours_start);
    const end = parseHHMM(pref.quiet_hours_end);
    if (!start || !end) return base;

    const startMin = minutesSinceMidnight(start.h, start.m);
    const endMin = minutesSinceMidnight(end.h, end.m);

    const tz = (pref.quiet_hours_timezone || "").trim();
    if (!tz) {
      const nowMin = minutesSinceMidnight(base.getHours(), base.getMinutes());
      if (!isInQuietHours(nowMin, startMin, endMin)) return base;

      const next = new Date(base);
      if (startMin < endMin) {
        next.setHours(end.h, end.m, 0, 0);
      } else {
        next.setDate(next.getDate() + (nowMin >= startMin ? 1 : 0));
        next.setHours(end.h, end.m, 0, 0);
      }
      return next;
    }

    // Validate timeZone early (throws on invalid tz)
    getZonedParts(base, tz);

    const nowParts = getZonedParts(base, tz);
    const nowMin = minutesSinceMidnight(nowParts.hour, nowParts.minute);
    if (!isInQuietHours(nowMin, startMin, endMin)) return base;

    // If interval is same-day: always move to end today.
    // If overnight: move to end today if we're after midnight (nowMin < endMin),
    // otherwise move to end tomorrow.
    const addDays =
      startMin < endMin ? 0 : nowMin >= startMin ? 1 : 0;

    return dateForZonedLocalTime(base, tz, end.h, end.m, addDays);
  } catch {
    // Safe fallback: if timezone is invalid or Intl fails, don't block delivery.
    return base;
  }
}
