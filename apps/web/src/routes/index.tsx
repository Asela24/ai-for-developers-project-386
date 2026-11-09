import { createFileRoute } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="space-y-12 py-6">
      <header className="max-w-md space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">EasyBook</h1>
        <p className="text-muted-foreground">
          Сервис для записи на звонок. Посмотрите свободное время и забронируйте его.
        </p>
        <a href="/schedule" className={buttonVariants({ size: "lg" })}>
          Открыть расписание
        </a>
      </header>

      <section className="max-w-md space-y-4 border-t pt-8">
        <h2 className="text-lg font-semibold">Возможности</h2>
        <ul className="space-y-4">
          <li>
            <p className="font-medium">14 дней вперёд</p>
            <p className="text-sm text-muted-foreground">Окно записи сдвигается само.</p>
          </li>
          <li>
            <p className="font-medium">Свободно и занято</p>
            <p className="text-sm text-muted-foreground">Сразу видно, какое время можно занять.</p>
          </li>
          <li>
            <p className="font-medium">Одно место — одна запись</p>
            <p className="text-sm text-muted-foreground">Занятое время больше не предлагается.</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
