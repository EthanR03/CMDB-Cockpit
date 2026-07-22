import { Badge } from "@/components/ui/badge"
import { CI_CLASS_LABELS, GAP_CATEGORIES } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-destructive text-white",
    high: "bg-destructive/20 text-destructive border border-destructive/50",
    medium: "bg-warning/15 text-warning border border-warning/40",
    low: "bg-muted text-muted-foreground border border-border",
  }
  return (
    <Badge className={cn("rounded-sm font-mono text-[10px] uppercase", styles[severity] ?? styles.low)}>
      {severity}
    </Badge>
  )
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="outline" className="rounded-sm border-border text-[10px] text-muted-foreground">
      {GAP_CATEGORIES[category]?.label ?? category}
    </Badge>
  )
}

export function ClassBadge({ ciClass }: { ciClass: string }) {
  return (
    <Badge variant="secondary" className="rounded-sm text-[10px] font-normal">
      {CI_CLASS_LABELS[ciClass] ?? ciClass}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-warning/15 text-warning border border-warning/40",
    approved: "bg-success/15 text-success border border-success/40",
    rejected: "bg-destructive/15 text-destructive border border-destructive/40",
    applied: "bg-success text-background",
    queued: "bg-muted text-muted-foreground border border-border",
    open: "bg-warning/15 text-warning border border-warning/40",
    resolved: "bg-success/15 text-success border border-success/40",
    running: "bg-primary/15 text-chart-1 border border-primary/40",
    complete: "bg-success/15 text-success border border-success/40",
    succeeded: "bg-success/15 text-success border border-success/40",
    failed: "bg-destructive/15 text-destructive border border-destructive/40",
  }
  return (
    <Badge className={cn("rounded-sm font-mono text-[10px] uppercase", styles[status] ?? styles.queued)}>
      {status}
    </Badge>
  )
}

export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? "bg-success" : pct >= 60 ? "bg-warning" : "bg-destructive"
  return (
    <div className="flex items-center gap-2" aria-label={`Confidence ${pct}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-sm bg-muted">
        <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
    </div>
  )
}
