"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, Crown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ClassBadge,
  ConfidenceMeter,
  StatusBadge,
} from "@/components/cockpit/badges"
import { reviewDupCluster } from "@/app/actions/review"
import { cn } from "@/lib/utils"
import type { DupCluster, StagingCi } from "@/lib/db/schema"

const COMPARE_FIELDS: Array<{ key: keyof StagingCi; label: string }> = [
  { key: "name", label: "Name" },
  { key: "ciClass", label: "Class" },
  { key: "serialNumber", label: "Serial" },
  { key: "macAddress", label: "MAC" },
  { key: "ipAddress", label: "IP" },
  { key: "fqdn", label: "FQDN" },
  { key: "owner", label: "Owner" },
  { key: "supportGroup", label: "Support group" },
  { key: "environment", label: "Env" },
  { key: "lifecycleStatus", label: "Lifecycle" },
  { key: "os", label: "OS" },
  { key: "model", label: "Model" },
  { key: "location", label: "Location" },
]

export function DuplicatesWorkbench({
  clusters,
  cisById,
}: {
  clusters: DupCluster[]
  cisById: Record<number, StagingCi>
}) {
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? clusters
        : clusters.filter((c) => c.status === statusFilter),
    [clusters, statusFilter]
  )

  const selected =
    filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null

  const members = selected
    ? (selected.ciIds as number[]).map((id) => cisById[id]).filter(Boolean)
    : []

  function review(verdict: "approved" | "rejected") {
    if (!selected) return
    startTransition(async () => {
      await reviewDupCluster(selected.id, verdict)
    })
  }

  return (
    <div className="flex flex-col md:h-[calc(100vh-8.5rem)] md:flex-row">
      {/* Cluster list */}
      <div className="flex w-full shrink-0 flex-col border-b border-border md:w-64 md:border-b-0 md:border-r lg:w-72">
        <div className="border-b border-border px-3 py-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "pending")}>
            <SelectTrigger
              className="h-8 w-full rounded-sm border-border bg-secondary text-xs"
              aria-label="Filter clusters by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All clusters</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="max-h-56 overflow-y-auto md:max-h-none md:min-h-0 md:flex-1">
          <ul className="flex flex-col">
            {filtered.map((c) => {
              const active = selected?.id === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition-colors",
                      active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-xs text-foreground">
                        {c.clusterKey}
                      </span>
                      <span className="ml-auto shrink-0">
                        <StatusBadge status={c.status} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {(c.ciIds as number[]).length} records
                      </span>
                      {c.confidence !== null ? (
                        <ConfidenceMeter value={Number(c.confidence)} />
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-8 text-center text-xs text-muted-foreground">
                No clusters with this status. Run the Identity agent to detect duplicates.
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      {/* Comparison surface */}
      {selected ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="font-mono text-xs text-muted-foreground">
              cluster #{selected.id}
            </span>
            {selected.confidence !== null ? (
              <ConfidenceMeter value={Number(selected.confidence)} />
            ) : null}
            <StatusBadge status={selected.status} />
            {selected.status === "pending" ? (
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-sm border-destructive/50 text-xs text-destructive hover:bg-destructive/10 bg-transparent"
                  disabled={isPending}
                  onClick={() => review("rejected")}
                >
                  <X className="size-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="h-7 rounded-sm bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                  disabled={isPending}
                  onClick={() => review("approved")}
                >
                  <Check className="size-3.5" />
                  Approve merge
                </Button>
              </div>
            ) : null}
          </div>

          {selected.rationale ? (
            <div className="border-b border-border bg-secondary/50 px-4 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wide text-chart-1">
                  identity agent:{" "}
                </span>
                {selected.rationale}
              </p>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-125 border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="w-28 border border-border bg-secondary p-2 text-left font-mono text-[10px] uppercase text-muted-foreground">
                      Field
                    </th>
                    {members.map((m) => (
                      <th
                        key={m.id}
                        className={cn(
                          "border border-border bg-secondary p-2 text-left",
                          m.id === selected.survivorId && "bg-primary/10"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {m.id === selected.survivorId ? (
                            <Crown className="size-3.5 text-warning" aria-hidden="true" />
                          ) : null}
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{m.id}
                          </span>
                          {m.id === selected.survivorId ? (
                            <span className="rounded-sm bg-warning/15 px-1 py-0.5 font-mono text-[9px] uppercase text-warning">
                              survivor
                            </span>
                          ) : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FIELDS.map(({ key, label }) => {
                    const values = members.map((m) => m[key])
                    const distinct = new Set(
                      values.map((v) => (v === null || v === "" ? "∅" : String(v)))
                    )
                    const conflict = distinct.size > 1
                    return (
                      <tr key={key}>
                        <td className="border border-border p-2 font-mono text-[10px] uppercase text-muted-foreground">
                          {label}
                        </td>
                        {members.map((m) => {
                          const v = m[key]
                          const empty = v === null || v === undefined || v === ""
                          return (
                            <td
                              key={m.id}
                              className={cn(
                                "border border-border p-2",
                                m.id === selected.survivorId && "bg-primary/5",
                                conflict && !empty && "text-warning",
                                empty && "text-destructive/70"
                              )}
                            >
                              {key === "ciClass" && !empty ? (
                                <ClassBadge ciClass={String(v)} />
                              ) : empty ? (
                                "missing"
                              ) : (
                                String(v)
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {selected.evidence ? (
                <div className="mt-4 rounded-sm border border-border bg-secondary p-3">
                  <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Evidence
                  </h3>
                  <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground">
                    {JSON.stringify(selected.evidence, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-10">
          <p className="text-sm text-muted-foreground">
            No duplicate clusters yet. Run the pipeline to let the Identity agent scan staging.
          </p>
        </div>
      )}
    </div>
  )
}
