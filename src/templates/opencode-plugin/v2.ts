/**
 * OpenCode 2 adapter for OpenWolf.
 * Maps the v2 plugin hooks and events onto the same handlers used by index.ts (v1).
 */
import {scheduleUpdate} from "./runtime-updates.js"
import { mutateJSON, HOOK_LOCK_BUDGET_MS } from "./anatomy-lock.js"
import {sessionFilePath, wolfDirExists, getWolfDir} from "./fs.js"
import { approvedMemory } from "./trusted-memory.js"
import { recordUsage } from "./usage.js"
import * as fs from "node:fs"
import * as path from "node:path"
import { handleSessionStart, deleteSession } from "./session.js"
import { handlePreRead } from "./pre-read.js"
import { handlePreWrite } from "./pre-write.js"
import { handlePostRead } from "./post-read.js"
import { handlePostWrite } from "./post-write.js"
import { handleStop } from "./stop.js"

interface WolfRegistration {
  dispose: () => Promise<void>
}

interface WolfSystemPart {
  type: "text"
  text: string
}

interface WolfEvent {
  id: string
  created: number
  type: string
  data?: Record<string, any>
}

interface WolfContext {
  location: { directory: string }
  tool: {
    hook: (
      name: "execute.before" | "execute.after",
      cb: (input: any) => Promise<void> | void
    ) => Promise<WolfRegistration>
  }
  session: {
    hook: (
      name: "context",
      cb: (input: { sessionID: string; system: WolfSystemPart[] }) => Promise<void> | void
    ) => Promise<WolfRegistration>
  }
  event: {
    subscribe: () => AsyncIterable<WolfEvent>
  }
}

interface WolfToolArgs {
  path?: unknown
  filePath?: unknown
  file_path?: unknown
  content?: unknown
  oldString?: unknown
  old_string?: unknown
  newString?: unknown
  new_string?: unknown
  offset?: unknown
  limit?: unknown
}

interface WolfToolInput {
  tool?: string
  sessionID?: string
  id?: string
  status?: string
  input?: WolfToolArgs
  result?: {
    output?: {
      content?: unknown
      [key: string]: unknown
    }
    content?: unknown
    metadata?: unknown
  }
}

interface WolfModelRef {
  providerID?: string
  id?: string
  sessionID?: string
}

