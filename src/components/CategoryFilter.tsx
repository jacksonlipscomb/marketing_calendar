import { cn } from "@/lib/utils"
import { CAMPAIGN_CATEGORIES, type CampaignCategory } from "@/lib/database.types"

// Presentational campaign-category toggle filter. Controlled by the caller so the
// same UI serves the calendar (wired to uiStore.activeCategories) and the campaign
// list (wired to uiStore.campaignCategories) — two independent selections.
export function CategoryFilter({
  value,
  onToggle,
  label = "Show:",
}: {
  value: CampaignCategory[]
  onToggle: (category: CampaignCategory) => void
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      {CAMPAIGN_CATEGORIES.map((category) => {
        const active = value.includes(category)
        return (
          <button
            key={category}
            type="button"
            aria-pressed={active}
            data-testid={`filter-${category}`}
            onClick={() => onToggle(category)}
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
