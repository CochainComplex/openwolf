import * as path from 'node:path';
import {execFileSync} from 'node:child_process';
import {watch} from 'chokidar';
import * as fs from 'node:fs';
import {DEFAULT_EXCLUDE_PATTERNS, createIgnoreMatcher, isVirtualenvDir} from '../scanner/exclusions.js';
import {readJSON} from '../utils/fs-safe.js';
import {shouldExclude, scanProject} from '../scanner/anatomy-scanner.js';
import type {Logger} from '../utils/logger.js';

/** Share scanner exclusions; never descend into runtime state or external symlinks. */
export function sourceIgnored(root: string, wolfDir: string) {
  const cfg = readJSON<any>(path.join(wolfDir, 'config.json'), {});
  const patterns = cfg?.openwolf?.anatomy?.exclude_patterns;
  const excluded = Array.isArray(patterns) ? patterns.filter((p): p is string => typeof p === 'string') : [...DEFAULT_EXCLUDE_PATTERNS];
  const gitIgnored = createIgnoreMatcher(root);
  return (file: string, stat?: fs.Stats): boolean => {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!relative) return false;
    if (relative === '..' || relative.startsWith('../')) return true;
    if (relative.split('/').some(p => ['.wolf', '.git', '.claude', '.codex', '.opencode', '.agents'].includes(p))) return true;
    return shouldExclude(relative, excluded) || gitIgnored(relative, stat?.isDirectory() ?? false)
      || (!!stat?.isDirectory() && isVirtualenvDir(file));
  };
}

/** Files edited outside the agent, additions and git worktree HEAD changes
 * invalidate anatomy too. At most one scan runs; events during it request another.
 */
export function startSourceWatcher(root: string, wolfDir: string, logger: Logger, dependencies = {watch, scanProject}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running=false, dirty=false, closed=false;
  const drain = async () => {
    if (running || closed) return;
    running=true; dirty=false;
    try {await dependencies.scanProject(wolfDir,root);} catch(e) {logger.warn(`Anatomy refresh failed: ${e}`);}
    finally {running=false;if (dirty && !closed) schedule();}
  };
  const schedule = () => {dirty=true;clearTimeout(timer);timer=setTimeout(()=>void drain(),750);};
  const source=dependencies.watch(root,{ignoreInitial:true,followSymlinks:false,ignored:sourceIgnored(root,wolfDir),awaitWriteFinish:{stabilityThreshold:300,pollInterval:100}});
  source.on('all',schedule);
  source.on('error',error=>logger.warn(`Source watcher error (continuing): ${error}`));
  let git: ReturnType<typeof watch> | undefined;
  try {
    const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{windowsHide:true,cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:3000}).trim();
    git=dependencies.watch([path.join(gitDir,'HEAD'),path.join(gitDir,'index'),path.join(gitDir,'refs')],{ignoreInitial:true});
    git.on('all',schedule);
    git.on('error',error=>logger.warn(`Git watcher error (continuing): ${error}`));
  } catch {}
  schedule(); // startup catch-up after the daemon was offline
  return {close:async()=>{closed=true;clearTimeout(timer);await source.close();await git?.close();}};
}
