import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WolfClient} from '../src/dashboard/app/lib/wolf-client.ts';

test('dashboard reports connection loss and deliberate disconnect never schedules reconnection', t => {
  const keys=['location','sessionStorage','window','WebSocket'] as const;
  const originals=keys.map(key=>Object.getOwnPropertyDescriptor(globalThis,key));
  t.after(()=>keys.forEach((key,i)=>originals[i]?Object.defineProperty(globalThis,key,originals[i]!):Reflect.deleteProperty(globalThis,key)));
  const connections:boolean[]=[];
  let reconnects=0;
  class FakeSocket {
    static latest:FakeSocket;
    onopen?:()=>void; onclose?:()=>void;
    constructor(){FakeSocket.latest=this}
    close(){this.onclose?.()}
  }
  Object.defineProperties(globalThis,{
    location:{configurable:true,value:{search:'',protocol:'http:',host:'localhost'}},
    sessionStorage:{configurable:true,value:{getItem:()=>''}},
    window:{configurable:true,value:{setTimeout:()=>{reconnects++;return 1}}},
    WebSocket:{configurable:true,value:FakeSocket},
  });
  const client=new WolfClient('ws://localhost',connected=>connections.push(connected));
  client.connect();FakeSocket.latest.onopen?.();FakeSocket.latest.close();
  assert.deepEqual(connections,[true,false]);assert.equal(reconnects,1);
  client.disconnect();assert.equal(reconnects,1);
  client.connect();FakeSocket.latest.onopen?.();client.disconnect();
  assert.equal(connections.at(-1),false);assert.equal(reconnects,1);
});
