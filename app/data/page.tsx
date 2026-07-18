import { AppShell } from "@/components/cockpit/app-shell"
import { DataBrowser } from "@/components/cockpit/data-browser"
import { getStagingWithFindings } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function DataGapsPage() {
  const rows = await getStagingWithFindings()

  return (
    <AppShell title="Data & Gaps" subtitle="Staged CIs with Profiler gap findings">
      <DataBrowser rows={rows} />
    </AppShell>
  )
}
