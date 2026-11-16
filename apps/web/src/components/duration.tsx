/** The duration pill of an Event type. */
export function Duration({ minutes }: { minutes: number }) {
  return (
    <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground tabular-nums">
      {`${minutes} мин`}
    </span>
  );
}
