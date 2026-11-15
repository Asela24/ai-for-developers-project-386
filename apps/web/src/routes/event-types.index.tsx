import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listEventTypes, type EventType } from "@/client";
import { DurationPill, OwnerBadge } from "@/components/owner-badge";

export const Route = createFileRoute("/event-types/")({ component: Catalog });

function Catalog() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  useEffect(() => {
    void listEventTypes()
      .then((result) => {
        if (result.data) setEventTypes(result.data);
      })
      .catch(() => {
        // The heading stays up when the server is unreachable.
      });
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-4 rounded-2xl border bg-card p-6 shadow-xs">
        <OwnerBadge />
        <h1 className="text-3xl font-bold tracking-tight">Выберите тип события</h1>
        <p className="text-sm text-muted-foreground">
          Нажмите на карточку, чтобы выбрать день и свободный Slot.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {eventTypes.map((eventType) => (
          <li key={eventType.id}>
            <Link
              to="/event-types/$eventTypeId"
              params={{ eventTypeId: eventType.id }}
              aria-label={eventType.name}
              className="block h-full space-y-3 rounded-2xl border bg-card p-6 shadow-xs transition hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{eventType.name}</h2>
                <DurationPill minutes={eventType.durationMinutes} />
              </div>
              <p className="text-sm text-muted-foreground">{eventType.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
