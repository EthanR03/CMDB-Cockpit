"use client"

import { useMemo, useState, useTransition } from "react"
import { AlertTriangle, Check, Copy, Download, ExternalLink, FileDown, X } from "lucide-react"
import { toast } from "sonner"
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

/**
 * Admin-ready manual-apply bundle for a rule — mirrors exactly what
 * lib/servicenow.ts snCreateIdentificationRule() would POST, so an admin can
 * recreate the same records by hand when the Table API write is blocked (ACL).
 */
function buildAdminExport(rule: IreRuleProposal, snTeamTag: string | null) {
  const criteria = (rule.criteria ?? []) as Criteria
  const name =
    snTeamTag && !rule.ruleName.startsWith(snTeamTag)
      ? `${snTeamTag}_${rule.ruleName}`
      : rule.ruleName
  return {
    _instructions:
      "Create one cmdb_identifier record, then one cmdb_identifier_entry per criterion (priority ascending). Field values match what CMDB Cockpit would POST via the Table API.",
    cmdb_identifier: {
      name,
      applies_to: rule.ciClass,
      active: true,
      description:
        rule.rationale ?? "Created by CMDB Cockpit (Rulewright proposal, human-approved)",
    },
    cmdb_identifier_entry: criteria.map((c) => ({
      criterion_attributes: c.attributes.join(","),
      priority: c.priority * 100,
      active: true,
      allow_null_attribute: Boolean(c.allowNull),
    })),
    _coverage: (rule.coverage ?? []) as Coverage,
  }
}

function SnSyncStrip({
  rule,
  snInstanceUrl,
}: {
  rule: IreRuleProposal
  snInstanceUrl: string | null
}) {
  if (rule.snSyncStatus === "created") {
    const sysId = rule.snIdentifierSysId
    const href =
      snInstanceUrl && sysId ? `${snInstanceUrl}/cmdb_identifier.do?sys_id=${sysId}` : null
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-success/10 px-4 py-2">
        <Check className="size-3.5 text-success" aria-hidden="true" />
        <span className="text-xs text-success">Created in ServiceNow ✓</span>
        {sysId ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-success underline-offset-2 hover:underline"
            >
              {sysId.slice(0, 12)}…
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : (
            <code className="ml-auto font-mono text-[11px] text-success">{sysId}</code>
          )
        ) : null}
        {rule.snEntrySysIds?.length ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            +{rule.snEntrySysIds.length} entr{rule.snEntrySysIds.length === 1 ? "y" : "ies"}
          </span>
        ) : null}
      </div>
    )
  }
  if (rule.snSyncStatus === "failed") {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-destructive/10 px-4 py-2">
        <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
        <span className="text-xs text-destructive">
          ServiceNow creation failed{rule.snSyncError ? ` — ${rule.snSyncError}` : ""}. Export
          for admin below.
        </span>
      </div>
    )
  }
  return null
}

function AdminExportPanel({
  rule,
  snTeamTag,
}: {
  rule: IreRuleProposal
  snTeamTag: string | null
}) {
  const json = useMemo(
    () => JSON.stringify(buildAdminExport(rule, snTeamTag), null, 2),
    [rule, snTeamTag]
  )

  function download() {
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ire-rule-${rule.ciClass}-${rule.id}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success("Downloaded rule export for admin")
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(json)
      toast.success("Copied rule JSON to clipboard")
    } catch {
      toast.error("Copy blocked — use Download instead")
    }
  }

  return (
    <div className="border-t border-border bg-secondary/40 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Admin-ready cmdb_identifier payload
        </h3>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-6 rounded-sm border-border bg-transparent text-[11px] text-muted-foreground hover:text-foreground"
            onClick={copy}
          >
            <Copy className="size-3" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 rounded-sm border-border bg-transparent text-[11px] text-muted-foreground hover:text-foreground"
            onClick={download}
          >
            <Download className="size-3" />
            Download .json
          </Button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto rounded-sm border border-border bg-card p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
        {json}
      </pre>
    </div>
  )
}

function RuleCard({
  rule,
  snInstanceUrl,
  snTeamTag,
  isPending,
  onReview,
}: {
  rule: IreRuleProposal
  snInstanceUrl: string | null
  snTeamTag: string | null
  isPending: boolean
  onReview: (id: number, verdict: "approved" | "rejected") => void
}) {
  const [showExport, setShowExport] = useState(false)
  const criteria = (rule.criteria ?? []) as Criteria
  const coverage = (rule.coverage ?? []) as Coverage
  const syncFailed = rule.snSyncStatus === "failed"

  return (
    <article className="flex flex-col rounded-sm border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{rule.ruleName}</h2>
        <ClassBadge ciClass={rule.ciClass} />
        <span className="ml-auto">
          <StatusBadge status={rule.status} />
        </span>
      </header>

      <SnSyncStrip rule={rule} snInstanceUrl={snInstanceUrl} />

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

      {showExport ? <AdminExportPanel rule={rule} snTeamTag={snTeamTag} /> : null}

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        <Button
          size="sm"
          variant="outline"
          aria-expanded={showExport}
          className={
            syncFailed
              ? "h-7 rounded-sm border-warning/50 bg-transparent text-xs text-warning hover:bg-warning/10"
              : "h-7 rounded-sm border-border bg-transparent text-xs text-muted-foreground hover:text-foreground"
          }
          onClick={() => setShowExport((v) => !v)}
        >
          <FileDown className="size-3.5" />
          {showExport ? "Hide export" : "Export for admin"}
        </Button>

        {rule.status === "pending" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-sm border-destructive/50 text-xs text-destructive hover:bg-destructive/10 bg-transparent"
              disabled={isPending}
              onClick={() => onReview(rule.id, "rejected")}
            >
              <X className="size-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-7 rounded-sm bg-primary text-xs text-primary-foreground hover:bg-primary/90"
              disabled={isPending}
              onClick={() => onReview(rule.id, "approved")}
            >
              <Check className="size-3.5" />
              Approve rule
            </Button>
          </div>
        ) : null}
      </footer>
    </article>
  )
}

export function RulesReview({
  rules,
  snInstanceUrl = null,
  snTeamTag = null,
}: {
  rules: IreRuleProposal[]
  snInstanceUrl?: string | null
  snTeamTag?: string | null
}) {
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
          {filtered.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              snInstanceUrl={snInstanceUrl}
              snTeamTag={snTeamTag}
              isPending={isPending}
              onReview={review}
            />
          ))}
        </div>
      )}
    </div>
  )
}
