import {cliCommand} from "../utils/cli-command.js";
import {createHash} from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { safeCopyFile } from "../utils/fs-safe.js";
import { upsertMarkerBlock } from "./markers.js";
import { readSnippet } from "./index.js";
import type { AgentAdapter, AgentInstallContext, AgentInstallResult } from "./types.js";

// OpenCode integration, adapted from PR #9 by @alfasin (closes #5, #6).
// OpenCode V1 loads the multi-file plugin under .opencode/plugin/openwolf/
// plus a top-level entry. V2 uses .opencode/plugins/openwolf/index.ts and a
// default {id, setup} definition. The selected output is based on the actual
// OpenCode executable rather than on whether any config directory exists.

const LEGACY_ENTRY = `// OpenWolf plugin entry — implementation lives in ./openwolf/.
import {OpenWolf as installed} from "./openwolf/index.js"
import {pinRuntime, scheduleUpdate} from "./openwolf/runtime-updates.js"
import {pathToFileURL} from "node:url"
import * as path from "node:path"
import type {Plugin} from "@opencode-ai/plugin"
export const OpenWolf: Plugin = async (ctx) => {
  scheduleUpdate(ctx.directory)
  // The server's plugin instance remains fixed; no reload during a session.
  let pkg: string | undefined
  try { pkg = pinRuntime(ctx.directory, "opencode-server:" + process.pid + ":" + Date.now()) } catch {}
  if (pkg) {
    try {
      const next = await import(pathToFileURL(path.join(pkg,"src/templates/opencode-plugin/index.ts")).href)
      return await next.OpenWolf(ctx)
    } catch {} // retain the installed plugin if the staged module cannot load
  }
  return installed(ctx)
}
`;
const ENTRY = `// OpenWolf plugin entry — implementation lives in ./openwolf/.
import {wolfDirExists} from "./openwolf/fs.js"
import {OpenWolf as installed} from "./openwolf/index.js"
import {pinRuntime, scheduleUpdate} from "./openwolf/runtime-updates.js"
import {pathToFileURL} from "node:url"
import * as path from "node:path"
import type {Plugin} from "@opencode-ai/plugin"
export const OpenWolf: Plugin = async (ctx) => {
  if (!wolfDirExists(ctx.directory)) return {}
  scheduleUpdate(ctx.directory)
  // The server's plugin instance remains fixed; no reload during a session.
  let pkg: string | undefined
  try { pkg = pinRuntime(ctx.directory, "opencode-server:" + process.pid + ":" + Date.now()) } catch {}
  if (pkg) {
    try {
      const next = await import(pathToFileURL(path.join(pkg,"src/templates/opencode-plugin/index.ts")).href)
      return await next.OpenWolf(ctx)
    } catch {} // retain the installed plugin if the staged module cannot load
  }
  return installed(ctx)
}
`;

export type OpenCodePluginApi = "v1" | "v2" | "unknown";

/** Extract a CLI version from both `2.0.22` and `opencode v2.0.22` output. */
export function parseOpenCodeVersion(output: string): string | undefined {
  const match = output.match(/(?:^|[^\d])v?(\d+)\.(\d+)(?:\.(\d+))?(?:[-+][0-9A-Za-z.-]+)?/i);
  if (!match) return undefined;
  return `${match[1]}.${match[2]}.${match[3] ?? "0"}`;
}

export function detectOpenCodeVersion(): string | undefined {
  try {
    const command = cliCommand("opencode");
    const output = execFileSync(command.file, [...command.args, "--version"], {
      windowsHide: true,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 2000,
    });
    return parseOpenCodeVersion(String(output));
  } catch {
    return undefined;
  }
}

export function detectOpenCodePluginApi(version = detectOpenCodeVersion()): OpenCodePluginApi {
  if (!version) return "unknown";
  const major = Number.parseInt(version.split(".")[0], 10);
  return Number.isSafeInteger(major) && major >= 2 ? "v2" : "v1";
}

function managedFile(file: string, markers: string[]): boolean {
  try {
    const content = fs.readFileSync(file, "utf-8");
    return markers.some(marker => content.includes(marker));
  } catch {
    return false;
  }
}

function existingManagedApi(projectRoot: string): Exclude<OpenCodePluginApi, "unknown"> | undefined {
  const v2Dir = path.join(projectRoot, ".opencode", "plugins", "openwolf");
  const v2Entry = path.join(projectRoot, ".opencode", "plugins", "openwolf.ts");
  if (
    managedFile(path.join(v2Dir, "index.ts"), ["setupOpenWolfV2", "id: \"openwolf\""]) ||
    managedFile(v2Entry, ["setupOpenWolfV2", "id: \"openwolf\""])
  ) return "v2";

  const v1Dir = path.join(projectRoot, ".opencode", "plugin", "openwolf");
  const v1Entry = path.join(projectRoot, ".opencode", "plugin", "openwolf.ts");
  if (
    managedFile(path.join(v1Dir, "index.ts"), ["export const OpenWolf"]) ||
    managedFile(v1Entry, ["OpenWolf plugin entry", "export const OpenWolf"])
  ) return "v1";
}

