import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

const features = [
  "Выбор типа события и свободного Slot в ближайшие 14 дней.",
  "Бронирование за минуту: только имя и почта.",
  "Страница Owner: типы событий и предстоящие бронирования.",
];

function Home() {
  return (
    <main className="min-h-[calc(100vh-3.75rem)] bg-[radial-gradient(ellipse_at_15%_10%,oklch(0.86_0.08_258/0.7),transparent_55%),radial-gradient(ellipse_at_80%_0%,oklch(0.93_0.05_55/0.8),transparent_50%)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2">
        <section className="space-y-6">
          <span className="inline-block rounded-full border bg-background px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Быстрое бронирование времени
          </span>
          <h1 className="text-5xl font-bold tracking-tight">EasyBook</h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Забронируйте время с Owner за минуту: выберите тип события и свободный Slot.
          </p>
          <Link
            to="/event-types"
            className={buttonVariants({
              size: "lg",
              className: "h-12 rounded-xl px-6 text-base",
            })}
          >
            Забронировать →
          </Link>
        </section>
        <section
          aria-labelledby="features"
          className="rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur"
        >
          <h2 id="features" className="mb-4 text-xl font-semibold">
            Возможности
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {features.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
