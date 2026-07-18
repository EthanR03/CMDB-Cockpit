import { AppShell } from "@/components/cockpit/app-shell"
import { ServiceMap } from "@/components/cockpit/service-map"
import { getStagingCis, getTopologyProposals } from "@/lib/queries"
import type { StagingCi } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function MapPage() {
  const [topologies, cis] = await Promise.all([getTopologyProposals(), getStagingCis()])

  const cisById: Record<number, StagingCi> = {}
  for (const ci of cis) cisById[ci.id] = ci

  return (
    <AppShell
      title="Service Map"
      subtitle="Cartographer topology proposals with relationships and endpoints"
    >
      <ServiceMap topologies={topologies} cisById={cisById} />
    </AppShell>
  )
}
