import React from 'react';
import type {WolfData} from '../../hooks/useWolfData.js';
import {formatTokens} from '../../lib/utils.js';
import {formatUsd} from '../../lib/pricing.js';
import {StatTile} from '../shared/StatTile.js';
export function TokenUsage({data}:{data:WolfData}) {
  const usage=data.recordedUsage,lt=data.tokenLedger.lifetime;
  const fmt=(n:number|null|undefined)=>n==null?'Not available':n.toLocaleString();
  const original=lt.bash_governed_original_tokens??0,returned=lt.bash_governed_entered_tokens??0;
  return <div className="space-y-6"><header><h1 className="text-2xl font-semibold">Token usage</h1><p className="text-sm mt-2" style={{color:'var(--text-muted)'}}>Recorded model usage and local text-size estimates are shown separately.</p></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile label="Recorded input" value={usage?.totals.input_tokens==null?'—':formatTokens(usage.totals.input_tokens)} size="md"/>
      <StatTile label="Recorded output" value={usage?.totals.output_tokens==null?'—':formatTokens(usage.totals.output_tokens)} size="md"/>
      <StatTile label="Cached input" value={usage?.totals.cached_input_tokens==null?'—':formatTokens(usage.totals.cached_input_tokens)} sub="May be included in input totals" size="md"/>
      <StatTile label="API price estimate" value={usage?.costs.priced?formatUsd(usage.costs.total):'—'} sub="Not your subscription bill" size="md"/>
    </div>
    <section className="wd-card p-6 space-y-4"><h2 className="font-semibold text-lg">Usage by agent</h2>
      {usage?<><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Agent','Coverage','Input','Output','Cached input','Total'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{Object.entries(usage.coverage).map(([agent,c])=>{const t=usage.by_agent[agent];return <tr key={agent}>{[agent,`${c.status} · ${c.records} records`,fmt(t?.input_tokens),fmt(t?.output_tokens),fmt(t?.cached_input_tokens),fmt(t?.total_tokens)].map((v,i)=><td key={i} className="p-2">{v}</td>)}</tr>})}</tbody></table></div><p className="text-sm" style={{color:'var(--text-muted)'}}>Input includes cache tokens where provided by the source. Output includes reasoning where reported. Do not add cache or reasoning subsets to the total again.</p><p className="text-xs">Last reconciled: {new Date(usage.scanned_at).toLocaleString()}</p></>:<p className="text-sm">No usage report is available yet. Missing records are not treated as zero usage.</p>}
    </section>
    <section className="wd-card p-6 space-y-4"><h2 className="font-semibold text-lg">Local text estimates</h2><dl className="grid sm:grid-cols-2 gap-4 text-sm">
      <div><dt>Original command output</dt><dd>{fmt(original)} estimated tokens</dd></div><div><dt>Returned command output</dt><dd>{fmt(returned)} estimated tokens</dd></div>
      <div><dt>Output shortened</dt><dd>{fmt(Math.max(0,original-returned))} estimated tokens</dd></div><div><dt>OpenWolf context added</dt><dd>{fmt(lt.injection_tokens_estimated??0)} estimated tokens</dd></div>
      <div><dt>Repeated-read warnings</dt><dd>{fmt(lt.repeated_reads_warned)}</dd></div><div><dt>Repeated reads denied</dt><dd>{fmt(lt.repeated_reads_blocked)}</dd></div>
    </dl><p className="text-sm" style={{color:'var(--text-muted)'}}>These estimates describe different operations. Subtracting them does not establish net token savings, money saved or improved task quality.</p></section>
    {usage&&<details className="wd-card p-6 text-sm space-y-3"><summary className="cursor-pointer font-semibold">Sources, pricing assumptions and diagnostics</summary>
      {Object.entries(usage.coverage).map(([agent,c])=><div key={agent}>{c.diagnostics.map((d,i)=><p key={i} className="mt-2 break-words">{agent}: {d}</p>)}</div>)}
      {usage.costs.assumptions.map(a=><p key={a}>{a}</p>)}<p>Unpriced models: {usage.costs.unpriced.join(', ')||'None reported'}</p>
      {usage.maintenance?.errors.map(e=><p key={e}>{e}</p>)}
    </details>}
  </div>;
}
