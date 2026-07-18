"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Copy,
  Database,
  FileCode2,
  LayoutDashboard,
  ListChecks,
  Network,
  Terminal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RunPipelineButton } from "@/components/cockpit/run-pipeline-button"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/data", label: "Data + Gaps", icon: Database },
  { href: "/duplicates", label: "Duplicates", icon: Copy },
  { href: "/rules", label: "IRE Rules", icon: FileCode2 },
  { href: "/map", label: "Service Map", icon: Network },
  { href: "/remediation", label: "Remediation", icon: ListChecks },
  { href: "/audit", label: "Audit", icon: Terminal },
]

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Intake Cockpit
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            CMDB
          </span>
        </Link>
        <span className="hidden rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          team: hackathon
        </span>
        <div className="ml-auto flex items-center gap-2">
          <RunPipelineButton />
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          aria-label="Primary"
          className="hidden w-48 shrink-0 border-r border-border bg-sidebar md:block"
        >
          <ul className="flex flex-col py-2">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors",
                      active
                        ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground"
                        : "border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile nav */}
          <nav
            aria-label="Primary mobile"
            className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-2 py-1.5 md:hidden"
          >
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-sm px-2.5 py-1 text-xs",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <main className="min-w-0 flex-1">
            {title ? (
              <div className="border-b border-border px-4 py-3 md:px-6">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
                {subtitle ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
