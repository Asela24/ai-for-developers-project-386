import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Календарь звонков</h1>
      <Button>Hello</Button>
    </div>
  );
}
