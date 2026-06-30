import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useUiStore } from "@/lib/uiStore"

// Header light/dark switch. Reads the theme slice and flips it via the store
// (which toggles the `dark` class on <html> and persists the choice). The icon
// shows the destination: a Sun in dark mode (click → light), a Moon in light mode
// (click → dark). Fixed `size-4` icon so the header never shifts on swap.
export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const label =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  )
}