// Original 2.5.2 templates, before the V2 adapter refactor. Markers alone do not
// establish ownership: user additions and edits must survive migration.
const legacyHashes: Record<string, string> = {
  "anatomy-lock.ts": "998d72e3fe13949e9c0cb30d275a42c2da896773cc564184abe67ccd2690438d",
  "anatomy.ts": "68addd8ae1c5527426c3f654f903956e8be56332e0c5bfb95e708373e735f29c",
  "bug-id.ts": "4c8772b6899a94db1f998056f0e9680ecf8b592bcc294905c0b726f44454f9b6",
  "bug-journal.ts": "7ffd6abb2a99cb6477efdfa429e25f352c612e51ef91a6c677b92f43f552e892",
  "event-journal.ts": "505d5d1a9855a99291d2b8fff9df081fb1cdeac6de8183735903faff39e9e6da",
  "fs.ts": "f5515d0adeb489c77c8b98ce478c11ac52a15506f1cba5ebbc9d6da8e86f54b5",
  "handoff-state.ts": "e89e3d8060eb8715937f2448dd5e895bf89effaea2b4a95cef5cb8af686c29c6",
  "index.ts": "d312f7bdd87b8aa04a1bf1c822caffa4ffed362dd365641a6ecf99701536fc13",
  "knowledge-root.ts": "01ef8c298eff625282f0ca80c2538703d46fce29b9d5029b10eb320fb4f7c7cb",
  "ledger-math.ts": "15a6f20f592a1694658e14741574b320221d2bb9d88af76bcf82b887d1dfd014",
  "ledger.ts": "40fe54b26bd7065997d9b9b4dc8c2f53d99f9781c78899f49aebe4a0de21faba",
  "post-read.ts": "3bfccf7da293fc8f35def36fe446f228b2509fed142160af5ee8e7784d560c1b",
  "post-write.ts": "5bb61950f1e74467780f94e5d586ba35113c3197a75ca641edbde7a11a99114b",
  "pre-read.ts": "afed8a27faa0e84b52fdab6b54f4b801dc4b7d4f2efaf21b3eba8a4e0caa342f",
  "pre-write.ts": "4453d71e2fc603d5736ac93dd06e68d8e443b39c4422f5942c75e44da936e25f",
  "runtime-updates.ts": "e607034a2576f087f806d37ab97d22b14cfb37837288955d89e5e039e0796c46",
  "session-state.ts": "840f6a1f167ef5d2050ae0acd38b79086392d664ce5a7193107ccec844a4c72b",
  "session.ts": "1f01e2c9cbf01c544c7959e5a4d84b01348145e27f8e6c3328771dee32837f43",
  "shared.ts": "d206d1cd15ed2555b96c1e67570af63dc56c5cfd3404bcd4f7cae3add2642542",
  "stop.ts": "19733cf87e9438f8ffbbe8c1ae97c2b338906cff1846e3263e8aa53290c55cb8",
  "trusted-memory.ts": "95ece522e731bc7fc263f3d2585f86744dffff12aa848f81a8f28691443450ee",
  "types.ts": "d1a2f07045779a587a562be7f3d19794bfc3af7a0255a9b3bb3d53af0f86c9dc",
  "usage.ts": "974f4668ef8b450e8534a9268b61b021927c380a1f3d8f9faf1ef6ab055923ed",
  "visibility.ts": "6bb8d7f2213ff38c189860422072f15f3addc6206927f4fd30f79ee63fe0803d"
};
const digest = (file: string) => createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
function removableFiles(target: string, source: string): string[] {
  if (!fs.existsSync(target)) return [];
  if (fs.lstatSync(target).isSymbolicLink()) throw new Error(`Customized plugin symlink: ${target}`);
  if (fs.statSync(target).isDirectory()) {
    const files: string[] = [];
    for (const name of fs.readdirSync(target)) {
      const file = path.join(target, name);
      if (!fs.lstatSync(file).isFile()) throw new Error(`Unrecognized plugin content: ${file}`);
      const hash = digest(file);
      const candidates = [path.join(source, name), ...(name === 'index.ts' ? [path.join(source, 'index-v2.ts')] : [])];
      if (hash !== legacyHashes[name] && !candidates.some(candidate => fs.existsSync(candidate) && digest(candidate) === hash)) {
        throw new Error(`Customized plugin file: ${file}`);
      }
      files.push(file);
    }
    return files;
  }
  const contents = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  if (contents !== ENTRY && contents !== LEGACY_ENTRY && contents !== 'export { OpenWolf } from "./openwolf/index.js"\n') throw new Error(`Customized plugin entry: ${target}`);
  return [target];
}
function removeOtherApiPlugins(projectRoot: string, api: OpenCodePluginApi, source: string): void {
  const old = path.join(projectRoot, '.opencode', api === 'v2' ? 'plugin' : 'plugins');
  const targets = [path.join(old, 'openwolf'), path.join(old, 'openwolf.ts')];
  // Validate everything before removing anything. No recursive deletion.
  const plans = targets.map(target => ({target, files: removableFiles(target, source)}));
  for (const {target, files} of plans) {
    for (const file of files) fs.unlinkSync(file);
    if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) fs.rmdirSync(target);
  }
}

