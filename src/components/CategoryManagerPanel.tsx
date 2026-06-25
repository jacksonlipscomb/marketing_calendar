import { useState } from "react"

import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  useCategories,
  useCategoryUsageCounts,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/lib/categories"
import { categoryFormSchema } from "@/lib/schemas"
import type { CategoryRow } from "@/lib/database.types"

const DEFAULT_NEW_COLOR = "#64748b"

// Manage categories on the Campaigns page (PR B). Categories are client-written
// (RLS), so the DB carries the real validation; this form mirrors it for fast
// feedback and surfaces the DB errors (unique name, in-use delete) as friendly
// copy via the category hooks.
export function CategoryManagerPanel() {
  const { data: categories = [], isLoading } = useCategories()
  const usage = useCategoryUsageCounts()
  const createCategory = useCreateCategory()

  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(DEFAULT_NEW_COLOR)
  const [createError, setCreateError] = useState<string | null>(null)

  async function addCategory() {
    setCreateError(null)
    const parsed = categoryFormSchema.safeParse({ name: newName, color: newColor })
    if (!parsed.success) {
      setCreateError(parsed.error.issues[0].message)
      return
    }
    try {
      await createCategory.mutateAsync(parsed.data)
      setNewName("")
      setNewColor(DEFAULT_NEW_COLOR)
    } catch (err) {
      setCreateError((err as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage categories</CardTitle>
        <CardDescription>
          Create, rename, recolor, or delete the campaign categories used across
          the calendar, filters, and forms. A category in use by a campaign can’t
          be deleted until those campaigns are moved or removed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading categories…</p>
        )}

        <ul className="grid gap-2">
          {categories.map((c) => (
            <CategoryRowItem
              key={c.id}
              category={c}
              count={usage.get(c.id) ?? 0}
            />
          ))}
          {!isLoading && categories.length === 0 && (
            <li className="text-muted-foreground text-sm">
              No categories yet — add one below.
            </li>
          )}
        </ul>

        <div className="grid gap-2 border-t pt-4">
          <p className="text-sm font-medium">New category</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              aria-label="New category color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="size-9 shrink-0 cursor-pointer rounded border"
            />
            <Input
              placeholder="Category name"
              aria-label="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={addCategory} disabled={createCategory.isPending}>
              {createCategory.isPending ? "Adding…" : "Add category"}
            </Button>
          </div>
          {createError && (
            <p className="text-destructive text-sm" role="alert">
              {createError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// One category row: read view with Edit/Delete, or an inline edit form. Delete is
// disabled while the category is in use (count > 0); the friendly FK-restrict
// message from useDeleteCategory is the backstop for a stale count.
function CategoryRowItem({
  category,
  count,
}: {
  category: CategoryRow
  count: number
}) {
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setName(category.name)
    setColor(category.color)
    setError(null)
    setEditing(true)
  }

  async function save() {
    setError(null)
    const parsed = categoryFormSchema.safeParse({ name, color })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    try {
      await updateCategory.mutateAsync({ id: category.id, values: parsed.data })
      setEditing(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (editing) {
    return (
      <li className="grid gap-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            aria-label="Category color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="size-9 shrink-0 cursor-pointer rounded border"
          />
          <Input
            aria-label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" onClick={save} disabled={updateCategory.isPending}>
            {updateCategory.isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
            disabled={updateCategory.isPending}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </li>
    )
  }

  const inUse = count > 0
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      <span className="font-medium capitalize">{category.name}</span>
      <span className="text-muted-foreground text-xs">
        {inUse ? `${count} campaign${count === 1 ? "" : "s"}` : "unused"}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={startEdit}>
          Edit
        </Button>
        <ConfirmDeleteButton
          label="Delete"
          title={`Delete “${category.name}”?`}
          description={
            inUse
              ? `This category is used by ${count} campaign${count === 1 ? "" : "s"} and can’t be deleted until they’re moved or removed.`
              : "This permanently removes the category. This cannot be undone."
          }
          pending={deleteCategory.isPending}
          disabled={inUse}
          onConfirm={async () => {
            await deleteCategory.mutateAsync(category.id)
          }}
        />
      </div>
    </li>
  )
}
