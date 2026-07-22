"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bot, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AGENTS } from "@/lib/constants"

export function RunPipelineButton() {
  const [running, setRunning] = useState<string | null>(null)
  const router = useRouter()

  async function runPipeline() {
    setRunning("Agent pipeline")
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "all" }),
      })
      const data = await res.json().catch(() => ({}))

      for (const agent of AGENTS) {
        const result = data.results?.[agent.id]
        const failure = data.failedAgents?.find(
          (entry: { agent: string }) => entry.agent === agent.id
        )
        if (result) {
          toast.success(`${agent.name} complete`, { description: result.summary })
        } else if (failure) {
          toast.error(`${agent.name} failed`, { description: failure.error })
        }
      }

      if (!res.ok && data.status !== "partial_success") {
        throw new Error(data.error ?? "Agent pipeline failed")
      }
    } catch (e) {
      toast.error("Agent pipeline failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      })
    }
    setRunning(null)
    router.refresh()
  }

  return (
    <Button
      size="sm"
      onClick={runPipeline}
      disabled={running !== null}
      className="h-8 rounded-sm text-xs"
    >
      {running ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {running} running…
        </>
      ) : (
        <>
          <Bot className="size-3.5" aria-hidden="true" />
          Run agent pipeline
        </>
      )}
    </Button>
  )
}
