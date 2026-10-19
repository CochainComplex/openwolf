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
