// There is one Owner and no stored name, so the card shows the role with a neutral avatar.
export function OwnerBadge() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0z" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-medium">Owner</p>
        <p className="text-xs text-muted-foreground">EasyBook</p>
      </div>
    </div>
  );
}

export function Duration({ minutes }: { minutes: number }) {
  return (
    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{`${minutes} мин`}</span>
  );
}
