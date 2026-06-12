import { cn } from "@/lib/utils"

// Generic single-select status filter ("All" + the given statuses). Used with
// campaign statuses on the list page and deliverable statuses on the detail
// page — the option set is the only difference.
export function StatusFilter<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T | "all"
  onChange: (status: T | "all") => void
}) {
  const all: (T | "all")[] = ["all", ...options]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">Status:</span>
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
