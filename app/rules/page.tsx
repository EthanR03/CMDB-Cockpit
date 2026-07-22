import { AppShell } from "@/components/cockpit/app-shell"
import { RulesReview } from "@/components/cockpit/rules-review"
import { getIreRuleProposals } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function RulesPage() {
  const rules = await getIreRuleProposals()

  return (
    <AppShell
      title="IRE Rules"
      subtitle="Rulewright-authored identification rules with coverage evidence"
    >
      <RulesReview
        rules={rules}
        snInstanceUrl={process.env.SERVICENOW_INSTANCE_URL?.replace(/\/+$/, "") ?? null}
        snTeamTag={process.env.SERVICENOW_TEAM_IDENTIFIER ?? null}
      />
    </AppShell>
  )
}
