"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClassBadge, StatusBadge } from "@/components/cockpit/badges"
import { reviewIreRule } from "@/app/actions/review"
import type { IreRuleProposal } from "@/lib/db/schema"

type Criteria = {
  priority: number
  attributes: string[]
  allowNull?: boolean
}[]

type Coverage = {
  attribute: string
  pct: number
}[]

export function RulesReview({ rules }: { rules: IreRuleProposal[] }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(
    () =>
      statusFilter === "all" ? rules : rules.filter((r) => r.status === statusFilter),
    [rules, statusFilter]
  )

  function review(id: number, verdict: "approved" | "rejected") {
    startTransition(async () => {
      await reviewIreRule(id, verdict)
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger
            className="h-8 w-40 rounded-sm border-border bg-secondary text-xs"
            aria-label="Filter rules by status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} proposals
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No IRE rule proposals yet. Run the pipeline to let Rulewright analyze field coverage.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((rule) => {
            const criteria = (rule.criteria ?? []) as Criteria
            const coverage = (rule.coverage ?? []) as Coverage
            return (
              <article
                key={rule.id}
                className="flex flex-col rounded-sm border border-border bg-card"
              >
                <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">{rule.ruleName}</h2>
                  <ClassBadge ciClass={rule.ciClass} />
                  <span className="ml-auto">
                    <StatusBadge status={rule.status} />
                  </span>
                </header>

                <div className="flex flex-col gap-3 p-4">
                  <div>
                    <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Identification criteria (priority order)
                    </h3>
                    <ol className="flex flex-col gap-1.5">
                      {criteria.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-sm border border-border bg-secondary px-2.5 py-1.5"
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary/15 font-mono text-[10px] text-chart-1">
                            {c.priority}
                          </span>
                          <code className="font-mono text-xs text-foreground">
                            {c.attributes.join(" + ")}
                          </code>
                          {c.allowNull ? (
                            <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                              allow null
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {coverage.length > 0 ? (
                    <div>
                      <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        Field coverage in staging
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {coverage.map((c) => (
                          <div key={c.attribute} className="flex items-center gap-2">
                            <code className="w-32 shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                              {c.attribute}
                            </code>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted">
                              <div
                                className={
                                  c.pct >= 85
                                    ? "h-full bg-success"
                                    : c.pct >= 60
                                      ? "h-full bg-warning"
                                      : "h-full bg-destructive"
                                }
                                style={{ width: `${c.pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                              {c.pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {rule.rationale ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-chart-1">
                        rulewright:{" "}
                      </span>
                      {rule.rationale}
                    </p>
                  ) : null}
                </div>

                {rule.status === "pending" ? (
                  <footer className="mt-auto flex justify-end gap-2 border-t border-border px-4 py-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-sm border-destructive/50 text-xs text-destructive hover:bg-destructive/10 bg-transparent"
                      disabled={isPending}
                      onClick={() => review(rule.id, "rejected")}
                    >
                      <X className="size-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 rounded-sm bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                      disabled={isPending}
                      onClick={() => review(rule.id, "approved")}
                    >
                      <Check className="size-3.5" />
                      Approve rule
                    </Button>
                  </footer>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
