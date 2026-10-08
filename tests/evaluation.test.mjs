import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationData } from '../scripts/eval-fixture.mjs';
test('ten read-only evaluation answers remain stable against the declared synthetic fixture',()=>{
  const tasks=evaluationData().tasks,pending=tasks.filter(t=>t.status==='pending'),completed=tasks.filter(t=>t.status==='completed');
  const answers=[pending.filter(t=>t.kind==='compose'&&t.postKind==='comment').length,completed.filter(t=>t.kind==='compose'&&t.result.relevant).length,pending.find(t=>t.kind==='analyze').campaign.name,completed.find(t=>t.kind==='compose'&&!t.result.relevant).key,pending.filter(t=>t.kind==='compose'&&t.postKind==='page'&&t.vendor==='A').length,completed.find(t=>t.kind==='analyze').key,tasks.filter(t=>['cancelled','expired'].includes(t.status)&&t.kind==='compose').length,tasks.filter(t=>['pending','completed'].includes(t.status)&&t.kind==='compose'&&t.vendor==='B').length,pending.filter(t=>t.kind==='compose'&&t.postKind==='page').at(-1).key,completed.find(t=>t.kind==='compose'&&t.postKind==='page'&&t.result.relevant).campaign.link];
  assert.deepEqual(answers,[4,2,'Supplier B','fixture:8',1,'fixture:9',2,4,'fixture:12','https://example.com/?ref=B&x=%2f']);
});
