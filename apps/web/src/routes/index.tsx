import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listEventTypes, type EventType } from "@/client";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
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
    <div className="space-y-12 py-6">
      <header className="max-w-md space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">EasyBook</h1>
        <p className="text-muted-foreground">Виды брони</p>
      </header>

      <ul className="max-w-md space-y-4">
        {eventTypes.map((eventType) => (
          <li key={eventType.id} className="space-y-2 border-t pt-4">
            <a href={`/event-types/${eventType.id}`} className={buttonVariants({ size: "lg" })}>
              {eventType.name}
            </a>
            <p>{eventType.description}</p>
            <p className="text-sm text-muted-foreground">{`${eventType.durationMinutes} минут`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
