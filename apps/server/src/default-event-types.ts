import type { BuildAppOptions } from "./app.js";

/** The catalog a fresh server starts with, so the Guest never lands on an empty page. */
export const defaultEventTypes: NonNullable<BuildAppOptions["eventTypes"]> = [
  {
    id: "intro-call",
    name: "Знакомство",
    description: "Короткий разговор, чтобы обсудить задачу",
    durationMinutes: 30,
  },
  {
    id: "consultation",
    name: "Консультация",
    description: "Подробный разбор вопроса",
    durationMinutes: 60,
  },
];
