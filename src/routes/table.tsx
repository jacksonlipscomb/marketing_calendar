import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import {
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusFilter } from "@/components/StatusFilter"
import { cn } from "@/lib/utils"
import {
  useDeliverablesTable,
  type DeliverableTableRow,
} from "@/lib/deliverables"
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  DELIVERABLE_STATUSES,
  type CampaignCategory,
  type CampaignStatus,
  type DeliverableStatus,
} from "@/lib/database.types"
import { downloadCsv } from "@/lib/csv"

const fmtDate = (v: string) => format(new Date(`${v}T00:00:00`), "MMM d, yyyy")
const cap = (v: string) => v.replace("_", " ")

// CSV column order + headers — the 11 visible columns (no internal ids).
const CSV_HEADERS = [
  "Campaign",
  "Campaign start",
  "Campaign end",
  "Category",
  "Campaign status",
  "Campaign owners",
  "Deliverable",
  "Deliverable start",
  "Deliverable end",
  "Deliverable status",
  "Deliverable owners",
]

function rowToCsv(r: DeliverableTableRow): string[] {
  return [
    r.campaign_name,
    r.campaign_start,
    r.campaign_end,
    r.category,
    cap(r.campaign_status),
    r.campaign_owners.join("; "),
    r.deliverable_title,
    r.deliverable_start,
    r.deliverable_end,
    cap(r.deliverable_status),
    r.deliverable_owners.join("; "),
  ]
}

// Global search matches campaign/deliverable names + both owner lists only (not
// dates/status, which have their own chip filters).
const searchFilter: FilterFn<DeliverableTableRow> = (row, _id, value) => {
  const q = String(value).toLowerCase().trim()
  if (!q) return true
  const r = row.original
  return [
    r.campaign_name,
    r.deliverable_title,
    r.campaign_owners.join(" "),
    r.deliverable_owners.join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q)
}

const col = createColumnHelper<DeliverableTableRow>()
const columns = [
  col.accessor("campaign_name", { header: "Campaign" }),
  col.accessor("campaign_start", {
    header: "Campaign start",
    cell: (c) => fmtDate(c.getValue()),
  }),
  col.accessor("campaign_end", {
    header: "Campaign end",
    cell: (c) => fmtDate(c.getValue()),
  }),
  col.accessor("category", { header: "Category", filterFn: "equals" }),
  col.accessor("campaign_status", {
    header: "Campaign status",
    filterFn: "equals",
    cell: (c) => cap(c.getValue()),
  }),
  // Owners → stable joined string ("" when empty) so sort/search are well-defined.
  col.accessor((r) => r.campaign_owners.join(", "), {
    id: "campaign_owners",
    header: "Campaign owners",
  }),
  col.accessor("deliverable_title", {
    header: "Deliverable",
    cell: (c) => (
      <Link
        to="/campaigns/$campaignId/deliverables/$deliverableId"
        params={{
          campaignId: c.row.original.campaign_id,
          deliverableId: c.row.original.deliverable_id,
        }}
        className="font-medium hover:underline"
      >
        {c.getValue()}
      </Link>
    ),
  }),
  col.accessor("deliverable_start", {
    header: "Start",
    cell: (c) => fmtDate(c.getValue()),
  }),
  col.accessor("deliverable_end", {
    header: "End",
    cell: (c) => fmtDate(c.getValue()),
  }),
  col.accessor("deliverable_status", {
    header: "Status",
    filterFn: "equals",
    cell: (c) => cap(c.getValue()),
  }),
  col.accessor((r) => r.deliverable_owners.join(", "), {
    id: "deliverable_owners",
    header: "Deliverable owners",
  }),
]

// /table — one flat, sortable, filterable, exportable grid of every deliverable
// with its parent campaign denormalized onto the row. Grain is one row per
// deliverable, so campaigns with no deliverables don't appear.
export function TablePage() {
  const { data = [], isLoading, error } = useDeliverablesTable()

  const [globalFilter, setGlobalFilter] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [category, setCategory] = useState<CampaignCategory | "all">("all")
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | "all">(
    "all",
  )
  const [deliverableStatus, setDeliverableStatus] = useState<
    DeliverableStatus | "all"
  >("all")

  // The enum chips drive column-equals filters (no per-column header inputs).
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const f: ColumnFiltersState = []
    if (category !== "all") f.push({ id: "category", value: category })
    if (campaignStatus !== "all")
      f.push({ id: "campaign_status", value: campaignStatus })
    if (deliverableStatus !== "all")
      f.push({ id: "deliverable_status", value: deliverableStatus })
    return f
  }, [category, campaignStatus, deliverableStatus])

  // React Compiler can't memoize useReactTable's returned functions; that's a
  // benign non-optimization here because the table instance is consumed only
  // within this component (its functions are never passed into other memoized
  // components, which is the case the warning guards against).
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: searchFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const rows = table.getRowModel().rows

  function exportCsv() {
    // Current filtered + sorted view, in display order.
    const out = rows.map((r) => rowToCsv(r.original))
    downloadCsv("deliverables.csv", CSV_HEADERS, out)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">All deliverables</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <div className="grid gap-2">
        <Input
          placeholder="Search name or owner…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <StatusFilter
          label="Category:"
          options={CAMPAIGN_CATEGORIES}
          value={category}
          onChange={setCategory}
        />
        <StatusFilter
          label="Campaign status:"
          options={CAMPAIGN_STATUSES}
          value={campaignStatus}
          onChange={setCampaignStatus}
        />
        <StatusFilter
          label="Deliverable status:"
          options={DELIVERABLE_STATUSES}
          value={deliverableStatus}
          onChange={setDeliverableStatus}
        />
      </div>

      {error && (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      )}
      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading deliverables…</p>
      )}
      {!isLoading && !error && data.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No deliverables yet. Add deliverables to a campaign to populate this
          view.
        </p>
      )}
      {!isLoading && !error && data.length > 0 && rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No deliverables match the current filters.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        className="px-3 py-2 text-left font-medium whitespace-nowrap"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : "none"
                        }
                      >
                        {/* Button so sorting is keyboard-operable, not mouse-only. */}
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 select-none hover:underline"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <span aria-hidden>
                            {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : ""}
                          </span>
                        </button>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn("border-t", "hover:bg-accent/40")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
