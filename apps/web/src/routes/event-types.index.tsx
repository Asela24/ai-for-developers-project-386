import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listEventTypes, type EventType } from "@/client";
import { Duration, OwnerBadge } from "@/components/owner-badge";

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
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-14 sm:px-6">
      <header className="space-y-6">
        <OwnerBadge />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Выберите тип события</h1>
          <p className="text-sm text-muted-foreground">
            Нажмите на тип события, чтобы выбрать день и свободный Slot.
          </p>
        </div>
      </header>

      <ul className="divide-y border-y">
        {eventTypes.map((eventType) => (
          <li key={eventType.id}>
            <Link
              to="/event-types/$eventTypeId"
              params={{ eventTypeId: eventType.id }}
              aria-label={eventType.name}
              className="group flex items-start justify-between gap-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="space-y-1">
                <h2 className="font-medium transition-colors group-hover:text-primary">
                  {eventType.name}
                </h2>
                <p className="text-sm text-muted-foreground">{eventType.description}</p>
              </div>
              <Duration minutes={eventType.durationMinutes} />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
