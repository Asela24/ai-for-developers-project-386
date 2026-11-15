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

// Year, month, day, hour and minute that Belgrade's wall clock shows at this instant.
const belgradeWallClockAt = (instant: number) => {
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

// How far Belgrade's wall clock runs ahead of UTC at this instant, in milliseconds.
const belgradeOffsetMsAt = (instant: number): number => {
  const wall = belgradeWallClockAt(instant);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  return asUtc - Math.floor(instant / minuteMs) * minuteMs;
};

// The instant at which Belgrade's wall clock shows this date and minute of day.
const belgradeInstant = (year: number, month: number, day: number, minuteOfDay: number) => {
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  // Guess with the offset at the naive instant, then correct with the offset at the guess,
  // which differs only when a DST switch lies between the two.
  const firstGuess = naive - belgradeOffsetMsAt(naive);
  return naive - belgradeOffsetMsAt(firstGuess);
};

/** Every Slot offered for a duration at `now`: 14 Belgrade days from today, 09:00–18:00, packed, none past. */
export const offeredSlots = (durationMinutes: number, now: Date): Interval[] => {
  const today = belgradeWallClockAt(now.getTime());
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
