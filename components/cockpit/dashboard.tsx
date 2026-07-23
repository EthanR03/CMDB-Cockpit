"use client"

import Link from "next/link"
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { StatusBadge } from "@/components/cockpit/badges"
import { CI_CLASS_LABELS, GAP_CATEGORIES } from "@/lib/constants"
import type { DashboardData } from "@/lib/analytics"

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--color-destructive)",
  high: "oklch(0.65 0.19 25)",
  medium: "var(--color-warning)",
  low: "var(--color-muted-foreground)",
}

const categoryConfig = {
  count: { label: "Findings", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const severityConfig = {
  count: { label: "Findings" },
  critical: { label: "Critical", color: SEVERITY_COLORS.critical },
  high: { label: "High", color: SEVERITY_COLORS.high },
  medium: { label: "Medium", color: SEVERITY_COLORS.medium },
  low: { label: "Low", color: SEVERITY_COLORS.low },
} satisfies ChartConfig

const classConfig = {
  count: { label: "CIs", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function Kpi({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: number
  href: string
  tone?: "warn" | "bad" | "ok"
}) {
  const toneClass =
    tone === "bad"
      ? "text-destructive"
      : tone === "warn"
        ? "text-warning"
        : tone === "ok"
          ? "text-success"
          : "text-foreground"
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </Link>
  )
}

export function Dashboard({ data }: { data: DashboardData }) {
  const { kpis, duplicateReduction } = data

  const categoryData = data.findingsByCategory.map((d) => ({
    ...d,
    label: GAP_CATEGORIES[d.category]?.label ?? d.category,
  }))

  const classData = data.classDistribution.map((d) => ({
    ...d,
    label: CI_CLASS_LABELS[d.ciClass] ?? d.ciClass,
  }))

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Staged CIs" value={kpis.totalCis} href="/data" />
        <Kpi label="Open findings" value={kpis.openFindings} href="/data" tone="warn" />
        <Kpi label="CIs with gaps" value={kpis.cisWithGaps} href="/data" tone="warn" />
        <Kpi
          label="Dup clusters pending"
          value={kpis.pendingClusters}
          href="/duplicates"
          tone={kpis.pendingClusters > 0 ? "bad" : "ok"}
        />
        <Kpi label="IRE rules pending" value={kpis.pendingRules} href="/rules" tone="warn" />
        <Kpi
          label="Topology proposals"
          value={kpis.pendingTopologies}
          href="/map"
          tone="warn"
        />
        <Kpi
          label="Remediations queued"
          value={kpis.queuedRemediations}
          href="/remediation"
        />
        <Kpi label="Agent runs" value={data.recentRuns.length} href="/audit" />
      </div>

      {duplicateReduction.redundantRecords > 0 ? (
        <Card className="rounded-sm border-primary/40 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Deduplication — one CI per real asset
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums text-muted-foreground">
                {duplicateReduction.totalCis}
              </span>
              <span className="text-sm text-muted-foreground">records in</span>
              <span className="text-xl text-chart-1" aria-hidden="true">→</span>
              <span className="text-3xl font-semibold tabular-nums text-success">
                {duplicateReduction.uniqueCis}
              </span>
              <span className="text-sm text-muted-foreground">unique CIs</span>
            </div>
            <div className="ml-auto flex gap-8 text-right">
              <div>
                <div className="text-2xl font-semibold tabular-nums text-foreground">
                  {duplicateReduction.clusters}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  dup clusters
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-foreground">
                  {duplicateReduction.redundantRecords}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  redundant records
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-success">
                  {duplicateReduction.resolvedClusters}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  resolved
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-sm border-border bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Findings by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryConfig} className="h-56 w-full">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={2} barSize={14} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Findings by severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={severityConfig} className="h-56 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="severity" />} />
                <Pie
                  data={data.findingsBySeverity}
                  dataKey="count"
                  nameKey="severity"
                  innerRadius={45}
                  strokeWidth={2}
                  stroke="var(--color-card)"
                >
                  {data.findingsBySeverity.map((entry) => (
                    <Cell
                      key={entry.severity}
                      fill={SEVERITY_COLORS[entry.severity] ?? "var(--color-muted)"}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-sm border-border bg-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Per-run CI completeness
              {data.runCompleteness ? (
                <>
                  <span className="normal-case tracking-normal text-foreground">
                    run #{data.runCompleteness.agentRunId} · {data.runCompleteness.agent}
                  </span>
                  <StatusBadge status={data.runCompleteness.status} />
                </>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data.runCompleteness ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {kpis.totalCis === 0
                  ? "No team-scoped CIs are available to measure."
                  : "No run completeness baseline has been captured yet."}
              </p>
            ) : data.runCompleteness.classes.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                This run had no team-scoped CIs to measure.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {data.runCompleteness.classes.map((entry) => {
                  const label = CI_CLASS_LABELS[entry.ciClass] ?? entry.ciClass
                  const afterMissing = entry.afterPercent === null
                  const change = entry.changePercentagePoints
                  const missingMessage =
                    data.runCompleteness?.status === "running"
                      ? "Baseline captured · run still in progress"
                      : data.runCompleteness?.status === "failed"
                        ? "After snapshot unavailable for failed run"
                        : "After snapshot unavailable"

                  return (
                    <div
                      key={entry.ciClass}
                      className="rounded-sm border border-border bg-secondary px-3 py-2.5"
                    >
                      <p className="text-xs font-medium text-foreground">
                        {label} completeness
                      </p>
                      {entry.totalCount === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">No CIs for this class</p>
                      ) : afterMissing ? (
                        <>
                          <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                            {entry.beforePercent ?? 0}% before
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {missingMessage}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                            {entry.beforePercent}% before → {entry.afterPercent}% after
                          </p>
                          <p
                            className={`mt-1 text-[11px] ${
                              (change ?? 0) > 0
                                ? "text-success"
                                : (change ?? 0) < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {(change ?? 0) > 0 ? "+" : ""}
                            {change ?? 0} percentage points · {entry.afterCompleteCount}/
                            {entry.totalCount} complete
                          </p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Field completeness
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {data.completeness.map((f) => (
              <div key={f.field} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{f.field}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted">
                  <div
                    className={
                      f.pct >= 85
                        ? "h-full bg-success"
                        : f.pct >= 60
                          ? "h-full bg-warning"
                          : "h-full bg-destructive"
                    }
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {f.pct}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              CI class distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={classConfig} className="h-52 w-full">
              <BarChart data={classData} margin={{ left: -20 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={2} barSize={22} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Recent agent runs
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.recentRuns.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No agent runs yet. Use Run Pipeline to start the crew.
              </p>
            ) : (
              data.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-2 rounded-sm border border-border bg-secondary px-2.5 py-2"
                >
                  <span className="font-mono text-xs capitalize text-foreground">{run.agent}</span>
                  <StatusBadge status={run.status} />
                  <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
