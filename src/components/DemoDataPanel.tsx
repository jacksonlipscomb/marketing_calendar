import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDeleteSeedData, useGenerateDemoData } from "@/lib/demoData"

// Demo/testing tool on the Campaigns page: one click fills the project with a
// realistic year of campaigns + deliverables; Purge removes only that generated
// data (the cascade behind the campaign delete clears the children). It writes
// campaigns/deliverables only — never email_jobs.
export function DemoDataPanel() {
  const generate = useGenerateDemoData()
  const purge = useDeleteSeedData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>
          Synthetic campaigns and deliverables for demos and testing. Generate
          replaces any existing demo data with a fresh year; Purge removes only
          it — campaigns you create yourself are never touched. If a generate run
          fails partway, click Generate again to reset.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending || purge.isPending}
        >
          {generate.isPending ? "Generating…" : "Generate demo data"}
        </Button>
        <ConfirmDeleteButton
          label="Purge demo data"
          title="Purge all demo data?"
          description="This permanently deletes every generated demo campaign and its deliverables. Campaigns you created yourself are not affected."
          pending={purge.isPending}
          disabled={generate.isPending}
          onConfirm={async () => {
            await purge.mutateAsync()
            // Drop the stale "Added N…" line — it no longer reflects the data.
            generate.reset()
          }}
        />
        {generate.error && (
          <p className="text-destructive text-sm" role="alert">
            {(generate.error as Error).message}
          </p>
        )}
        {generate.data && (
          <p className="text-muted-foreground text-sm">
            Added {generate.data.campaigns} campaigns ·{" "}
            {generate.data.deliverables} deliverables.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
