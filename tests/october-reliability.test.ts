import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {EventEmitter} from 'node:events';
import {execFileSync} from 'node:child_process';
import {cliCommand} from '../dist/src/utils/cli-command.js';
import {sourceIgnored, startSourceWatcher} from '../dist/src/daemon/source-watcher.js';

function fixture(t: any) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'wolf reliability '));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'.wolf'));
  return root;
}

test('Windows npm shim resolves to Node and preserves literal arguments',t=>{
  const root=fixture(t);
  const entry=path.join(root,'node_modules','pm2','bin','pm2');
  fs.mkdirSync(path.dirname(entry),{recursive:true});
  fs.writeFileSync(entry,'console.log(JSON.stringify(process.argv.slice(2)))');
  fs.writeFileSync(path.join(root,'pm2.cmd'),'unused');
  const cmd=cliCommand('pm2','win32',{Path:root});
  assert.equal(cmd.file,process.execPath);
  const args=['start','project with spaces & echo BAD','--cwd',root];
  assert.deepEqual(JSON.parse(execFileSync(cmd.file,[...cmd.args,...args],{encoding:'utf8'})),args);
  assert.throws(()=>cliCommand('opencode','win32',{PATH:root}),/Cannot resolve/);
  fs.writeFileSync(path.join(root,'opencode.exe'),'native fixture');
  assert.equal(cliCommand('opencode','win32',{PATH:root}).file,path.join(root,'opencode.exe'));
});

test('source watcher respects scanner exclusions, nested gitignore and secrets',t=>{
  const root=fixture(t),wolf=path.join(root,'.wolf');
  fs.writeFileSync(path.join(wolf,'config.json'),JSON.stringify({openwolf:{anatomy:{exclude_patterns:['private-data','*.generated']}}}));
  fs.writeFileSync(path.join(root,'.gitignore'),'ignored/\n');
  const ignored=sourceIgnored(root,wolf);
  for(const rel of ['private-data/file.ts','app/file.generated','ignored/file.ts','.wolf/config.json','keys/private.pem']) assert.equal(ignored(path.join(root,rel)),true,rel);
  assert.equal(ignored(path.join(root,'src/app.ts')),false);
});

test('source and Git watcher errors are logged without terminating the daemon',async t=>{
  const root=fixture(t), events: any[]=[], messages: string[]=[];
  execFileSync('git',['init','--quiet',root]);
  const fakeWatch=()=>{const e:any=new EventEmitter();e.close=async()=>{};events.push(e);return e;};
  const watcher=startSourceWatcher(root,path.join(root,'.wolf'),{warn:(s:string)=>messages.push(s)} as any,{watch:fakeWatch as any,scanProject:async()=>{}} as any);
  assert.equal(events.length,2);
  for(const e of events)e.emit('error',new Error('EACCES fixture'));
  assert.equal(messages.length,2);
  await watcher.close();
});

test('context is silent after tool-only changes, but restores after compaction',async t=>{
  const root=fixture(t);
  const {queueCheckpoint,activeContext}=await import('../dist/src/hooks/handoff-state.js');
  const queue=(id:string,kind:string,text:string,patch?:any)=>queueCheckpoint(root,'claude','session-one',{id,kind,text,patch,at:new Date().toISOString()});
  queue('request','request','Fix the watcher');
  assert.match(activeContext(root,'claude','session-one'),/Fix the watcher/);
  queue('cmd','validation-observation','Command: test; reported exit: unavailable');
  assert.equal(activeContext(root,'claude','session-one'),'');
  queue('edit','edit','src/app.ts');
  assert.equal(activeContext(root,'claude','session-one'),'');
  queue('checkpoint','semantic-checkpoint','',{next_action:'Run the watcher check'});
  const changed=activeContext(root,'claude','session-one');
  assert.match(changed,/Run the watcher check/);
  assert.doesNotMatch(changed,/reported exit: unavailable/);
  assert.match(activeContext(root,'claude','session-one',true),/Run the watcher check/);
});

