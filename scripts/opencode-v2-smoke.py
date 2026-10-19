import json, pathlib, subprocess, os, threading, sys, hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
# Use only disposable metadata produced by release-smoke.mjs.
metadata=pathlib.Path(sys.argv[1]).resolve()
log_path=metadata.parent/'native-v2-smoke.log'
f=json.load(open(metadata));root=pathlib.Path(f['clean']).resolve();stage=0
# Exercise version detection and migration through the real adapter before the run.
subprocess.run(['node','--input-type=module','-',str(root)],cwd=pathlib.Path(__file__).resolve().parent.parent,input='''
await import('./dist/src/agents/index.js');
const {detectOpenCodePluginApi,installOpenCodePlugin}=await import('./dist/src/agents/opencode.js');
if(detectOpenCodePluginApi()!=='v2')throw Error('Native OpenCode V2 is required');
const result=installOpenCodePlugin({projectRoot:process.argv[2],templatesDir:process.cwd()+'/src/templates'});
if(result.warnings.length)throw Error(result.warnings.join('\\n'));
console.log(result.actions.join('\\n'));
''',text=True,check=True)
disabled='--disabled' in sys.argv
(root/'app.js').write_text('export const answer = 42;\n')
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  global stage
  req=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  tools=[t.get('function',{}).get('name') for t in req.get('tools',[])]
  if not tools:
   delta={'content':'Fixture test'};reason='stop'
  elif stage<4:
   name=['read','edit','edit','read'][stage];args={'path':str(root/'app.js')}
   if name=='edit':args.update(oldString='nonexistent fixture text' if stage==1 else '42',newString='43')
   assert name in tools,(name,tools)
   delta={'tool_calls':[{'index':0,'id':'fixture-call-'+str(stage),'type':'function','function':{'name':name,'arguments':json.dumps(args)}}]};reason='tool_calls';stage+=1
  else:delta={'content':'DONE'};reason='stop'
  self.send_response(200);self.send_header('Content-Type','text/event-stream');self.end_headers()
  for d,finish in [(delta,None),({},reason)]:
   chunk={'id':'fixture-message-'+str(stage),'object':'chat.completion.chunk','created':1,'model':'fixture','choices':[{'index':0,'delta':d,'finish_reason':finish}]}
   if finish:chunk['usage']={'prompt_tokens':100,'completion_tokens':10,'total_tokens':110}
   self.wfile.write(('data: '+json.dumps(chunk)+'\n\n').encode())
  self.wfile.write(b'data: [DONE]\n\n')
server=HTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
p=root/'.wolf/config.json';cfg=json.load(open(p));cfg['openwolf']['enabled']=not disabled;cfg['openwolf']['updates']={'mode':'off'};cfg['openwolf']['cron']['enabled']=False;p.write_text(json.dumps(cfg))
(root/'opencode.json').write_text(json.dumps({'provider':{'fixture':{'npm':'@ai-sdk/openai-compatible','name':'Local fixture','options':{'baseURL':f'http://127.0.0.1:{server.server_port}/v1','apiKey':'fixture'},'models':{'fixture':{'name':'Fixture','limit':{'context':64000,'output':1000}}}}},'model':'fixture/fixture','small_model':'fixture/fixture','permission':{'*':'deny','read':'allow','edit':'allow'}}))
env=os.environ.copy();env['PWD']=str(root.resolve())
for k in ['CONFIG','DATA','CACHE','STATE']:env['XDG_'+k+'_HOME']=str(pathlib.Path(f['temp'])/('opencode-'+k.lower()))
env.update(OPENCODE_DISABLE_AUTOUPDATE='1',OPENCODE_DISABLE_CLAUDE_CODE='1',OPENCODE_DISABLE_EXTERNAL_SKILLS='1',OPENCODE_DISABLE_MODELS_FETCH='1',OPENWOLF_NO_UPDATE='1')
with open(log_path,'w') as log:
 try:
  r=subprocess.run(['opencode','run','--standalone','--print-logs','--format','json','--model','fixture/fixture','Run the isolated fixture read/edit/read check.'],cwd=root,env=env,stdout=log,stderr=log,timeout=90)
  print('native exit',r.returncode,'tool stages',stage,'content',(root/'app.js').read_text())
 except subprocess.TimeoutExpired:
  server.shutdown()
  raise AssertionError('Native OpenCode timed out')
server.shutdown()
assert r.returncode==0 and stage==4
assert (root/'app.js').read_text()=='export const answer = 43;\n'
events=[json.loads(line) for line in pathlib.Path(log_path).read_text().splitlines() if line.startswith('{')]
sid=next(e['sessionID'] for e in events if e.get('sessionID'))
assert [e['part']['state']['status'] for e in events if e.get('type')=='tool_use']==['completed','error','completed','completed']
ledger=root/'.wolf/hooks/sessions'/f'{sid}.json'
usage=[json.loads(p.read_text())['message'] for p in (root/'.wolf/usage/opencode').glob('*.json')]
usage=[m for m in usage if m['sessionID']==sid]
if disabled:
 assert not ledger.exists() and not usage
else:
 data=json.loads(ledger.read_text());assert data['stop_count']==1;assert data['edit_counts']['app.js']==1
 assert len(data['files_written'])==1
 assert data['files_read'][str(root/'app.js')]['read_hash']==hashlib.sha256((root/'app.js').read_bytes()).hexdigest()
 assert len(usage)==5 and sum(m['tokens']['input'] for m in usage)==500 and sum(m['tokens']['output'] for m in usage)==50
 assert all(m['modelID']=='fixture' for m in usage)
print('PASS: native V2', 'disabled emits no session or usage' if disabled else 'read fingerprint, failed edit excluded, one successful edit, one turn end, five per-step usage records')

