import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { createBooking, listEventTypes, listSlots, type EventType, type Slot } from "@/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/event-types/$eventTypeId")({ component: SlotsView });

// Slots are offered in the Owner's zone, so the view shows them there too.
const zone = "Europe/Belgrade";
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

type Day = { label: string; slots: Slot[] };

const byDay = (slots: Slot[]): Day[] => {
  const days: Day[] = [];
  for (const slot of slots) {
    const label = dayLabel.format(new Date(slot.start));
    const last = days.at(-1);
    if (last?.label === label) last.slots.push(slot);
    else days.push({ label, slots: [slot] });
  }
  return days;
};

const inputClass = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

function SlotsView() {
  const { eventTypeId } = Route.useParams();
  const [eventType, setEventType] = useState<EventType>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [chosen, setChosen] = useState<Slot>();
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notice, setNotice] = useState("");

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!chosen) return;
    const result = await createBooking({
      body: { eventTypeId, start: chosen.start, guestName, guestEmail },
    });
    if (result.data) {
      const start = new Date(result.data.start);
      setNotice(`Вы записаны: ${dayLabel.format(start)}, ${timeLabel.format(start)}`);
      setChosen(undefined);
      setGuestName("");
      setGuestEmail("");
    } else {
      setNotice(result.error?.message ?? "Проверьте данные и попробуйте ещё раз.");
    }
    setSlotsVersion((version) => version + 1);
  };

  return (
    <div className="space-y-8 py-6">
      <header className="max-w-md space-y-2">
        <a href="/" className="text-sm text-muted-foreground">
          ← Виды брони
        </a>
        <h1 className="text-3xl font-semibold tracking-tight">{eventType?.name ?? ""}</h1>
        {eventType && (
          <p className="text-muted-foreground">{`${eventType.durationMinutes} минут · ближайшие 14 дней`}</p>
        )}
      </header>

      {notice && <p role="status">{notice}</p>}

      {chosen && (
        <form onSubmit={(event) => void submit(event)} className="max-w-md space-y-3 border-t pt-4">
          <p>{`${dayLabel.format(new Date(chosen.start))}, ${timeLabel.format(new Date(chosen.start))}`}</p>
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
          <Button type="submit" size="lg">
            Записаться
          </Button>
        </form>
      )}

      <div className="space-y-6">
        {byDay(slots).map((day) => (
          <section key={day.label} aria-label={day.label} className="space-y-2">
            <h2 className="font-medium">{day.label}</h2>
            <ul className="flex flex-wrap gap-2">
              {day.slots.map((slot) => {
                const time = timeLabel.format(new Date(slot.start));
                const busy = slot.status === "busy";
                return (
                  <li key={slot.start}>
                    <Button
                      variant={chosen?.start === slot.start ? "default" : "outline"}
                      disabled={busy}
                      aria-label={busy ? `${time} занято` : time}
                      onClick={() => {
                        setChosen(slot);
                        setNotice("");
                      }}
                    >
                      {busy ? `${time} · занято` : time}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
