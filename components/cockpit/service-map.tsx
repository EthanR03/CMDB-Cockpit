"use client"

import { useMemo, useState, useTransition } from "react"
import { AppWindow, Check, Database, Globe, Network, Server, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ClassBadge,
  ConfidenceMeter,
  StatusBadge,
} from "@/components/cockpit/badges"
import { reviewTopology } from "@/app/actions/review"
import { cn } from "@/lib/utils"
import type { StagingCi, TopologyProposal } from "@/lib/db/schema"

type Relationship = { parent: number; child: number; type: string }
type Endpoint = { url: string; port?: number }

const TIER_OF_CLASS: Record<string, number> = {
  cmdb_ci_lb: 0,
  cmdb_ci_netgear: 0,
  cmdb_ci_appl: 1,
  cmdb_ci_linux_server: 2,
  cmdb_ci_win_server: 2,
  cmdb_ci_server: 2,
  cmdb_ci_db_instance: 3,
}

const TIER_LABELS = ["Entry / Load balancing", "Applications", "Compute", "Data"]

function classIcon(ciClass: string) {
  if (ciClass === "cmdb_ci_lb" || ciClass === "cmdb_ci_netgear") return Network
  if (ciClass === "cmdb_ci_appl") return AppWindow
  if (ciClass === "cmdb_ci_db_instance") return Database
  return Server
}

export function ServiceMap({
  topologies,
  cisById,
}: {
  topologies: TopologyProposal[]
  cisById: Record<number, StagingCi>
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected =
    topologies.find((t) => t.id === selectedId) ?? topologies[0] ?? null

  const tiers = useMemo(() => {
    if (!selected) return []
    const members = (selected.memberCiIds as number[])
      .map((id) => cisById[id])
      .filter(Boolean)
    const grouped: StagingCi[][] = [[], [], [], []]
    for (const m of members) {
      grouped[TIER_OF_CLASS[m.ciClass] ?? 2].push(m)
    }
    return grouped
  }, [selected, cisById])

  const relationships = (selected?.relationships ?? []) as Relationship[]
  const endpoints = (selected?.endpoints ?? []) as Endpoint[]

  function review(verdict: "approved" | "rejected") {
    if (!selected) return
    startTransition(async () => {
      await reviewTopology(selected.id, verdict)
    })
  }

  if (topologies.length === 0) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-sm text-muted-foreground">
          No topology proposals yet. Run the pipeline to let Cartographer map services.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:h-[calc(100vh-8.5rem)] md:flex-row">
      {/* Service list */}
      <div className="flex w-full shrink-0 flex-col border-b border-border md:w-56 md:border-b-0 md:border-r lg:w-64">
        <div className="max-h-48 overflow-y-auto md:max-h-none md:min-h-0 md:flex-1">
          <ul className="flex flex-col">
            {topologies.map((t) => {
              const active = selected?.id === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-border px-3 py-2.5 text-left transition-colors",
                      active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="size-3.5 shrink-0 text-chart-1" aria-hidden="true" />
                      <span className="truncate text-xs font-medium text-foreground">
                        {t.serviceName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {(t.memberCiIds as number[]).length} CIs
                      </span>
                      <span className="ml-auto">
                        <StatusBadge status={t.status} />
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {selected ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold text-foreground">{selected.serviceName}</h2>
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
                  Approve map
                </Button>
              </div>
            ) : null}
          </div>

          {selected.rationale ? (
            <div className="border-b border-border bg-secondary/50 px-4 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wide text-chart-1">
                  cartographer:{" "}
                </span>
                {selected.rationale}
              </p>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-5 p-4 md:p-6">
              {/* Tiered topology */}
              <div className="flex flex-col gap-3">
                {tiers.map((tier, i) =>
                  tier.length === 0 ? null : (
                    <div key={i} className="flex flex-col gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {TIER_LABELS[i]}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {tier.map((ci) => {
                          const Icon = classIcon(ci.ciClass)
                          return (
                            <div
                              key={ci.id}
                              className="flex min-w-44 items-center gap-2.5 rounded-sm border border-border bg-card px-3 py-2"
                            >
                              <Icon className="size-4 shrink-0 text-chart-1" aria-hidden="true" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-foreground">
                                  {ci.name}
                                </p>
                                <p className="truncate font-mono text-[10px] text-muted-foreground">
                                  {ci.ipAddress ?? ci.fqdn ?? `#${ci.id}`}
                                </p>
                              </div>
                              <span className="ml-auto shrink-0">
                                <ClassBadge ciClass={ci.ciClass} />
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {i < 3 && tiers.slice(i + 1).some((t) => t.length > 0) ? (
                        <div className="ml-6 h-4 w-px bg-border" aria-hidden="true" />
                      ) : null}
                    </div>
                  )
                )}
              </div>

              {/* Relationships */}
              {relationships.length > 0 ? (
                <div>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Proposed relationships ({relationships.length})
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {relationships.map((r, i) => {
                      const parent = cisById[r.parent]
                      const child = cisById[r.child]
                      return (
                        <li
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-secondary px-2.5 py-1.5 font-mono text-[11px]"
                        >
                          <span className="text-foreground">{parent?.name ?? `#${r.parent}`}</span>
                          <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[9px] uppercase text-chart-1">
                            {r.type}
                          </span>
                          <span className="text-foreground">{child?.name ?? `#${r.child}`}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {/* Endpoints */}
              {endpoints.length > 0 ? (
                <div>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Detected endpoints
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {endpoints.map((e, i) => (
                      <li
                        key={i}
                        className="rounded-sm border border-border bg-secondary px-2.5 py-1.5 font-mono text-[11px] text-foreground"
                      >
                        {e.url}
                        {e.port ? `:${e.port}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
