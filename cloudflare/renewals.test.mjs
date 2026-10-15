import {test} from 'node:test';import assert from 'node:assert/strict';
import {renewalNotice,sendRenewalReminders} from './renewals.mjs';
import {summarize} from './pix.mjs';
test('renewal notice begins three days before expiry and changes after expiry',()=>{
 const now=Date.parse('2026-10-15T12:00:00Z');
 assert.equal(renewalNotice('2026-10-19T12:00:00Z',now),null);
 assert.equal(renewalNotice('2026-10-18T12:00:00Z',now).expired,false);
 assert.equal(renewalNotice('2026-10-15T12:00:00Z',now).expired,true);
 assert.equal(renewalNotice(null,now),null);
});
test('emails remain disabled without sender configuration',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Must not send');};
 try{assert.deepEqual(await sendRenewalReminders({}),{configured:false,sent:0});}finally{globalThis.fetch=original;}
});
test('renewal confirmation checks the price recorded on the server',()=>{
 const row={order_id:'ORDTEST',request_id:'ref',amount:'14.90'};
 const order={id:'ORDTEST',external_reference:'ref',total_amount:'14.90',status:'processed',status_detail:'accredited',transactions:{payments:[{amount:'14.90',status:'processed',status_detail:'accredited',payment_method:{id:'pix'}}]}};
 assert.equal(summarize(order,row).paid,true);
 assert.throws(()=>summarize({...order,total_amount:'1.00'},row));
});
