// There is one Owner and no stored name, so the card shows the role with a neutral avatar.
export function OwnerBadge() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-primary">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold">Owner</p>
        <p className="text-xs text-muted-foreground">EasyBook</p>
      </div>
    </div>
  );
}

export function DurationPill({ minutes }: { minutes: number }) {
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
      {`${minutes} мин`}
    </span>
  );
}
