import { cn } from "@/lib/utils"

// Presentational multi-select chip filter — generic over the option set, like the
// single-select StatusFilter, but caller-controlled with a selected array (mirrors
// CategoryFilter). All-selected is the no-filter state, so there is no "All" chip.
export function StatusMultiFilter<T extends string>({
  options,
  value,
  onToggle,
  label = "Status:",
}: {
  options: readonly T[]
  value: T[]
  onToggle: (status: T) => void
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      {options.map((status) => {
        const active = value.includes(status)
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            data-testid={`status-${status}`}
            onClick={() => onToggle(status)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              active
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
          >
            {status.replace("_", " ")}
          </button>
        )
      })}
    </div>
  )
}
