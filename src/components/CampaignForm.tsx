import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OwnersInput } from "@/components/OwnersInput"
import { campaignFormSchema, type CampaignFormValues } from "@/lib/schemas"
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  type CampaignCategory,
  type CampaignStatus,
} from "@/lib/database.types"

// Shared create/edit campaign form (page pattern — rendered on a route, not in a
// dialog). The page owns the mutation; this component owns fields + validation.
export function CampaignForm({
  defaultValues,
  submitLabel,
  onSubmit,
  pending,
}: {
  defaultValues?: Partial<CampaignFormValues>
  submitLabel: string
  onSubmit: (values: CampaignFormValues) => Promise<void>
  pending: boolean
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      goal: "",
      category: "recruiting",
      start_date: "",
      end_date: "",
      segmentation: "",
      owners: [],
      status: "planned",
      reminders_enabled: true,
      ...defaultValues,
    },
  })
  const errors = form.formState.errors

  async function submit(values: CampaignFormValues) {
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
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="goal">Goal</Label>
        <Input
          id="goal"
          placeholder='e.g. "raise $500k" or "recruit 50 new athletes"'
          {...form.register("goal")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as CampaignCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as CampaignStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_STATUSES.map((s) => (
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

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" type="date" {...form.register("start_date")} />
          {errors.start_date && (
            <p className="text-destructive text-xs">
              {errors.start_date.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" type="date" {...form.register("end_date")} />
          {errors.end_date && (
            <p className="text-destructive text-xs">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="segmentation">Segmentation</Label>
        <Input
          id="segmentation"
          placeholder='e.g. "donors only" or "current + alumni athletes"'
          {...form.register("segmentation")}
        />
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

      <div className="flex items-center gap-2">
        <input
          id="reminders_enabled"
          type="checkbox"
          className="size-4"
          {...form.register("reminders_enabled")}
        />
        <Label htmlFor="reminders_enabled">
          Send deliverable reminders for this campaign
        </Label>
      </div>
      <p className="text-muted-foreground text-xs">
        Reminder emails arrive with Phase 4 — this toggle is stored now so
        existing campaigns are configured when they do.
      </p>

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
