import {test} from 'node:test';import assert from 'node:assert/strict';
import {handleRenewal} from './pix-renewal.mjs';
test('customer checkout uses server price and reuses a pending charge',async()=>{
 const original=globalThis.fetch;let row;let posts=0;let order;
 const uid='2f1b1592-f71b-4e1b-b003-38b42aad2338';
 globalThis.fetch=async(url,init={})=>{
  if(url.includes('/auth/v1/user'))return Response.json({id:uid});
  if(url.includes('/mystream_subscriptions'))return Response.json([]);
  if(url.includes('/mystream_pix_renewals')){
   if(init.method==='POST'){row={...JSON.parse(init.body),id:'11111111-2222-4333-8444-555555555555'};return new Response(null,{status:204});}
   if(init.method==='PATCH'){row={...row,...JSON.parse(init.body)};return new Response(null,{status:204});}
   return Response.json(row?[row]:[]);
  }
  if(url==='https://api.mercadopago.com/v1/orders'&&init.method==='POST'){
   posts++;const body=JSON.parse(init.body);assert.equal(body.total_amount,'14.90');assert.equal(body.transactions.payments[0].amount,'14.90');assert.equal(init.headers['X-Idempotency-Key'],row.request_id);
   order={id:'ORDTEST',external_reference:row.request_id,total_amount:'14.90',status:'action_required',status_detail:'waiting_transfer',transactions:{payments:[{amount:'14.90',payment_method:{id:'pix',qr_code:'pix-pending'}}]}};return Response.json(order);
  }
  if(url==='https://api.mercadopago.com/v1/orders/ORDTEST')return Response.json(order);
  throw new Error('Unexpected request '+url);
 };
 const env={SUPABASE_URL:'https://db.example',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server',MP_ACCESS_TOKEN:'private',PRO_PRICE_BRL:'14.90'};
 const url=new URL('https://app.example/api/billing/renew');
 const req=()=>new Request(url,{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({email:'payer@example.com',confirmRealPayment:true,amount:'0.01'})});
 try{assert.equal((await handleRenewal(req(),env,url)).status,200);assert.equal((await handleRenewal(req(),env,url)).status,200);assert.equal(posts,1);assert.equal(row.user_id,uid);}finally{globalThis.fetch=original;}
});
