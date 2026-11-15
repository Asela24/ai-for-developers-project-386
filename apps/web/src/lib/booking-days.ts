// Slots are offered in the Owner's zone, so every page shows days and times there too.
export const zone = "Europe/Belgrade";

// en-CA formats a date as YYYY-MM-DD.
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Belgrade day of an instant as YYYY-MM-DD. */
const dayKey = (instant: string | Date): string => dayKeyFormat.format(new Date(instant));

/** Slots grouped by their Belgrade day, days in the order the Slots come. */
export const slotsByDay = <S extends { start: string }>(slots: S[]): Map<string, S[]> => {
  const days = new Map<string, S[]>();
  for (const slot of slots) {
    const key = dayKey(slot.start);
    const day = days.get(key);
    if (day) day.push(slot);
    else days.set(key, [slot]);
  }
  return days;
};

/** Each YYYY-MM month that the YYYY-MM-DD days fall in, once and in order. */
export const monthsOf = (days: string[]): string[] => [
  ...new Set(days.map((day) => day.slice(0, 7))),
];

export type GridDay = { date: string; day: number; inMonth: boolean };

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Whole Monday-first weeks that cover a YYYY-MM month. */
export const monthGrid = (month: string): GridDay[][] => {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const last = new Date(Date.UTC(year, monthNumber, 0));
  // getUTCDay is 0 on Sunday; Monday-first weeks shift it by six.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = Math.ceil((lead + last.getUTCDate()) / 7) * 7;
  const weeks: GridDay[][] = [];
  for (let index = 0; index < cells; index += 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1, 1 - lead + index));
    const cell = {
      date: iso(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthNumber - 1,
    };
    if (index % 7 === 0) weeks.push([cell]);
    else weeks.at(-1)?.push(cell);
  }
  return weeks;
};