test('disabled cached hooks produce no output or bookkeeping, including with unclosed stdin',async t=>{
  const root=fixture(t),wolf=path.join(root,'.wolf');
  fs.writeFileSync(path.join(wolf,'config.json'),JSON.stringify({openwolf:{enabled:false}}));
  const {spawn}=await import('node:child_process');
  for(const script of ['session-start','user-prompt-submit','post-write','post-bash','stop','session-end']) {
    const child=spawn(process.execPath,[path.resolve('dist/hooks',script+'.js')],{cwd:root,env:{...process.env,CLAUDE_PROJECT_DIR:root,OPENWOLF_PROJECT_ROOT:root},stdio:['pipe','pipe','pipe']});
    let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
    const timer=setTimeout(()=>child.kill(),3000);
    const code=await new Promise(resolve=>child.on('close',resolve));clearTimeout(timer);
    assert.equal(code,0,script);assert.equal(output,'',script);
  }
  assert.deepEqual(fs.readdirSync(wolf),['config.json']);
});

test('upgrade archives retired AI tasks once and preserves all other definitions',async t=>{
  const root=fixture(t),wolf=path.join(root,'.wolf'),file=path.join(wolf,'cron-manifest.json');
  const {retireAiTasks}=await import('../dist/src/cli/cron-migration.js');
  const keep={id:'custom-scan',action:{type:'scan_project'},enabled:false};
  fs.writeFileSync(file,JSON.stringify({version:1,tasks:[keep,{id:'old-ai',action:{type:'ai_task',params:{prompt:'legacy'}},enabled:true}]}));
  assert.equal(retireAiTasks(wolf),1);
  assert.equal(retireAiTasks(wolf),0);
  const result=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.deepEqual(result.tasks,[keep]);assert.equal(result.retired_tasks[0].enabled,false);
  assert.equal(result.retired_tasks[0].action.params.prompt,'legacy');
  fs.writeFileSync(file,'broken JSON');
  assert.throws(()=>retireAiTasks(wolf));assert.equal(fs.readFileSync(file,'utf8'),'broken JSON');
});

test('missed maintenance catches up once, survives restart, and cannot overlap',async t=>{
  const root=fixture(t),wolf=path.join(root,'.wolf');
  const {CronEngine}=await import('../dist/src/daemon/cron-engine.js');
  const task={id:'scan',name:'scan',schedule:'0 0 * * *',action:{type:'scan_project'},enabled:true,retry:{max_attempts:1},failsafe:{}};
  fs.writeFileSync(path.join(wolf,'cron-manifest.json'),JSON.stringify({tasks:[task]}));
  const stateFile=path.join(wolf,'cron-state.json');
  const past=()=>fs.writeFileSync(stateFile,JSON.stringify({execution_log:[],dead_letter_queue:[],schedules:{scan:{signature:JSON.stringify([task.schedule,task.action]),next_due:new Date(Date.now()-86400_000).toISOString()}}}));
  const log={info(){},warn(){},error(){}};
  let runs=0,release:any;
  const engine:any=new CronEngine(wolf,root,log,()=>{});
  engine.runAction=async()=>{runs++;await new Promise(resolve=>release=resolve)};
  t.after(()=>engine.stop());
  engine.start();
  past();
  const first=engine.checkMissedRuns();
  await engine.checkMissedRuns();
  assert.equal(runs,1);
  release();await first;
  await engine.checkMissedRuns();assert.equal(runs,1);
  engine.stop();
  const second:any=new CronEngine(wolf,root,log,()=>{});
  second.runAction=async()=>{runs++};
  second.start();await second.checkMissedRuns();assert.equal(runs,1);
  second.stop();
});

test('disabled init preserves project hooks and custom instructions byte-for-byte',t=>{
  const root=fixture(t),wolf=path.join(root,'.wolf');
  fs.writeFileSync(path.join(wolf,'config.json'),JSON.stringify({openwolf:{enabled:false}}));
  fs.writeFileSync(path.join(wolf,'OPENWOLF.md'),'Manual project policy');
  fs.mkdirSync(path.join(root,'.claude'));fs.writeFileSync(path.join(root,'.claude/settings.json'),'{"hooks":{}}');
  execFileSync(process.execPath,[path.resolve('dist/bin/openwolf.js'),'init'],{cwd:root,env:{...process.env,OPENWOLF_NO_UPDATE:'1'},encoding:'utf8'});
  assert.equal(fs.readFileSync(path.join(wolf,'OPENWOLF.md'),'utf8'),'Manual project policy');
  assert.equal(fs.readFileSync(path.join(root,'.claude/settings.json'),'utf8'),'{"hooks":{}}');
  assert.ok(!fs.existsSync(path.join(wolf,'hooks')));
});
