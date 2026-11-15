import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createBooking, listEventTypes, listSlots, type EventType, type Slot } from "@/client";
import { Duration, OwnerBadge } from "@/components/owner-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { monthGrid, monthsOf, slotsByDay, zone } from "@/lib/booking-days";

export const Route = createFileRoute("/event-types/$eventTypeId")({ component: EventTypeView });

const dayLabel = new Intl.DateTimeFormat("ru-RU", {
  timeZone: zone,
  weekday: "short",
  day: "numeric",
  month: "long",
});
const longDayLabel = new Intl.DateTimeFormat("ru-RU", {
  timeZone: zone,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const monthLabel = new Intl.DateTimeFormat("ru-RU", {
  timeZone: zone,
  month: "long",
  year: "numeric",
});
const timeLabel = new Intl.DateTimeFormat("ru-RU", {
  timeZone: zone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Noon UTC falls on the same date in Belgrade, so a YYYY-MM-DD key formats as that day.
const atNoon = (key: string) => new Date(`${key}T12:00:00Z`);
const interval = (slot: Slot) =>
  `${timeLabel.format(new Date(slot.start))} – ${timeLabel.format(new Date(slot.end))}`;

const sectionHeading = "text-sm font-medium";
const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

function EventTypeView() {
  const { eventTypeId } = Route.useParams();
  const [eventType, setEventType] = useState<EventType>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [month, setMonth] = useState<string>();
  const [day, setDay] = useState<string>();
  const [chosen, setChosen] = useState<Slot>();
  const [step, setStep] = useState<"slot" | "guest">("slot");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");

  // Bumped after each create so the view re-reads free and busy Slots.
  const [slotsVersion, setSlotsVersion] = useState(0);

  useEffect(() => {
    void listEventTypes()
      .then((result) =>
        setEventType(result.data?.find((candidate) => candidate.id === eventTypeId)),
      )
      .catch(() => {
        // The view stays empty when the server is unreachable.
      });
  }, [eventTypeId]);

  useEffect(() => {
    void listSlots({ path: { eventTypeId } })
      .then((result) => {
        if (result.data) setSlots(result.data);
      })
      .catch(() => {
        // The view stays empty when the server is unreachable.
      });
  }, [eventTypeId, slotsVersion]);

  const days = useMemo(() => slotsByDay(slots), [slots]);
  const months = monthsOf([...days.keys()]);
  const firstDay = days.keys().next().value;
  const shownDay = day ?? firstDay;
  const shownMonth = month ?? shownDay?.slice(0, 7);
  const monthIndex = shownMonth ? months.indexOf(shownMonth) : -1;
  const daySlots = shownDay ? (days.get(shownDay) ?? []) : [];

  const pickDay = (key: string) => {
    setDay(key);
    setChosen(undefined);
    setNotice("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!chosen) return;
    const result = await createBooking({
      body: { eventTypeId, start: chosen.start, guestName, guestEmail },
    });
    if (result.data) {
      const start = new Date(result.data.start);
      setNotice(`Бронирование создано: ${dayLabel.format(start)}, ${timeLabel.format(start)}`);
      setFailure("");
      setChosen(undefined);
      setGuestName("");
      setGuestEmail("");
      setStep("slot");
    } else {
      setFailure(result.error?.message ?? "Проверьте данные и попробуйте ещё раз.");
    }
    setSlotsVersion((version) => version + 1);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{eventType?.name ?? ""}</h1>

      {notice && (
        <p role="status" className="border-l-2 border-primary pl-4 text-sm">
          {notice}
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr_1.2fr] lg:gap-10">
        <aside className="space-y-6">
          <OwnerBadge />
          {eventType && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{eventType.name}</p>
                <Duration minutes={eventType.durationMinutes} />
              </div>
              <p className="text-sm text-muted-foreground">{eventType.description}</p>
            </div>
          )}
          <dl className="space-y-4 border-t pt-6 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Выбранная дата</dt>
              <dd>{shownDay ? longDayLabel.format(atNoon(shownDay)) : "Дата не выбрана"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Выбранное время</dt>
              <dd>{chosen ? interval(chosen) : "Время не выбрано"}</dd>
            </div>
          </dl>
        </aside>

        <section aria-labelledby="days-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="days-heading" className={sectionHeading}>
              Дата
            </h2>
            <div className="flex items-center gap-1">
              {shownMonth && (
                <p className="mr-2 text-sm text-muted-foreground">
                  {monthLabel.format(atNoon(`${shownMonth}-15`))}
                </p>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Предыдущий месяц"
                disabled={monthIndex <= 0}
                onClick={() => setMonth(months[monthIndex - 1])}
              >
                ←
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Следующий месяц"
                disabled={monthIndex < 0 || monthIndex >= months.length - 1}
                onClick={() => setMonth(months[monthIndex + 1])}
              >
                →
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          {shownMonth && (
            <div className="grid grid-cols-7 gap-1">
              {monthGrid(shownMonth)
                .flat()
                .map((cell) => {
                  const cellSlots = days.get(cell.date);
                  const free = cellSlots?.filter((slot) => slot.status === "free").length ?? 0;
                  const selected = cell.date === shownDay;
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      disabled={!cellSlots}
                      aria-label={dayLabel.format(atNoon(cell.date))}
                      aria-pressed={selected}
                      onClick={() => pickDay(cell.date)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-md text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        cellSlots ? "hover:bg-muted" : "text-muted-foreground/50",
                        selected && "bg-primary text-primary-foreground hover:bg-primary",
                        !cell.inMonth && !cellSlots && "opacity-40",
                      )}
                    >
                      {cell.day}
                      {cellSlots && (
                        <span
                          className={cn(
                            "text-[0.65rem]",
                            selected ? "text-primary-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          {`${free} св.`}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </section>

        {step === "slot" ? (
          <section aria-labelledby="slots-heading" className="flex flex-col gap-4">
            <h2 id="slots-heading" className={sectionHeading}>
              Статус слотов
            </h2>
            <ul className="max-h-96 divide-y overflow-y-auto border-y">
              {daySlots.map((slot) => {
                const time = timeLabel.format(new Date(slot.start));
                const busy = slot.status === "busy";
                const picked = chosen?.start === slot.start;
                return (
                  <li key={slot.start}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={busy ? `${time} занято` : time}
                      aria-pressed={picked}
                      onClick={() => {
                        setChosen(slot);
                        setNotice("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2.5 text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        busy ? "bg-muted text-muted-foreground" : "hover:bg-muted",
                        picked && "bg-accent font-medium text-accent-foreground hover:bg-accent",
                      )}
                    >
                      <span>{interval(slot)}</span>
                      <span className="text-xs">{busy ? "Занято" : "Свободно"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex justify-end gap-2">
              <Link
                to="/event-types"
                className={buttonVariants({ variant: "ghost", className: "h-9 px-4" })}
              >
                Назад
              </Link>
              <Button
                className="h-9 px-4"
                disabled={!chosen}
                onClick={() => {
                  setFailure("");
                  setStep("guest");
                }}
              >
                Продолжить
              </Button>
            </div>
          </section>
        ) : (
          <form
            aria-labelledby="guest-heading"
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-4"
          >
            <h2 id="guest-heading" className={sectionHeading}>
              Ваши данные
            </h2>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Имя</span>
              <input
                className={inputClass}
                required
                maxLength={120}
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Почта</span>
              <input
                className={inputClass}
                type="email"
                required
                maxLength={254}
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
              />
            </label>
            {failure && (
              <p role="alert" className="text-sm text-destructive">
                {failure}
              </p>
            )}
            <div className="mt-auto flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-4"
                onClick={() => setStep("slot")}
              >
                Назад
              </Button>
              <Button type="submit" className="h-9 px-4">
                Забронировать
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
