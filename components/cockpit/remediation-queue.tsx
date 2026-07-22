"use client"

import { useState, useTransition } from "react"
import { ChevronDown, ChevronRight, Play, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/cockpit/badges"
import { applyRemediation, rollbackRemediation } from "@/app/actions/review"
import { cn } from "@/lib/utils"
import type { Remediation } from "@/lib/db/schema"

const ACTION_LABELS: Record<string, string> = {
  merge_duplicates: "Merge duplicates",
  publish_ire_rule: "Publish IRE rule",
  create_service_map: "Create service map",
  update_field: "Update field",
}

function PromotionBadge({ status }: { status: string | null }) {
  if (status === "promoted") {
    return (
      <Badge className="rounded-sm border border-success/40 bg-success/15 font-mono text-[10px] uppercase text-success">
        SN promoted
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge className="rounded-sm border border-destructive/40 bg-destructive/15 font-mono text-[10px] uppercase text-destructive">
        SN promotion failed
      </Badge>
    )
  }
  return null
}

export function RemediationQueue({ items }: { items: Remediation[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-sm text-muted-foreground">
          The queue is empty. Approve duplicate merges, IRE rules, or service maps to
          stage remediations here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4 md:p-6">
      {items.map((item) => {
        const open = expanded === item.id
        return (
          <div key={item.id} className="rounded-sm border border-border bg-card">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : item.id)}
              className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left"
              aria-expanded={open}
            >
              {open ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="font-mono text-xs text-muted-foreground">#{item.id}</span>
              <span className="text-xs font-medium text-foreground">
                {ACTION_LABELS[item.actionType] ?? item.actionType}
              </span>
              {item.targetCiId ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  target CI {item.targetCiId}
                </span>
              ) : null}
              <span className="ml-auto flex items-center gap-2">
                <PromotionBadge status={item.snPromotionStatus} />
                <StatusBadge status={item.status} />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </span>
            </button>

            {open ? (
              <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Payload
                    </h3>
                    <pre className="overflow-x-auto rounded-sm border border-border bg-secondary p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Rollback snapshot
                    </h3>
                    <pre className="max-h-52 overflow-auto rounded-sm border border-border bg-secondary p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {JSON.stringify(item.rollback, null, 2)}
                    </pre>
                  </div>
                </div>

                {item.snResult != null ? (
                  <div>
                    <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      ServiceNow result
                    </h3>
                    <pre className="max-h-52 overflow-auto rounded-sm border border-border bg-secondary p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                      {JSON.stringify(item.snResult, null, 2)}
                    </pre>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  {item.status === "queued" ? (
                    <Button
                      size="sm"
                      className="h-7 rounded-sm bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await applyRemediation(item.id)
                        })
                      }
                    >
                      <Play className="size-3.5" />
                      Apply
                    </Button>
                  ) : null}
                  {item.status === "applied" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-7 rounded-sm border-border text-xs text-muted-foreground hover:text-foreground",
                        "bg-transparent"
                      )}
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await rollbackRemediation(item.id)
                        })
                      }
                    >
                      <Undo2 className="size-3.5" />
                      Roll back
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
