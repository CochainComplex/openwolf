# Dashboard

The dashboard shows the project state that OpenWolf has recorded. It runs on the local machine and requires a project access token.

```bash
openwolf dashboard
```

The command starts a daemon if needed and opens the project dashboard. Keep the token private. After installing a new OpenWolf package, restart the daemon so it serves the updated code and pages.

## Project overview

The overview starts with the project name, indexed files and recorded reads and writes. It keeps provider token counts separate from command-output estimates. It does not report a combined savings figure or claim that shorter output reduced your bill.

Activity, update diagnostics and memory approval notices are no longer placed above the overview. Open the relevant page instead:

| Page | What it shows |
| --- | --- |
| Activity | Recent OpenWolf operations and session history. The operation list retains up to 100 entries. |
| Memory | Session notes, archives and the expandable instruction-approval status. |
| System | Running daemon/dashboard version, installed project-hook version, update status and hook failures. |
| Schedules | Maintenance schedules, run history and failed tasks. |
| File index | Indexed files and descriptions. |

Light mode is the default. An explicitly selected theme is remembered. A healthy daemon is shown neutrally; red is reserved for conditions that need attention.

An operation count is not a count of every action the coding assistant performed. “No update check recorded” means no result is available; it does not imply an update is currently running. The running daemon and installed project hooks may have different versions until the daemon is restarted.

## Token usage

The token view separates recorded provider counters from estimates of local reads, output and injected context. It shows:

- Coverage and available totals for Claude, Codex and OpenCode.
- Input, cached input and output counters where the source provides them.
- Model and provider breakdowns.
- API list-price estimates and pricing assumptions.
- Diagnostics for missing, incomplete or unpriced records.
- Operational estimates and output-governor observations where available.

Input totals include cache reads and writes. Output totals include reasoning when the source exposes it separately. These subsets should not be added to the total again.

Costs use each recorded model's provider rates. They are not Anthropic-only prices, subscription bills or quota estimates. Missing model or pricing information remains unpriced. A lower local output estimate does not by itself prove a lower bill or better task result.

## Handover

Select a saved Claude or Codex session and inspect its source coverage. Preview or export a packet, inspect its evidence and import it into an explicit receiving session. Repository drift or changed source records can invalidate a transfer.

The view also shows active checkpoints and supports evidence search. Importing a packet does not resume the source agent or approve its instructions.

## Memory and conventions

Memory shows session notes and archive controls. Older eligible notes can be archived and restored. Conventions and preferences are candidate project knowledge. The memory-authority status shows whether a protected approval is available, unavailable or revoked.

An unavailable authority is expected for a normal npm installation. See [protected deployment](repair-operations.md).

## Project map and bugs

The anatomy view lists indexed files, descriptions and available symbols. Use it to find source locations and review freshness. The bug view contains recorded problems, causes, fixes and tags.

## Activity and scheduled tasks

Session activity shows recorded actions and local estimates. The scheduled-task view shows maintenance tasks, execution history and failed tasks that can be retried. These are local maintenance operations, not background model conversations.

## Refresh behaviour

Recorded usage and activity reports refresh at regular intervals, including 15-second polling in their dashboard views. File changes also update relevant state. Refreshing data does not replace a running daemon's executable code.

If the page shows the wrong project, an authentication error or stale features, follow [troubleshooting](troubleshooting.md).
