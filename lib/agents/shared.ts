import "server-only"

import { google } from "@ai-sdk/google"
import type { StagingCi } from "@/lib/db/schema"

/** Google Gemini via GOOGLE_GENERATIVE_AI_API_KEY (free tier). */
export const AGENT_MODEL = google("gemini-3.5-flash")

/**
 * No provider-specific options needed for Gemini Flash. The previous
 * Anthropic options (thinking disabled, low effort) don't apply here;
 * the AI SDK ignores provider options that don't match the active
 * provider, so an empty object is safe.
 */
export const AGENT_PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: {
      thinkingLevel: "minimal" as const,
    },
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
