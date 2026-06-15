import { cn } from "@/lib/utils"

// Generic single-select chip filter ("All" + the given options). Used for
// campaign/deliverable statuses (and, with a label, the table's category and
// status filters) — the option set and label are the only differences.
export function StatusFilter<T extends string>({
  options,
  value,
  onChange,
  label = "Status:",
}: {
  options: readonly T[]
  value: T | "all"
  onChange: (status: T | "all") => void
  label?: string
}) {
  const all: (T | "all")[] = ["all", ...options]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      {all.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={value === status}
          data-testid={`status-${status}`}
          onClick={() => onChange(status)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
            value === status
              ? "bg-primary text-primary-foreground border-transparent"
              : "bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          {status === "all" ? "All" : status.replace("_", " ")}
        </button>
      ))}
    </div>
  )
}
