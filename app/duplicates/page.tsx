import { AppShell } from "@/components/cockpit/app-shell"
import { DuplicatesWorkbench } from "@/components/cockpit/duplicates-workbench"
import { getDupClusters, getStagingCis } from "@/lib/queries"
import type { StagingCi } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function DuplicatesPage() {
  const [clusters, cis] = await Promise.all([getDupClusters(), getStagingCis()])

  const cisById: Record<number, StagingCi> = {}
  for (const ci of cis) cisById[ci.id] = ci

  return (
    <AppShell
      title="Duplicates"
      subtitle="Identity agent clusters — review evidence, pick survivors, approve merges"
    >
      <DuplicatesWorkbench clusters={clusters} cisById={cisById} />
    </AppShell>
  )
}
