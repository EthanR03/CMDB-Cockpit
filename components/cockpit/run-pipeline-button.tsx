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
    for (const agent of AGENTS) {
      setRunning(agent.name)
      try {
        const res = await fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent: agent.id }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `${agent.name} failed (${res.status})`)
        }
        const data = await res.json()
        toast.success(`${agent.name} complete`, {
          description: data.results?.[agent.id]?.summary,
        })
        router.refresh()
      } catch (e) {
        toast.error(`${agent.name} failed`, {
          description: e instanceof Error ? e.message : "Unknown error",
        })
        break
      }
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
