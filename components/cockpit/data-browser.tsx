"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CategoryBadge,
  ClassBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/cockpit/badges"
import { CI_CLASS_LABELS } from "@/lib/constants"
import type { Finding, StagingCi } from "@/lib/db/schema"

export type CiWithFindings = StagingCi & { findings: Finding[] }

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function worstSeverity(findings: Finding[]): string | null {
  if (findings.length === 0) return null
  return findings.reduce((worst, f) =>
    (SEVERITY_RANK[f.severity] ?? 4) < (SEVERITY_RANK[worst.severity] ?? 4) ? f : worst
  ).severity
}

const DETAIL_FIELDS: Array<{ key: keyof StagingCi; label: string }> = [
  { key: "serialNumber", label: "Serial number" },
  { key: "macAddress", label: "MAC address" },
  { key: "ipAddress", label: "IP address" },
  { key: "fqdn", label: "FQDN" },
  { key: "port", label: "Port" },
  { key: "url", label: "URL" },
  { key: "owner", label: "Owner" },
  { key: "supportGroup", label: "Support group" },
  { key: "environment", label: "Environment" },
  { key: "lifecycleStatus", label: "Lifecycle" },
  { key: "os", label: "OS" },
  { key: "model", label: "Model" },
  { key: "location", label: "Location" },
]

export function DataBrowser({ rows }: { rows: CiWithFindings[] }) {
  const [query, setQuery] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [gapFilter, setGapFilter] = useState("all")
  const [selected, setSelected] = useState<CiWithFindings | null>(null)

  const classes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.ciClass))).sort(),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (classFilter !== "all" && r.ciClass !== classFilter) return false
      if (gapFilter === "with-gaps" && r.findings.length === 0) return false
      if (gapFilter === "clean" && r.findings.length > 0) return false
      if (
        gapFilter !== "all" &&
        gapFilter !== "with-gaps" &&
        gapFilter !== "clean" &&
        !r.findings.some((f) => f.severity === gapFilter)
      )
        return false
      if (!q) return true
      return [r.name, r.fqdn, r.ipAddress, r.serialNumber, r.owner, r.supportGroup]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, query, classFilter, gapFilter])

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 md:px-6">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, IP, serial, owner..."
            className="h-8 w-64 rounded-sm border-border bg-secondary pl-8 text-xs"
            aria-label="Search staged CIs"
          />
        </div>
        <Select value={classFilter} onValueChange={(v) => setClassFilter(v ?? "all")}>
          <SelectTrigger className="h-8 w-44 rounded-sm border-border bg-secondary text-xs" aria-label="Filter by CI class">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>
                {CI_CLASS_LABELS[c] ?? c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gapFilter} onValueChange={(v) => setGapFilter(v ?? "all")}>
          <SelectTrigger className="h-8 w-40 rounded-sm border-border bg-secondary text-xs" aria-label="Filter by gap status">
            <SelectValue placeholder="All records" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All records</SelectItem>
            <SelectItem value="with-gaps">With gaps</SelectItem>
            <SelectItem value="clean">Clean</SelectItem>
            <SelectItem value="critical">Critical severity</SelectItem>
            <SelectItem value="high">High severity</SelectItem>
            <SelectItem value="medium">Medium severity</SelectItem>
            <SelectItem value="low">Low severity</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} / {rows.length} CIs
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-14 font-mono text-[10px] uppercase">ID</TableHead>
            <TableHead className="font-mono text-[10px] uppercase">Name</TableHead>
            <TableHead className="font-mono text-[10px] uppercase">Class</TableHead>
            <TableHead className="hidden font-mono text-[10px] uppercase lg:table-cell">IP / FQDN</TableHead>
            <TableHead className="hidden font-mono text-[10px] uppercase xl:table-cell">Owner</TableHead>
            <TableHead className="hidden font-mono text-[10px] uppercase md:table-cell">Env</TableHead>
            <TableHead className="font-mono text-[10px] uppercase">Gaps</TableHead>
            <TableHead className="font-mono text-[10px] uppercase">Worst</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => {
            const worst = worstSeverity(r.findings)
            return (
              <TableRow
                key={r.id}
                className="cursor-pointer border-border"
                onClick={() => setSelected(r)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelected(r)
                  }
                }}
                aria-label={`View details for ${r.name}`}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                <TableCell className="max-w-48 truncate text-xs font-medium">{r.name}</TableCell>
                <TableCell>
                  <ClassBadge ciClass={r.ciClass} />
                </TableCell>
                <TableCell className="hidden max-w-52 truncate font-mono text-xs text-muted-foreground lg:table-cell">
                  {r.ipAddress ?? r.fqdn ?? "—"}
                </TableCell>
                <TableCell className="hidden max-w-40 truncate text-xs text-muted-foreground xl:table-cell">
                  {r.owner ?? "—"}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {r.environment ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.findings.length > 0 ? (
                    <span className="text-warning">{r.findings.length}</span>
                  ) : (
                    <span className="text-success">0</span>
                  )}
                </TableCell>
                <TableCell>{worst ? <SeverityBadge severity={worst} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            )
          })}
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                No CIs match the current filters.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full border-border bg-card sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader className="pb-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  {selected.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <ClassBadge ciClass={selected.ciClass} />
                  <span className="font-mono text-xs">staging id {selected.id}</span>
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-7rem)] px-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 pb-4 pt-2">
                  {DETAIL_FIELDS.map(({ key, label }) => {
                    const value = selected[key]
                    return (
                      <div key={key} className="min-w-0">
                        <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="truncate text-xs text-foreground">
                          {value === null || value === undefined || value === "" ? (
                            <span className="text-destructive">missing</span>
                          ) : (
                            String(value)
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
                <Separator className="bg-border" />
                <div className="py-4">
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Findings ({selected.findings.length})
                  </h3>
                  {selected.findings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No gaps detected for this CI.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {selected.findings.map((f) => (
                        <li key={f.id} className="rounded-sm border border-border bg-secondary p-2.5">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <SeverityBadge severity={f.severity} />
                            <CategoryBadge category={f.category} />
                            <StatusBadge status={f.status} />
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                              {f.agent}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground">{f.message}</p>
                          {f.field ? (
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                              field: {f.field}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
