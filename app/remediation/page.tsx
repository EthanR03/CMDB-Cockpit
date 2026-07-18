import { AppShell } from "@/components/cockpit/app-shell"
import { RemediationQueue } from "@/components/cockpit/remediation-queue"
import { getRemediations } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function RemediationPage() {
  const items = await getRemediations()

  return (
    <AppShell
      title="Remediation"
      subtitle="Approved actions staged for apply, each with a rollback snapshot"
    >
      <RemediationQueue items={items} />
    </AppShell>
  )
}