export async function setupOpenWolfV2(ctx: WolfContext): Promise<() => Promise<void>> {
  const directory = ctx.location.directory
  const registrations: WolfRegistration[] = []
  const modelByMessage = new Map<string, WolfModelRef>()
  const startedSessions = new Set<string>()
  let eventIterator: AsyncIterator<WolfEvent> | undefined
  let stopped = false

  const ensureSession = (sid: string) => {
    if (startedSessions.has(sid)) return
    startedSessions.add(sid)
    handleSessionStart(directory, sid)
  }

  const handleEvent = (ev: WolfEvent) => {
    if (!wolfDirExists(directory)) return
    const data = ev.data
    const sid = data?.sessionID
    if (typeof sid !== "string" || !sid) return

    if (ev.type !== "session.deleted") ensureSession(sid)

    if (ev.type === "session.created") {
      ensureSession(sid)
      scheduleUpdate(directory)
    }

    if (ev.type === "session.step.started") {
      const assistantMessageID = data?.assistantMessageID
      const model = data?.model
      if (typeof assistantMessageID === "string" && model && typeof model === "object") {
        modelByMessage.set(assistantMessageID, {
          providerID: model.providerID,
          id: model.id,
          sessionID: sid,
        })
      }
    }

    if (ev.type === "session.step.ended") {
      const assistantMessageID = data?.assistantMessageID
      const model = typeof assistantMessageID === "string" ? modelByMessage.get(assistantMessageID) : undefined
      if (typeof assistantMessageID === "string") modelByMessage.delete(assistantMessageID)
      recordUsage(directory, {
        role: "assistant",
        id: assistantMessageID,
        sessionID: sid,
        providerID: model?.providerID,
        modelID: model?.id,
        tokens: data?.tokens,
        time: { created: ev.created, completed: ev.created },
      })
    }

    if (ev.type === "session.step.failed") {
      const assistantMessageID = data?.assistantMessageID
      if (typeof assistantMessageID === "string") modelByMessage.delete(assistantMessageID)
    }

    if (
      ev.type === "session.execution.succeeded" ||
      ev.type === "session.execution.failed" ||
      ev.type === "session.execution.interrupted" ||
      ev.type === "session.idle"
    ) {
      for (const [mid, m] of modelByMessage) {
        if (m.sessionID === sid) modelByMessage.delete(mid)
      }
      scheduleUpdate(directory)
      handleStop(directory, sid)
    }

    if (ev.type === "session.deleted") {
      startedSessions.delete(sid)
      handleStop(directory, sid)
      const file = sessionFilePath(path.join(getWolfDir(directory), "hooks"), sid)
      mutateJSON<Record<string, unknown>>(file, {}, HOOK_LOCK_BUDGET_MS, state => {
        state.ended = new Date().toISOString()
      })
      deleteSession(sid)
    }
  }

  const startEventLoop = async () => {
    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        const t = setTimeout(resolve, ms)
        ;(t as any).unref?.()
      })
    let backoff = 500
    while (!stopped) {
      let iterator: AsyncIterator<WolfEvent> | undefined
      try {
        iterator = ctx.event.subscribe()[Symbol.asyncIterator]()
      } catch (error) {
        console.warn("OpenWolf: event stream subscribe: " + error)
      }
      eventIterator = iterator
      if (!iterator) {
        await wait(backoff)
        backoff = Math.min(backoff * 2, 30000)
        continue
      }
      while (!stopped) {
        let step: IteratorResult<WolfEvent>
        try {
          step = await iterator.next()
        } catch (error) {
          console.warn("OpenWolf: event stream read: " + error)
          break
        }
        if (step.done) {
          console.warn("OpenWolf: event stream ended")
          break
        }
        backoff = 500
        try {
          handleEvent(step.value)
        } catch (error) {
          console.warn(`OpenWolf: event: ${error}`)
        }
      }
      eventIterator = undefined
      if (stopped) return
      await wait(backoff)
      backoff = Math.min(backoff * 2, 30000)
    }
  }

  const beforeReg = await ctx.tool.hook("execute.before", (hookInput) => {
    try {
      if (!wolfDirExists(directory)) return
      const i = hookInput as WolfToolInput
      const sid = i.sessionID
      if (!sid) return
      ensureSession(sid)
      const args = (i.input ?? {}) as WolfToolArgs
      const toolName = i.tool
      const tool = (toolName ?? "").toLowerCase()
      const filePath = String(args.path ?? args.filePath ?? args.file_path ?? "")

      if (tool === "read") {
        const ranged = args.offset !== undefined || args.limit !== undefined
        if (filePath) handlePreRead(directory, sid, filePath, ranged)
      }

      if (tool === "write" || tool === "edit") {
        const content = String(args.content ?? "")
        const oldStr = String(args.oldString ?? args.old_string ?? "")
        const newStr = String(args.newString ?? args.new_string ?? "")
        if (filePath) handlePreWrite(directory, sid, filePath, content, oldStr, newStr)
      }
    } catch (error) {
      console.warn(`OpenWolf: execute.before: ${error}`)
    }
  })
  registrations.push(beforeReg)

  const afterReg = await ctx.tool.hook("execute.after", (hookInput) => {
    try {
      if (!wolfDirExists(directory)) return
      const i = hookInput as WolfToolInput
      const sid = i.sessionID
      if (!sid) return
      ensureSession(sid)
      if (i.status !== "completed") return
      const args = (i.input ?? {}) as WolfToolArgs
      const toolName = i.tool
      const tool = (toolName ?? "").toLowerCase()
      const filePath = String(args.path ?? args.filePath ?? args.file_path ?? "")

      if (tool === "read") {
        const outputContent = i.result?.output?.content
        const content = typeof outputContent === "string" ? outputContent : ""
        const ranged = args.offset !== undefined || args.limit !== undefined
        if (filePath) handlePostRead(directory, sid, filePath, content, ranged, i.id)
      }

      if (tool === "write" || tool === "edit") {
        const content = String(args.content ?? "")
        const oldStr = String(args.oldString ?? args.old_string ?? "")
        const newStr = String(args.newString ?? args.new_string ?? "")
        if (filePath) handlePostWrite(directory, sid, toolName ?? "", filePath, content, oldStr, newStr)
      }
    } catch (error) {
      console.warn(`OpenWolf: execute.after: ${error}`)
    }
  })
  registrations.push(afterReg)

  const contextReg = await ctx.session.hook("context", (c) => {
    try {
      if (!wolfDirExists(directory)) return
      const wolfDir = getWolfDir(directory)
      const openwolfPath = path.join(wolfDir, "OPENWOLF.md")
      if (fs.existsSync(openwolfPath)) {
        const openwolfContent = approvedMemory(wolfDir, "OPENWOLF.md")
        c.system.push({
          type: "text",
          text: `\n<openwolf-protocol>\n${openwolfContent}\n</openwolf-protocol>`,
        })
      }
    } catch (error) {
      console.warn(`OpenWolf: context: ${error}`)
    }
  })
  registrations.push(contextReg)

  if (wolfDirExists(directory)) {
    scheduleUpdate(directory)
  }

  void startEventLoop()

  return async () => {
    for (const reg of registrations) {
      try {
        await reg.dispose()
      } catch {}
    }
    stopped = true
    try {
      await eventIterator?.return?.()
    } catch {}
  }
}

export default {
  id: "openwolf",
  setup: setupOpenWolfV2,
}
