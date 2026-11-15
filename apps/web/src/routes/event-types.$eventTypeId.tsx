import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createBooking, listEventTypes, listSlots, type EventType, type Slot } from "@/client";
import { DurationPill, OwnerBadge } from "@/components/owner-badge";
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

const card = "rounded-2xl border bg-card p-6 shadow-xs";
const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

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
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{eventType?.name ?? ""}</h1>

      {notice && (
        <p role="status" className="rounded-xl border border-primary/30 bg-orange-50 px-4 py-3">
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr_1.2fr]">
        <aside className={cn(card, "space-y-4")}>
          <OwnerBadge />
          {eventType && (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-semibold">{eventType.name}</p>
                <DurationPill minutes={eventType.durationMinutes} />
              </div>
              <p className="text-sm">{eventType.description}</p>
            </>
          )}
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Выбранная дата</p>
            <p>{shownDay ? longDayLabel.format(atNoon(shownDay)) : "Дата не выбрана"}</p>
          </div>
          <div className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Выбранное время</p>
            <p>{chosen ? interval(chosen) : "Время не выбрано"}</p>
          </div>
        </aside>

        <section aria-labelledby="days-heading" className={cn(card, "space-y-4")}>
          <div className="flex items-center justify-between">
            <h2 id="days-heading" className="text-lg font-semibold">
              Дата
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Предыдущий месяц"
                disabled={monthIndex <= 0}
                onClick={() => setMonth(months[monthIndex - 1])}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Следующий месяц"
                disabled={monthIndex < 0 || monthIndex >= months.length - 1}
                onClick={() => setMonth(months[monthIndex + 1])}
              >
                →
              </Button>
            </div>
          </div>
          {shownMonth && <p className="text-sm">{monthLabel.format(atNoon(`${shownMonth}-15`))}</p>}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
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
                        "flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition",
                        cellSlots
                          ? "bg-card hover:border-primary/60"
                          : "border-transparent bg-muted text-muted-foreground/70",
                        selected && "border-primary bg-orange-50 font-semibold",
                        !cell.inMonth && !cellSlots && "opacity-60",
                      )}
                    >
                      {cell.day}
                      {cellSlots && (
                        <span className="text-[0.65rem] font-normal text-muted-foreground">
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
          <section aria-labelledby="slots-heading" className={cn(card, "flex flex-col gap-4")}>
            <h2 id="slots-heading" className="text-lg font-semibold">
              Статус слотов
            </h2>
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {daySlots.map((slot) => {
                const time = timeLabel.format(new Date(slot.start));
                const busy = slot.status === "busy";
                return (
                  <li key={slot.start}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={busy ? `${time} занято` : time}
                      aria-pressed={chosen?.start === slot.start}
                      onClick={() => {
                        setChosen(slot);
                        setNotice("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                        busy ? "bg-muted text-muted-foreground" : "bg-card hover:border-primary/60",
                        chosen?.start === slot.start && "border-primary bg-orange-50",
                      )}
                    >
                      <span>{interval(slot)}</span>
                      <span className="text-xs font-semibold">{busy ? "Занято" : "Свободно"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto grid grid-cols-2 gap-3">
              <Link
                to="/event-types"
                className={buttonVariants({ variant: "outline", className: "h-10 rounded-xl" })}
              >
                Назад
              </Link>
              <Button
                className="h-10 rounded-xl"
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
            className={cn(card, "flex flex-col gap-4")}
          >
            <h2 id="guest-heading" className="text-lg font-semibold">
              Ваши данные
            </h2>
            <label className="block space-y-1 text-sm">
              <span>Имя</span>
              <input
                className={inputClass}
                required
                maxLength={120}
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Почта</span>
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
            <div className="mt-auto grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setStep("slot")}
              >
                Назад
              </Button>
              <Button type="submit" className="h-10 rounded-xl">
                Забронировать
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
