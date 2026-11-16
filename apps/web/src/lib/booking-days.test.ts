import { describe, expect, it } from "vitest";
import { monthGrid, monthsOf, slotsByDay } from "./booking-days";

const slot = (start: string, end: string, status: "free" | "busy" = "free") => ({
  start,
  end,
  status,
});

describe("slotsByDay", () => {
  it("groups Slots by their day on the Belgrade wall clock", () => {
    // 22:30 UTC on 31 March is already 00:30 on 1 April in Belgrade (summer time, UTC+2).
    const late = slot("2026-03-31T22:30:00.000Z", "2026-03-31T23:30:00.000Z");
    const morning = slot("2026-03-31T07:00:00.000Z", "2026-03-31T08:00:00.000Z", "busy");
    const days = slotsByDay([morning, late]);
    expect([...days.keys()]).toEqual(["2026-03-31", "2026-04-01"]);
    expect(days.get("2026-03-31")).toEqual([morning]);
    expect(days.get("2026-04-01")).toEqual([late]);
  });
});

describe("monthsOf", () => {
  it("lists each month the days fall in, once and in order", () => {
    expect(monthsOf(["2026-03-30", "2026-03-31", "2026-04-01", "2026-04-12"])).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });
});

describe("monthGrid", () => {
  it("fills whole Monday-first weeks around the month", () => {
    // 1 March 2026 is a Sunday and 31 March a Tuesday.
    const grid = monthGrid("2026-03");
    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]).toEqual({ date: "2026-02-23", day: 23, inMonth: false });
    expect(grid[0]?.[6]).toEqual({ date: "2026-03-01", day: 1, inMonth: true });
    expect(grid[5]?.[6]).toEqual({ date: "2026-04-05", day: 5, inMonth: false });
  });

  it("needs no extra week when the month starts on Monday and ends on Sunday", () => {
    const grid = monthGrid("2027-02");
    expect(grid).toHaveLength(4);
    expect(grid[0]?.[0]?.date).toBe("2027-02-01");
    expect(grid[3]?.[6]?.date).toBe("2027-02-28");
  });
});
