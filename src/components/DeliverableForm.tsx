import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OwnersInput } from "@/components/OwnersInput"
import { deliverableFormSchema, type DeliverableFormValues } from "@/lib/schemas"
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from "@/lib/database.types"

// Shared create/edit deliverable form (page pattern). The page owns the
// mutation; this component owns fields + validation.
export function DeliverableForm({
  defaultValues,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaultValues?: Partial<DeliverableFormValues>
  submitLabel: string
  onSubmit: (values: DeliverableFormValues) => Promise<void>
  pending: boolean
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<DeliverableFormValues>({
    resolver: zodResolver(deliverableFormSchema),
    defaultValues: {
      title: "",
      details: "",
      due_date: "",
      owners: [],
      status: "backlog",
      ...defaultValues,
    },
  })
  const errors = form.formState.errors

  async function submit(values: DeliverableFormValues) {
    setErrorMsg(null)
    try {
      await onSubmit(values)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} />
        {errors.title && (
          <p className="text-destructive text-xs">{errors.title.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="details">Details</Label>
        <Textarea
          id="details"
          rows={3}
          placeholder="The product / end result, e.g. photos to put in the newsletter"
          {...form.register("details")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" type="date" {...form.register("due_date")} />
          {errors.due_date && (
            <p className="text-destructive text-xs">{errors.due_date.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as DeliverableStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="owners">Owners</Label>
        <Controller
          control={form.control}
          name="owners"
          render={({ field }) => (
            <OwnersInput
              id="owners"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {errorMsg && (
        <p className="text-destructive text-sm" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
