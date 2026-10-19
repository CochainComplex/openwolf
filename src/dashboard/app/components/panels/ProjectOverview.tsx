import React from 'react';
import {StatTile} from '../shared/StatTile.js';
import {StatusBadge} from '../shared/StatusBadge.js';
import {formatTokens} from '../../lib/utils.js';
import type {WolfData} from '../../hooks/useWolfData.js';

export function ProjectOverview({data}:{data:WolfData}) {
  const {health,config,tokenLedger,anatomy,buglog,scanState,hookHealth}=data;
  const lt=tokenLedger.lifetime,usage=data.recordedUsage;
  const total=lt.anatomy_hits+lt.anatomy_misses;
  const reduced=Math.max(0,(lt.bash_governed_original_tokens??0)-(lt.bash_governed_entered_tokens??0));
  const failures=Object.entries(hookHealth).filter(([,h])=>h.consecutive_failures>=2);
  const fmt=(n:number|null|undefined)=>n==null?'Not available':n.toLocaleString();
  return <div className="space-y-6">
    <header className="flex justify-between items-start gap-4 flex-wrap">
      <div><h1 className="text-3xl font-semibold">{data.project.name||data.identity.name}</h1>
        <p className="mt-2 text-sm" style={{color:'var(--text-muted)'}}>{config.agents.length} configured {config.agents.length===1?'agent':'agents'} · Project overview</p></div>
      <StatusBadge status={data.connected?health.status:"unknown"}/>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile label="Indexed files" value={fmt(anatomy.metadata.files)} size="md"/>
      <StatTile label="Recorded reads" value={fmt(lt.total_reads)} size="md"/>
      <StatTile label="Recorded writes" value={fmt(lt.total_writes)} size="md"/>
      <StatTile label="Bug records" value={fmt(buglog.bugs.length)} sub="Includes reported and candidate entries" size="md"/>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="wd-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Recorded token usage</h2>
        {usage && usage.record_count>0 ? <>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt>Input tokens</dt><dd className="font-mono">{fmt(usage.totals.input_tokens)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Output tokens</dt><dd className="font-mono">{fmt(usage.totals.output_tokens)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Cached input tokens</dt><dd className="font-mono">{fmt(usage.totals.cached_input_tokens)}</dd></div>
          </dl>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>{fmt(usage.record_count)} source records. Cache counts may be included in input counts, depending on the provider. Do not add these figures together.</p>
        </> : <p className="text-sm">No supported usage records have been found yet.</p>}
        <a className="underline text-sm" href="#tokens">View usage sources and price estimates</a>
      </section>
      <section className="wd-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Command output shortened</h2>
        <p className="text-3xl font-semibold">{formatTokens(reduced)} <span className="text-sm font-normal">estimated tokens</span></p>
        <p className="text-sm" style={{color:'var(--text-muted)'}}>Difference between original and returned output across {fmt(lt.bash_governed_calls??0)} recorded command results. This is a text-size estimate, not a measure of money saved or total model usage.</p>
        <a className="underline text-sm" href="#tokens">View token details</a>
      </section>
    </div>
    <section className="wd-card p-6">
      <h2 className="text-lg font-semibold mb-4">Project status</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
        <div><dt className="text-sm mb-1" style={{color:'var(--text-muted)'}}>Last project scan</dt><dd>{scanState.last_scanned?new Date(scanState.last_scanned).toLocaleString():'No scan recorded'}</dd></div>
        <div><dt className="mb-1" style={{color:'var(--text-muted)'}}>Configured agents</dt><dd>{config.agents.join(', ')||'None'}</dd></div>
        <div><dt className="mb-1" style={{color:'var(--text-muted)'}}>Index coverage of eligible reads</dt><dd>{total>0?`${Math.round(100*lt.anatomy_hits/total)}%`:'No eligible reads recorded'}</dd><p className="mt-1" style={{color:'var(--text-muted)'}}>Historical totals may include reads counted before 2.5.3.</p></div>
        <div><dt className="mb-1" style={{color:'var(--text-muted)'}}>Hook checks</dt><dd>{failures.length?`${failures.length} need attention`:Object.keys(hookHealth).length?'No repeated failures recorded':'No hook activity recorded'}</dd></div>
      </dl>
      {failures.length>0&&<p className="mt-4 text-sm"><a href="#system" className="underline">Review hook errors in System</a></p>}
    </section>
  </div>;
}
