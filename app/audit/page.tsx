import { AppShell } from "@/components/cockpit/app-shell"
import { StatusBadge } from "@/components/cockpit/badges"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAgentRuns, getDecisions } from "@/lib/queries"

export const dynamic = "force-dynamic"

export default async function AuditPage() {
  const [decisions, runs] = await Promise.all([getDecisions(), getAgentRuns()])

  return (
    <AppShell title="Audit" subtitle="Every human decision and agent run, in order">
      <div className="grid grid-cols-1 gap-6 p-4 md:p-6 xl:grid-cols-2">
        <section aria-labelledby="decisions-heading">
          <h2
            id="decisions-heading"
            className="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Review decisions ({decisions.length})
          </h2>
          <div className="rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-[10px] uppercase">Entity</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">ID</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Decision</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">By</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.map((d) => (
                  <TableRow key={d.id} className="border-border">
                    <TableCell className="text-xs text-foreground">{d.entityType}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.entityId}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.decision} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.decidedBy}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {decisions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No decisions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </section>

        <section aria-labelledby="runs-heading">
          <h2
            id="runs-heading"
            className="mb-2 font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Agent runs ({runs.length})
          </h2>
          <div className="rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-[10px] uppercase">Agent</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Summary</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell className="text-xs font-medium capitalize text-foreground">
                      {r.agent}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="max-w-72 truncate text-xs text-muted-foreground">
                      {r.summary ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {new Date(r.startedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      No agent runs yet. Use Run Pipeline in the header.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
