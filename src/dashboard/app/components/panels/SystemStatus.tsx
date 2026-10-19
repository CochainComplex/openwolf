import React from 'react';
import type {WolfData} from '../../hooks/useWolfData.js';
export function SystemStatus({data}:{data:WolfData}) {
  const update=data.recordedUsage?.updates;
  const state=update?.policy==='off'?'Automatic checks are off':update?.status==='error'?'Last update check failed':update?.selected?`Runtime ${update.selected} is ready for new sessions`:update?.status==='current'?'No newer compatible runtime found':update?.status==='available'?'A newer release is available':update?.status==='unsupported'?'Automatic updates are not supported here':update?.checkedAt?'Last check completed':'No update check recorded';
  return <div className="space-y-6"><header><h1 className="text-2xl font-semibold">System</h1><p className="text-sm mt-2">Daemon, installed runtime and hook diagnostics.</p></header>
    <section className="wd-card p-6 space-y-3"><h2 className="font-semibold text-lg">Versions and updates</h2>
      <dl className="grid sm:grid-cols-2 gap-4 text-sm">
        <div><dt>Running daemon / dashboard</dt><dd className="font-mono mt-1">{data.health.version??'Version not reported by this daemon'}</dd></div>
        <div><dt>Installed project hooks</dt><dd className="font-mono mt-1">{update?.installed??'Not available'}</dd></div>
        <div><dt>Latest release checked</dt><dd className="mt-1">{update?.latest??'Not checked'}</dd></div>
        <div><dt>Last check</dt><dd className="mt-1">{update?.checkedAt?new Date(update.checkedAt).toLocaleString():'Not recorded'}</dd></div>
      </dl>
      <p className="text-sm">{state}</p>{update?.detail&&<p className="text-sm">{update.detail}</p>}
      <p className="text-sm" style={{color:'var(--text-muted)'}}>Updating project hooks does not restart the daemon. After a package update, run <code>openwolf update</code>, restart the project daemon and start new agent sessions. Running sessions keep their selected runtime.</p>
    </section>
    <section className="wd-card p-6 space-y-3"><h2 className="font-semibold text-lg">Daemon</h2><p className="text-sm">{data.connected?"Connected to live updates":"Connection lost; displayed data may be out of date"}</p><p>Last reported status: {data.health.status}</p><p className="text-sm">Uptime: {Math.floor(data.health.uptime_seconds/3600)}h {Math.floor(data.health.uptime_seconds%3600/60)}m</p><p className="text-sm">{data.cronState.dead_letter_queue.length} scheduled tasks awaiting review. <a href="#cron" className="underline">View schedules</a></p></section>
    <section className="wd-card p-6 space-y-3"><h2 className="font-semibold text-lg">Hook diagnostics</h2>
      {!Object.keys(data.hookHealth).length&&<p className="text-sm">No hook activity recorded yet.</p>}
      {Object.entries(data.hookHealth).map(([name,h])=><div key={name} className="text-sm border-b pb-3" style={{borderColor:'var(--border-subtle)'}}><strong>{name}</strong><p>{h.consecutive_failures} consecutive failures</p>{h.consecutive_failures>0&&h.last_error_message&&<p>{h.last_error_message}</p>}</div>)}
    </section>
  </div>;
}
