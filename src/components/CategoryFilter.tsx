import { cn } from "@/lib/utils"
import type { CategoryRow } from "@/lib/database.types"

// Presentational campaign-category toggle filter. Controlled by the caller so the
// same UI serves the calendar and the campaign list (two independent selections).
// `value` is the set of SELECTED (visible) category ids — the caller derives it
// from its hidden-set store slice and toggles by id. Colors come from each row.
export function CategoryFilter({
  categories,
  value,
  onToggle,
  label = "Show:",
}: {
  categories: CategoryRow[]
  value: string[]
  onToggle: (id: string) => void
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      {categories.map((category) => {
        const active = value.includes(category.id)
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={active}
            data-testid={`filter-${category.id}`}
            onClick={() => onToggle(category.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              active
                ? "border-transparent text-white"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
            style={active ? { backgroundColor: category.color } : undefined}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
