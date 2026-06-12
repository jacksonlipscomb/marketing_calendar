import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// Destructive-action guard: the visible button only opens this dialog; the
// delete runs solely from the confirm button inside it. Cascades make these
// deletes multi-table (campaign → deliverables → email_jobs), so a stray
// click must never be enough.
export function ConfirmDeleteButton({
  label,
  title,
  description,
  onConfirm,
  pending,
}: {
  label: string
  title: string
  description: string
  onConfirm: () => Promise<void>
  pending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function confirm() {
    setErrorMsg(null)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {errorMsg && (
            <p className="text-destructive text-sm" role="alert">
              {errorMsg}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
