import "server-only"

import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  agentRun,
  decision,
  dupCluster,
  finding,
  ireRuleProposal,
  remediation,
  stagingCi,
  topologyProposal,
} from "@/lib/db/schema"
import { TEAM_TAG } from "@/lib/constants"

export async function getStagingCis() {
  return db
    .select()
    .from(stagingCi)
    .where(eq(stagingCi.teamTag, TEAM_TAG))
    .orderBy(asc(stagingCi.id))
}

export async function getFindings() {
  return db
    .select()
    .from(finding)
    .where(eq(finding.teamTag, TEAM_TAG))
    .orderBy(asc(finding.ciId))
}

export async function getStagingWithFindings() {
  const [cis, findings] = await Promise.all([getStagingCis(), getFindings()])
  const byCi = new Map<number, typeof findings>()
  for (const f of findings) {
    const list = byCi.get(f.ciId) ?? []
    list.push(f)
    byCi.set(f.ciId, list)
  }
  return cis.map((ci) => ({ ...ci, findings: byCi.get(ci.id) ?? [] }))
}

export async function getDupClusters() {
  return db
    .select()
    .from(dupCluster)
    .where(eq(dupCluster.teamTag, TEAM_TAG))
    .orderBy(desc(dupCluster.confidence))
}

export async function getIreRuleProposals() {
  return db
    .select()
    .from(ireRuleProposal)
    .where(eq(ireRuleProposal.teamTag, TEAM_TAG))
    .orderBy(asc(ireRuleProposal.ciClass))
}

export async function getTopologyProposals() {
  return db
    .select()
    .from(topologyProposal)
    .where(eq(topologyProposal.teamTag, TEAM_TAG))
    .orderBy(asc(topologyProposal.serviceName))
}

export async function getRemediations() {
  return db
    .select()
    .from(remediation)
    .where(eq(remediation.teamTag, TEAM_TAG))
    .orderBy(desc(remediation.createdAt))
}

export async function getDecisions() {
  return db
    .select()
    .from(decision)
    .where(eq(decision.teamTag, TEAM_TAG))
    .orderBy(desc(decision.createdAt))
}

export async function getAgentRuns() {
  return db
    .select()
    .from(agentRun)
    .where(eq(agentRun.teamTag, TEAM_TAG))
    .orderBy(desc(agentRun.startedAt))
}
