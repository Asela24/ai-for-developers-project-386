// Slot rules fixed by the specification: no operation changes them.
const zone = "Europe/Belgrade";
const windowDays = 14;
const openingMinute = 9 * 60;
const closingMinute = 18 * 60;
const minuteMs = 60_000;

export type Interval = { start: Date; end: Date };

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

const partsAt = (instant: number) => {
  const parts = Object.fromEntries(
    wallClock.formatToParts(instant).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
  };
};

const offsetAt = (instant: number): number => {
  const p = partsAt(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(instant / minuteMs) * minuteMs;
};

// The instant at which Belgrade's wall clock shows this date and minute of day.
const belgradeInstant = (year: number, month: number, day: number, minuteOfDay: number) => {
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  const first = naive - offsetAt(naive);
  return naive - offsetAt(first);
};

/** Every Slot offered for a duration at `now`: 14 Belgrade days from today, 09:00–18:00, packed, none past. */
export const offeredSlots = (durationMinutes: number, now: Date): Interval[] => {
  const today = partsAt(now.getTime());
  const slots: Interval[] = [];
  for (let dayOffset = 0; dayOffset < windowDays; dayOffset += 1) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + dayOffset));
    for (
      let minute = openingMinute;
      minute + durationMinutes <= closingMinute;
      minute += durationMinutes
    ) {
      const start = belgradeInstant(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        minute,
      );
      if (start < now.getTime()) continue;
      slots.push({ start: new Date(start), end: new Date(start + durationMinutes * minuteMs) });
    }
  }
  return slots;
};
