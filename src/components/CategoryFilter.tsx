import { cn } from "@/lib/utils"
import { useUiStore } from "@/lib/uiStore"
import { EVENT_CATEGORIES } from "@/lib/database.types"

// Feature 4: category filter. Pure toggle UI over useUiStore.activeCategories —
// CalendarMonth already filters what it renders by that array, so flipping a
// toggle here updates the calendar with no extra wiring.
export function CategoryFilter() {
  const { activeCategories, toggleCategory } = useUiStore()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">Show:</span>
      {EVENT_CATEGORIES.map((category) => {
        const active = activeCategories.includes(category)
        return (
          <button
            key={category}
            type="button"
            aria-pressed={active}
            data-testid={`filter-${category}`}
            onClick={() => toggleCategory(category)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              active
                ? "border-transparent text-white"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
            style={
              active
                ? { backgroundColor: `var(--cat-${category})` }
                : undefined
            }
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
