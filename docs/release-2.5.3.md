# OpenWolf 2.5.3 release record

**Status: release candidate. Not yet published.** The latest published package remains 2.5.2 until the release is completed. This page describes the candidate in [PR #140](https://github.com/cytostack/openwolf/pull/140).

## Changes

- Handle watcher errors and apply project exclusions to background scans. Repair Windows PM2 and OpenCode npm execution, including the V2 `@opencode/cli` package.
- Support OpenCode V2 events and safe migration from managed V1 plugins. Track successful edits, raw reads, individual model-step usage and one turn end.
- Reduce unchanged task context, defer startup cleanup and respect disabled projects.
- Archive retired AI schedules and catch up supported maintenance after sleep or restart.
- Make reframe self-contained and update untouched project skills. Preserve custom and global files.
- Align anatomy read counters with scanner exclusions, nested ignore files, virtual environments and binary-file rules (#114).
- Put activity history in Activity, memory approval and archive details in Memory, and versions and diagnostics in System. Use light mode by default and remove unsupported savings claims.
- Offer optional task review suggestions after repeated reported failures or elapsed active time. These never block or terminate tasks.

## Upgrading

Read the [upgrade guide](updating.md), including the note about stale global Claude commands. Updating project hooks does not restart a running daemon or agent session. Restart the daemon after installing the new package to load the updated dashboard.

## Validation

The reliability changes passed build, regression and package-upgrade checks on Linux, macOS, Windows and Node 20. Native OpenCode 2.0.32 passed macOS integration checks with a loopback model stub, including failed edits, per-step usage, disabled projects and migration. This is native integration testing with deterministic responses, not a live-provider quality or billing test.

The dashboard and exclusion-accounting follow-up passed 369 local tests, build checks and the documentation build. Browser checks covered the new home page, contributor section, project overview and version display. Current cross-platform CI results are recorded in the PR. The package smoke test installs the actual tarball and upgrades a published 2.5.2 project while checking custom memory, daemon restart and authenticated dashboard access.

Windows desktop startup timing and visible console behaviour still need representative interactive checks. Historical counters are not recalculated. No claim of net token savings or subscription savings is made.

## Contributors

See the [contributors page](contributors.md) and [October audit](audit/october-2026.md) for authors, reporters, reproduced findings and deferred proposals. Original accepted commits retain their author metadata.
