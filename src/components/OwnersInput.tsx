import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Tag-style input for multi-owner fields. The value is a real string[] (the DB
// column is text[], CLAUDE.md → Stack) — names are added as chips on Enter or
// comma, never stored as comma-joined text. Controlled: wire `value`/`onChange`
// through a react-hook-form Controller.
export function OwnersInput({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string[]
  onChange: (owners: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  function commitDraft() {
    const name = draft.trim().replace(/,+$/, "")
    setDraft("")
    if (!name || value.includes(name)) return
    onChange([...value, name])
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commitDraft()
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((owner) => (
            <Badge key={owner} variant="secondary" className="gap-1">
              {owner}
              <button
                type="button"
                aria-label={`Remove ${owner}`}
                onClick={() => onChange(value.filter((o) => o !== owner))}
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitDraft}
        placeholder="Type a name, press Enter"
      />
    </div>
  )
}
