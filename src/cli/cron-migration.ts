import * as fs from 'node:fs';
import * as path from 'node:path';
import {withFileLock} from '../hooks/anatomy-lock.js';
import {writeJSON} from '../utils/fs-safe.js';

/** Retain retired definitions for inspection, never execute them (#124, @Jezzaw56). */
export function retireAiTasks(wolfDir: string): number {
  const file=path.join(wolfDir,'cron-manifest.json');
  if (!fs.existsSync(file)) return 0;
  let count=0;
  const acquired=withFileLock(file+".lock",5000,()=>{
    const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
    if (!manifest || !Array.isArray(manifest.tasks) || (manifest.retired_tasks !== undefined && !Array.isArray(manifest.retired_tasks))) {
      throw new Error('Invalid cron manifest; preserved without changes');
    }
    const retired=manifest.tasks.filter((t:any)=>t?.action?.type==='ai_task');
    if (!retired.length) return;
    manifest.tasks=manifest.tasks.filter((t:any)=>t?.action?.type!=='ai_task');
    manifest.retired_tasks=[...(manifest.retired_tasks??[]),...retired.map((task:any)=>({...task,enabled:false,retired_reason:'ai_task is no longer supported; OpenWolf makes no model calls'}))];
    writeJSON(file,manifest);
    count=retired.length;
  });
  if (acquired === null) throw new Error('Cron manifest locked; migration not applied');
  return count;
}
