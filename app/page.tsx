import { AppShell } from "@/components/cockpit/app-shell"
import { Dashboard } from "@/components/cockpit/dashboard"
import { getDashboardData } from "@/lib/analytics"

export const dynamic = "force-dynamic"

export default async function OverviewPage() {
  const data = await getDashboardData()

  return (
    <AppShell title="Overview" subtitle="Intake health across the staging bundle">
      <Dashboard data={data} />
    </AppShell>
  )
}