function copyTemplateFiles(sourceDir: string, destinationDir: string, entry: "v1" | "v2"): void {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const file of fs.readdirSync(sourceDir)) {
    if (!file.endsWith(".ts")) continue;
    if (entry === "v2" && (file === "index.ts" || file === "index-v2.ts")) continue;
    if (entry === "v1" && file === "index-v2.ts") continue;
    safeCopyFile(path.join(sourceDir, file), path.join(destinationDir, file));
  }
}

function installV1Plugin(ctx: AgentInstallContext, sourceDir: string): void {
  const pluginDir = path.join(ctx.projectRoot, ".opencode", "plugin");
  const destinationDir = path.join(pluginDir, "openwolf");
  copyTemplateFiles(sourceDir, destinationDir, "v1");
  fs.writeFileSync(path.join(pluginDir, "openwolf.ts"), ENTRY, "utf-8");
}

function installV2Plugin(ctx: AgentInstallContext, sourceDir: string): boolean {
  const sourceEntry = path.join(sourceDir, "index-v2.ts");
  if (!fs.existsSync(sourceEntry)) return false;

  const destinationDir = path.join(ctx.projectRoot, ".opencode", "plugins", "openwolf");
  copyTemplateFiles(sourceDir, destinationDir, "v2");
  safeCopyFile(sourceEntry, path.join(destinationDir, "index.ts"));
  return true;
}

export function installOpenCodePlugin(
  ctx: AgentInstallContext,
  api = detectOpenCodePluginApi(),
): AgentInstallResult {
  const actions: string[] = [];
  const warnings: string[] = [];

  const pluginSrcDir = path.join(ctx.templatesDir, "opencode-plugin");
  if (!fs.existsSync(pluginSrcDir)) {
    warnings.push("opencode-plugin templates missing from the OpenWolf install — plugin not written");
    return { actions, warnings };
  }

  const selectedApi = api === "unknown"
    ? existingManagedApi(ctx.projectRoot) ?? "v1"
    : api;
  if (selectedApi === "v2" && !fs.existsSync(path.join(pluginSrcDir, "index-v2.ts"))) {
    warnings.push("OpenCode V2 template missing; existing integration left untouched");
    return {actions, warnings};
  }
  try {
    removeOtherApiPlugins(ctx.projectRoot, selectedApi, pluginSrcDir);
  } catch (error) {
    warnings.push(`${String(error)}. Existing integration left untouched; review customized files before migrating.`);
    return {actions, warnings};
  }

  if (selectedApi === "v2") {
    if (!installV2Plugin(ctx, pluginSrcDir)) {
      warnings.push("OpenCode V2 was detected, but the V2 plugin template is missing — plugin not written");
      return { actions, warnings };
    }
    actions.push("OpenCode V2 plugin installed (.opencode/plugins/openwolf/index.ts)");
    if (api === "unknown") {
      warnings.push("OpenCode version could not be detected; kept the existing OpenCode V2 plugin contract");
    }
  } else {
    installV1Plugin(ctx, pluginSrcDir);
    actions.push("OpenCode plugin installed (.opencode/plugin/openwolf.ts)");
    if (api === "unknown") {
      warnings.push("OpenCode version could not be detected; installed the V1 plugin for compatibility");
    }
  }

  if (upsertMarkerBlock(path.join(ctx.projectRoot, "AGENTS.md"), readSnippet(ctx.templatesDir))) {
    actions.push("AGENTS.md updated (OpenWolf block)");
  }

  return { actions, warnings };
}

export const opencodeAdapter: AgentAdapter = {
  name: "opencode",
  displayName: "OpenCode",
  install(ctx: AgentInstallContext): AgentInstallResult {
    return installOpenCodePlugin(ctx);
  },
};
