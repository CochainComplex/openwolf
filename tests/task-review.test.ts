import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {execFileSync} from 'node:child_process';
import {observeTaskReview, takeTaskReview} from '../dist/src/hooks/task-review.js';
import {activeFile} from '../dist/src/hooks/handoff-state.js';
function fixture(t:any,enabled=true){const root=fs.mkdtempSync(path.join(os.tmpdir(),'ow-task-review-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'.wolf'));fs.writeFileSync(path.join(root,'.wolf/config.json'),JSON.stringify({openwolf:{task_review:{enabled},updates:{mode:'off'},visibility:{mode:'off'}}}));return root;}
const session='review-session';
const failure=(id:string,exit=1)=>({session_id:session,tool_use_id:id,tool_input:{command:'false'},tool_response:{exit_code:exit,stdout:''}});

test('two distinct reported failures suggest a review once without requiring one',t=>{
  const root=fixture(t);
  observeTaskReview(root,'claude','post-bash',failure('a'),1000);
  observeTaskReview(root,'claude','post-bash',failure('a'),2000);
  assert.equal(takeTaskReview(root,'claude',session,2000),undefined);
  observeTaskReview(root,'claude','post-bash',failure('b'),3000);
  assert.match(takeTaskReview(root,'claude',session,3000)!,/advisory nudge; no approval or audit is required/);
  assert.equal(takeTaskReview(root,'claude',session,3000),undefined);
  observeTaskReview(root,'claude','post-bash',failure('c'),4000);
  observeTaskReview(root,'claude','post-bash',failure('d'),5000);
  assert.equal(takeTaskReview(root,'claude',session,5000),undefined);
});

test('five active minutes suggest review; idle user time and new task do not',t=>{
  const root=fixture(t),input={session_id:session};
  observeTaskReview(root,'claude','user-prompt-submit',input,1000);
  observeTaskReview(root,'claude','post-read',input,301000);
  assert.match(takeTaskReview(root,'claude',session,301000)!,/time spent/);
  observeTaskReview(root,'claude','stop',input,302000);
  observeTaskReview(root,'claude','user-prompt-submit',input,3600000);
  assert.equal(takeTaskReview(root,'claude',session,3600000),undefined);
  const active=activeFile(root,'claude',session);fs.mkdirSync(path.dirname(active),{recursive:true});fs.writeFileSync(active,JSON.stringify({objective:'New task'}));
  observeTaskReview(root,'claude','post-read',input,3900000);
  assert.equal(takeTaskReview(root,'claude',session,3900000),undefined);
});

test('disabled review has no state writes and unknown outcomes are not failures',t=>{
  const root=fixture(t,false);
  observeTaskReview(root,'claude','post-bash',failure('a'),1000);
  assert.deepEqual(fs.readdirSync(path.join(root,'.wolf')),['config.json']);
  const second=fixture(t);
  for(const id of ['a','b'])observeTaskReview(second,'claude','post-bash',{session_id:session,tool_use_id:id,tool_response:{}},1000);
  assert.equal(takeTaskReview(second,'claude',session,1000),undefined);
});

test('actual Bash hooks only append advisory context and always allow work to continue',t=>{
  const root=fixture(t),env={...process.env,CLAUDE_PROJECT_DIR:root,OPENWOLF_NO_UPDATE:'1'};
  const run=(id:string)=>execFileSync(process.execPath,[path.resolve('dist/hooks/post-bash.js')],{env,input:JSON.stringify(failure(id)),encoding:'utf8'});
  assert.equal(run('first'),'');
  const output=JSON.parse(run('second'));
  assert.match(output.hookSpecificOutput.additionalContext,/review suggestion/);
  assert.equal(output.decision,undefined);
  assert.equal(output.hookSpecificOutput.permissionDecision,undefined);
  assert.equal(output.continue,undefined);
  assert.equal(run('third'),'');
});
