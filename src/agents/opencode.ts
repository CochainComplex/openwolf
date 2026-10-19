import * as fs from "node:fs";
import * as path from "node:path";
import { safeCopyFile } from "../utils/fs-safe.js";
import { upsertMarkerBlock } from "./markers.js";
import { readSnippet } from "./index.js";
import type { AgentAdapter, AgentInstallContext, AgentInstallResult } from "./types.js";

// OpenCode integration, adapted from PR #9 by @alfasin (closes #5, #6).
// OpenCode loads plugins from .opencode/plugin/*.ts. We install the multi-file
// plugin under .opencode/plugin/openwolf/ plus a top-level entry that
// re-exports it, so the (non-recursive) plugin loader picks up exactly one
// module. The plugin maps OpenCode's native hooks (tool.execute.before/after,
// session events) onto the same .wolf/ files the Claude/Codex hooks maintain.

// OpenCode 2 requires a default export {id, setup}; the v1 named-export entry
// fails to load there ("Plugin must export a default").
const ENTRY = `// OpenWolf plugin entry (OpenCode 2) — implementation lives in ./openwolf/.
import {setupOpenWolfV2 as installed} from "./openwolf/v2.js"
import {pinRuntime, scheduleUpdate} from "./openwolf/runtime-updates.js"
import {pathToFileURL} from "node:url"
import * as path from "node:path"
export default {
  id: "openwolf",
  setup: async (ctx: any) => {
    const directory: string = ctx.location.directory
    scheduleUpdate(directory)
    // The server's plugin instance remains fixed; no reload during a session.
    let pkg: string | undefined
    try { pkg = pinRuntime(directory, "opencode-server:" + process.pid + ":" + Date.now()) } catch {}
    if (pkg) {
      try {
        const next = await import(pathToFileURL(path.join(pkg,"src/templates/opencode-plugin/v2.ts")).href)
        return await next.setupOpenWolfV2(ctx)
      } catch {} // retain the installed plugin if the staged module cannot load
    }
    return installed(ctx)
  },
}
`;


export const opencodeAdapter: AgentAdapter = {
  name: "opencode",
  displayName: "OpenCode",
  install(ctx: AgentInstallContext): AgentInstallResult {
    const actions: string[] = [];
    const warnings: string[] = [];

    const pluginSrcDir = path.join(ctx.templatesDir, "opencode-plugin");
    if (!fs.existsSync(pluginSrcDir)) {
      warnings.push("opencode-plugin templates missing from the OpenWolf install — plugin not written");
      return { actions, warnings };
    }

    const pluginDir = path.join(ctx.projectRoot, ".opencode", "plugin");
    const destDir = path.join(pluginDir, "openwolf");
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(pluginSrcDir)) {
      if (!file.endsWith(".ts")) continue;
      safeCopyFile(path.join(pluginSrcDir, file), path.join(destDir, file));
    }
    fs.writeFileSync(path.join(pluginDir, "openwolf.ts"), ENTRY, "utf-8");
    actions.push("OpenCode plugin installed (.opencode/plugin/openwolf.ts)");

    if (upsertMarkerBlock(path.join(ctx.projectRoot, "AGENTS.md"), readSnippet(ctx.templatesDir))) {
      actions.push("AGENTS.md updated (OpenWolf block)");
    }

    return { actions, warnings };
  },
};
