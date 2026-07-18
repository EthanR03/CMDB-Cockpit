import "server-only"

import { anthropic } from "@ai-sdk/anthropic"
import type { StagingCi } from "@/lib/db/schema"

/** Direct Anthropic API via ANTHROPIC_API_KEY (no Gateway). */
export const AGENT_MODEL = anthropic("claude-sonnet-5")

/**
 * claude-sonnet-5 enables extended thinking by default, which massively
 * slows down structured-output extraction calls. Disable it and use low
 * effort — these agents do classification/extraction, not deep reasoning.
 */
export const AGENT_PROVIDER_OPTIONS = {
  anthropic: {
    thinking: { type: "disabled" as const },
    effort: "low" as const,
  },
}

/** Compact, token-efficient projection of a staging CI for prompts. */
export function compactCi(ci: StagingCi) {
  return {
    id: ci.id,
    class: ci.ciClass,
    name: ci.name,
    serial: ci.serialNumber ?? null,
    mac: ci.macAddress ?? null,
    ip: ci.ipAddress ?? null,
    fqdn: ci.fqdn ?? null,
    port: ci.port ?? null,
    url: ci.url ?? null,
    owner: ci.owner ?? null,
    group: ci.supportGroup ?? null,
    env: ci.environment ?? null,
    lifecycle: ci.lifecycleStatus ?? null,
    os: ci.os ?? null,
    model: ci.model ?? null,
    loc: ci.location ?? null,
    lastSeen: ci.lastDiscovered ? ci.lastDiscovered.toISOString().slice(0, 10) : null,
  }
}

export type CompactCi = ReturnType<typeof compactCi>

/** Normalize a string for fuzzy comparisons. */
export function norm(v: string | null | undefined): string {
  return (v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** Percent of CIs (0-100) where the given field is non-empty. */
export function coveragePct(cis: StagingCi[], key: keyof StagingCi): number {
  if (cis.length === 0) return 0
  const filled = cis.filter((ci) => {
    const v = ci[key]
    return v !== null && v !== undefined && v !== ""
  }).length
  return Math.round((filled / cis.length) * 100)
}
