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
    <main className="mx-auto grid max-w-5xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1.4fr_1fr] md:gap-16">
      <section className="space-y-6">
        <p className="text-sm text-muted-foreground">Быстрое бронирование времени</p>
        <h1 className="text-4xl font-semibold tracking-tight">EasyBook</h1>
        <p className="max-w-md text-muted-foreground">
          Забронируйте время с Owner за минуту: выберите тип события и свободный Slot.
        </p>
        <Link to="/event-types" className={buttonVariants({ className: "h-10 px-5" })}>
          Забронировать →
        </Link>
      </section>
      <section aria-labelledby="features" className="md:border-l md:pl-12">
        <h2 id="features" className="mb-4 text-sm font-medium">
          Возможности
        </h2>
        <ul className="divide-y text-sm text-muted-foreground">
          {features.map((feature) => (
            <li key={feature} className="py-3 first:pt-0">
              {feature}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
