import { cn } from "@/lib/utils"
import { RANGE_KEYS, type RangeKey } from "@/lib/campaigns"

const RANGE_LABELS: Record<RangeKey, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  all: "All",
}

// Time-range filter for the campaign list (overlap semantics — a campaign
// counts as "in" a range when it overlaps it at all; see lib/campaigns.ts).
// Phase 3's timeline zoom reads the same uiStore value.
export function RangeFilter({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (range: RangeKey) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">Range:</span>
      {RANGE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          data-testid={`range-${key}`}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === key
              ? "bg-primary text-primary-foreground border-transparent"
              : "bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          {RANGE_LABELS[key]}
        </button>
      ))}
    </div>
  )
}
