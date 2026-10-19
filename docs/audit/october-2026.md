# October 2026 reliability review

Reviewed 19 October against GitHub main `04b75ca9c40d10c345ae4f5157e033d7397f1b7a`: 28 open PRs and 39 open issues. This document describes the repair branch; it does not claim that a published npm release contains the changes or that issues have been closed.

## Implemented and attributed

| Source | Contributor and role | Change |
| --- | --- | --- |
| [#123](https://github.com/cytostack/openwolf/issues/123) | @Jezzaw56, report and working reproduction | Source/Git watcher error handlers; scanner exclusions and gitignore reused; no traversal through symlinked directories. |
| [#136](https://github.com/cytostack/openwolf/issues/136), [#137](https://github.com/cytostack/openwolf/issues/137) | @citizenshanegit, reports and Windows reproduction | Run known Windows npm CLI entries through Node with argument arrays; native binaries remain supported; hide daemon Git subprocess windows and report PM2 errors. |
| [#129](https://github.com/cytostack/openwolf/issues/129), [PR #132](https://github.com/cytostack/openwolf/pull/132) | @eram, report; @itdove, implementation | Detect V1/V2; generate the matching plugin. Contributor commit preserved with cherry-pick provenance. Follow-up changes preserve customized migration files and fix Windows detection. |
| [V2 runtime follow-up](https://github.com/itdove/openwolf/pull/1) | @CochainComplex, real-payload reproduction, implementation and tests | Handle V2 `path`, execution-success boundaries, lazy session initialization, per-step usage and stream reconnection. Original commit preserved. Additional changes isolate in-memory keys by project, retain model metadata on redelivery and clean up backoff listeners. |
| [#130](https://github.com/cytostack/openwolf/issues/130) | @aethyron, startup timeout report | SessionStart budget increased from 5 to 15 seconds for Claude/Codex; dependency checks cached by file metadata; session-file collection moved after context delivery into a background worker. Native Windows latency remains a verification boundary. |
| [#126](https://github.com/cytostack/openwolf/issues/126) | @Jezzaw56, diagnosis and proposed delta filtering | Compare task facts instead of recent tool events; omit unavailable validation observations from injected excerpts; preserve forced compaction restoration. |
| [#124](https://github.com/cytostack/openwolf/issues/124) | @Jezzaw56, report and migration proposal | Init/update archive `ai_task` definitions under `retired_tasks`, disable them, and preserve parameters for inspection. Malformed manifests remain untouched. |
| [#128](https://github.com/cytostack/openwolf/issues/128) | @marrahi, suspend/restart report and catch-up proposal | Persist next-due schedule cursors; catch up repeatable built-in maintenance once; serialize claims and prevent overlap/retry conflicts. Uses public scheduler next-run API, not the suggested unverified parser API. |
| [#134](https://github.com/cytostack/openwolf/issues/134), [PR #138](https://github.com/cytostack/openwolf/pull/138) | @davdittrich, report and implementation | Correct contradictory manual-memory instructions. Original commit retained; protocol subsequently revised for selective memory. |
| [#135](https://github.com/cytostack/openwolf/issues/135), [PR #139](https://github.com/cytostack/openwolf/pull/139) | @davdittrich, report and implementation | Self-contained reframe skill and hash-based updates for untouched project skills; legacy cleanup. Selected original commits retained. Global-command refresh deliberately excluded. |
| [PR #121](https://github.com/cytostack/openwolf/pull/121) | @CBenadieBHC, implementation | Dashboard describes index misses without inferring agent behavior. Original commit retained. |
| Casepod retrospective, supplied by Cytostack | Casepod project workflow findings; private source, not distributed | Early disabled-runtime guard; disabled init/update preservation; optional anatomy and selective durable memory; remove age/edit-count bookkeeping nags; distinguish observation lookup from packet inspection. |

Original PR commit identities and precise integration roles are recorded in [october-contributions.json](october-contributions.json). Older contributors remain credited in the [September audit](README.md) and [CREDITS](https://github.com/cytostack/openwolf/blob/main/CREDITS.md). No identity equivalence, endorsement or authorship of subsequent adaptations is inferred.

## What Casepod establishes

The retrospective describes one customized project, not a controlled comparison of all OpenWolf installations. Its transferable findings are repeated context overhead, stale evidence reuse, contradictory duplicated instructions, an observation/packet-ID mismatch, and the benefit of keeping current task state separate from detailed verification evidence.

Adopt selective retrieval, compact current handoffs, explicit disable semantics, substantive rather than quota-driven learning, and tests that exercise the real integration boundary. Direct search is a valid first choice. Historical hook observations must not be presented as current passing tests or authorization.

Do not import the project's application-specific database locks, payment tests, design contracts, QA wrapper or progress system into OpenWolf. Do not make a two-failure/five-minute execution veto a universal rule, and do not disable every installation's automation by default. Do not claim net token savings, cost savings or causal productivity improvement from unmatched ledger categories. The private retrospective and its application records are excluded from Git and the package.

## Deferred or excluded

- [PR #127 Pi/OMP](https://github.com/cytostack/openwolf/pull/127), by @DrB0rk, and [PR #122 Antigravity lifecycle](https://github.com/cytostack/openwolf/pull/122), by @petersonsalme: deferred pending the reliability work and separate native boundary validation. No new integrations added.
- [PR #65 AI cron providers](https://github.com/cytostack/openwolf/pull/65), by @octo-patch: not revived; incompatible with the no-model-call architecture.
- [PR #35 Hippocampus](https://github.com/cytostack/openwolf/pull/35), by @yhyu13, and [PR #39 broad agent expansion](https://github.com/cytostack/openwolf/pull/39), by @ChasLui: deferred product scope, not bundled as repairs.
- `extra_roots` from [PR #104](https://github.com/cytostack/openwolf/pull/104), by @smasoftware: deferred. Existing multi-writer improvements retain their prior credit.
- [#45 full bug-log injection](https://github.com/cytostack/openwolf/issues/45), by @victor-luyunning: do not add whole-log default injection; use bounded relevant retrieval.
- [#125 reverse-proxy support](https://github.com/cytostack/openwolf/issues/125), by @Jezzaw56: deferred as a separate authentication/origin design. No origin relaxation.
- [#131 duplicate Stop accounting](https://github.com/cytostack/openwolf/issues/131), by @shabbirmurtaza: report concerns 1.0.4; current source already upserts session totals and separates SessionEnd. No automatic rewrite of historical ledgers based on incomplete counters.
- Older adapted PRs are not merged wholesale. For example [#118](https://github.com/cytostack/openwolf/pull/118) is superseded by bounded whole-rule reinjection already in main.

## Validation boundaries

Local regression and package-smoke results are recorded in the repair PR. The native OpenCode installed here is 1.18.31. The official npm registry did not provide `opencode-ai@2.0.22`, and the official GitHub `v2.0.32` release lookup returned 404 during this review. The V2 tests exercise the contributor's observed payload contract; their native E2E results remain contributor-reported, not independently repeated here. Windows behavior must also pass the repository's Windows CI; a macOS argument-array test is not native Windows certification.

A process-reaping race in an existing daemon test was corrected to await child exit instead of blocking the event loop for 300 ms. Sandbox socket restrictions were resolved by running daemon tests with loopback binding allowed. Neither test-environment limitation was relabeled as an application defect.


### Local verification on 19 October

- `pnpm build`: passed, including plugin and dashboard type checks.
- `pnpm test`: 361 passed, zero failed/skipped. After extending exact legacy plugin fingerprints, all five adapter checks and the packaged upgrade smoke passed again.
- `scripts/release-smoke.mjs`: packed installation, actual published 2.5.1 upgrade, preserved custom status/memory, authenticated dashboard and daemon restart passed (334 packaged files).
- Minimal startup fixture: ten macOS/Node 24.14.1 executions, updates disabled, 28–31 ms (median 29 ms). This is not a representative Windows project benchmark or a before/after savings result.

Cross-platform GitHub CI status is attached to the PR; native V2 availability remains as described above.
