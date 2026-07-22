import "server-only"

import { openai } from "@ai-sdk/openai"
import type { StagingCi } from "@/lib/db/schema"

/** OpenAI via OPENAI_API_KEY. Right-sized for structured extraction, not
 * open-ended reasoning; swapping model/provider is a one-line change here. */
export const AGENT_MODEL = openai("gpt-4o-mini")

/** No provider-specific options needed for these structured-output calls. */
export const AGENT_PROVIDER_OPTIONS = {}

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
