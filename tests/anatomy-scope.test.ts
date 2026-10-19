import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {anatomyReadEligible} from '../dist/hooks/anatomy-scope.js';
import {buildAnatomy} from '../dist/src/scanner/anatomy-scanner.js';

test('scanner and read accounting agree on custom, nested ignore, generated and binary exclusions (#114)',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'wolf-scope-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(name:string,text:string)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text)};
 write('.wolf/config.json',JSON.stringify({openwolf:{anatomy:{exclude_patterns:['generated'],max_files:100},updates:{mode:'off'},visibility:{mode:'off'}}}));
 write('.gitignore','ignored/\nnested/*.ts\n!nested/keep.ts\n');write('nested/.gitignore','local.ts\n');
 const cases:[string,boolean][]=[['src/a.ts',true],['generated/a.ts',false],['ignored/a.ts',false],['nested/no.ts',false],['nested/keep.ts',true],['nested/local.ts',false],['.opencode/plugins/openwolf/index.ts',false],['bundle.js.map',false],['image.png',false],['custom-env/code.py',false]];
 write('custom-env/pyvenv.cfg','home = fixture');
 for(const [file] of cases)write(file,'export const a = 1;\n');
 assert.equal(anatomyReadEligible(root,'src'),false,'directories are not indexed files');
 if(process.platform!=='win32') {
  fs.symlinkSync(path.join(root,'src/a.ts'),path.join(root,'linked.ts'));
  fs.symlinkSync(path.join(root,'src'),path.join(root,'linked-dir'));
  assert.equal(anatomyReadEligible(root,'linked.ts'),false,'scanner skips file symlinks');
  assert.equal(anatomyReadEligible(root,'linked-dir/a.ts'),false,'scanner skips directory symlinks');
 }
 const scan=await buildAnatomy(path.join(root,'.wolf'),root);
 for(const [i,[file,eligible]] of cases.entries()) {
  assert.equal(anatomyReadEligible(root,file),eligible,file);
  assert.equal(!!scan.store.files[file],eligible,file+' scanner');
  execFileSync(process.execPath,[path.resolve('dist/hooks/pre-read.js')],{input:JSON.stringify({session_id:'scope-'+i,tool_input:{file_path:path.join(root,file)}}),env:{...process.env,CLAUDE_PROJECT_DIR:root,OPENWOLF_NO_UPDATE:'1'}});
  const state=JSON.parse(fs.readFileSync(path.join(root,'.wolf/hooks/sessions','scope-'+i+'.json'),'utf8'));
  assert.equal(state.anatomy_misses,eligible?1:0,file+' counter');
 }
 write('.wolf/config.json',JSON.stringify({openwolf:{anatomy:{exclude_patterns:[],respect_gitignore:false}}}));
 assert.equal(anatomyReadEligible(root,'ignored/a.ts'),true);
 assert.equal(anatomyReadEligible(root,'generated/a.ts'),true);
});
