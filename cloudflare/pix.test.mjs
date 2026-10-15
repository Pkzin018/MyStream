import {test} from 'node:test';import assert from 'node:assert/strict';
import {handlePix,summarize} from './pix.mjs';
test('only admin may create a Pix and confirmation is required',async()=>{
 const original=globalThis.fetch;let role='user';let calls=0;
 globalThis.fetch=async url=>{calls++;assert.match(url,/auth\/v1\/user/);return Response.json({id:'2f1b1592-f71b-4e1b-b003-38b42aad2338',app_metadata:{mystream_role:role}});};
 const env={SUPABASE_URL:'https://db.example',SUPABASE_PUBLISHABLE_KEY:'pub',MP_ACCESS_TOKEN:'test'};
 const url=new URL('https://app.example/api/billing/pix');
 const req=()=>new Request(url,{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({email:'payer@example.com',confirmRealPayment:false})});
 try{assert.equal((await handlePix(req(),env,url)).status,403);role='admin';assert.equal((await handlePix(req(),env,url)).status,400);assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
test('order identity and amount must match; only accredited payment confirms',()=>{
 const row={order_id:'ORDTEST',request_id:'reference'};
 const order={id:'ORDTEST',external_reference:'reference',total_amount:'1.00',country_code:'BRA',status:'processed',status_detail:'accredited',transactions:{payments:[{amount:'1.00',status:'processed',status_detail:'accredited',payment_method:{id:'pix'}}]}};
 assert.equal(summarize(order,row).paid,true);
 assert.equal(summarize({...order,status:'action_required'},row).paid,false);
 assert.throws(()=>summarize({...order,total_amount:'0.01'},row));
 assert.throws(()=>summarize({...order,external_reference:'another-user'},row));
});
