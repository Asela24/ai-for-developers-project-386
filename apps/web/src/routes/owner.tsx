import { createFileRoute } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect, useState, type FormEvent } from "react";
import {
  createEventType,
  deleteBooking,
  deleteEventType,
  listEventTypes,
  listUpcomingBookings,
  type EventType,
  type OwnerBooking,
} from "@/client";
import { DurationPill, OwnerBadge } from "@/components/owner-badge";
import { Button } from "@/components/ui/button";
import { zone } from "@/lib/booking-days";

export const Route = createFileRoute("/owner")({ component: OwnerPage });

const dayLabel = new Intl.DateTimeFormat("ru-RU", {
  timeZone: zone,
  weekday: "short",
  day: "numeric",
  month: "long",
});
const timeLabel = new Intl.DateTimeFormat("ru-RU", {
  timeZone: zone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const interval = (booking: OwnerBooking) => {
  const start = new Date(booking.start);
  return `${dayLabel.format(start)}, ${timeLabel.format(start)}–${timeLabel.format(new Date(booking.end))}`;
};

const fallbackFailure = "Проверьте данные и попробуйте ещё раз.";
// The data_error or conflict phrase the server sent, or nothing when the operation succeeded.
const failureMessage = (error: unknown): string => {
  if (error === undefined) return "";
  if (typeof error === "object" && error !== null && "message" in error) {
    return typeof error.message === "string" ? error.message : fallbackFailure;
  }
  return fallbackFailure;
};
const card = "rounded-2xl border bg-card p-6 shadow-xs";
const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";
const emptyDraft = { id: "", name: "", description: "", durationMinutes: "" };

function OwnerPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [confirming, setConfirming] = useState<string>();
  const [failure, setFailure] = useState("");

  // Bumped after each Owner operation so the page re-reads both lists.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void Promise.all([listEventTypes(), listUpcomingBookings()])
      .then(([types, upcoming]) => {
        if (types.data) setEventTypes(types.data);
        if (upcoming.data) setBookings(upcoming.data);
      })
      .catch(() => {
        // The page stays empty when the server is unreachable.
      });
  }, [version]);

  // Runs an Owner operation, shows its data_error or conflict phrase, then re-reads both lists.
  const act = async (operation: Promise<{ error?: unknown }>) => {
    const { error } = await operation;
    setFailure(failureMessage(error));
    setVersion((current) => current + 1);
    return error === undefined;
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const created = await act(
      createEventType({
        body: {
          id: draft.id,
          name: draft.name,
          description: draft.description,
          durationMinutes: Number(draft.durationMinutes),
        },
      }),
    );
    if (created) setDraft(emptyDraft);
  };

  const typeName = (id: string) => eventTypes.find((eventType) => eventType.id === id)?.name ?? "";
  const field = (key: keyof typeof emptyDraft) => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) =>
      setDraft((current) => ({ ...current, [key]: event.target.value })),
  });

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Owner</h1>
        <OwnerBadge />
      </header>

      {failure && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive"
        >
          {failure}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <form
            aria-labelledby="new-type-heading"
            onSubmit={(event) => void create(event)}
            className={cn(card, "space-y-4")}
          >
            <h2 id="new-type-heading" className="text-lg font-semibold">
              Новый тип события
            </h2>
            <label className="block space-y-1 text-sm">
              <span>Id</span>
              <input className={inputClass} required {...field("id")} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Название</span>
              <input className={inputClass} required {...field("name")} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Описание</span>
              <textarea
                className={cn(inputClass, "h-20 py-2")}
                required
                {...field("description")}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Длительность, минут</span>
              <input
                className={inputClass}
                type="number"
                min={1}
                required
                {...field("durationMinutes")}
              />
            </label>
            <Button type="submit" className="h-10 w-full rounded-xl">
              Создать
            </Button>
          </form>

          <section aria-labelledby="types-heading" className={cn(card, "space-y-4")}>
            <h2 id="types-heading" className="text-lg font-semibold">
              Типы событий
            </h2>
            {eventTypes.length === 0 && (
              <p className="text-sm text-muted-foreground">Типов событий пока нет.</p>
            )}
            <ul className="space-y-3">
              {eventTypes.map((eventType) => (
                <li key={eventType.id} className="space-y-2 rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{eventType.name}</p>
                    <DurationPill minutes={eventType.durationMinutes} />
                  </div>
                  <p className="text-sm text-muted-foreground">{eventType.description}</p>
                  {confirming === eventType.id ? (
                    <div className="space-y-2 rounded-lg bg-destructive/5 p-3 text-sm">
                      <p>Вместе с типом удалятся все его бронирования.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setConfirming(undefined);
                            void act(deleteEventType({ path: { eventTypeId: eventType.id } }));
                          }}
                        >
                          Удалить вместе с бронированиями
                        </Button>
                        <Button variant="outline" onClick={() => setConfirming(undefined)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setConfirming(eventType.id)}>
                      Удалить тип
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="upcoming-heading" className={cn(card, "space-y-4")}>
          <h2 id="upcoming-heading" className="text-lg font-semibold">
            Предстоящие бронирования
          </h2>
          {bookings.length === 0 && (
            <p className="text-sm text-muted-foreground">Предстоящих бронирований нет.</p>
          )}
          <ul className="space-y-3">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{booking.guestName}</p>
                  <p className="text-muted-foreground">{booking.guestEmail}</p>
                  <p>
                    <span className="font-medium">{typeName(booking.eventTypeId)}</span>
                    {` · ${interval(booking)}`}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => void act(deleteBooking({ path: { id: booking.id } }))}
                >
                  Удалить бронирование
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
