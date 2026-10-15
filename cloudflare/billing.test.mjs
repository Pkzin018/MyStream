import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleBilling} from './billing.mjs';

const env={BILLING_MODE:'test',SUPABASE_URL:'https://db.example',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server'};
const uid='2f1b1592-f71b-4e1b-b003-38b42aad2338';
test('test routes enforce authentication, server admin role and no real charges', async()=>{
 const original=globalThis.fetch;
 let role='user'; let saved;
 globalThis.fetch=async(url,init={})=>{
  if(url.includes('/auth/v1/user')) return Response.json({id:uid,app_metadata:{mystream_role:role}});
  if(url.includes('/rest/v1/mystream_pix_renewals')) return Response.json([]);
  if(url.includes('/rest/v1/mystream_pix_tests')) return Response.json([]);
  if(url.includes('/rest/v1/mystream_subscriptions')) {
   if(init.method==='POST'){saved=JSON.parse(init.body);return new Response(null,{status:204});}
   return Response.json(saved?[saved]:[]);
  }
  if(url.includes('/rpc/mystream_storage_used'))return Response.json(0);
  throw new Error('Unexpected external request: '+url);
 };
 const request=(path,body,token=true)=>{
  const url=new URL('https://app.example'+path);
  return handleBilling(new Request(url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer test'}:{})},body:JSON.stringify(body)}),env,url);
 };
 try{
  assert.equal((await request('/api/billing/test-plan',{plan:'pro'},false)).status,401);
  assert.equal((await request('/api/billing/test-plan',{plan:'pro'})).status,403);
  role='admin';
  assert.equal((await request('/api/billing/test-plan',{plan:'invalid'})).status,400);
  let res=await request('/api/billing/test-plan',{plan:'pro',user_id:'somebody-else'});
  assert.equal(res.status,200);assert.equal((await res.json()).plan,'pro');assert.equal(saved.user_id,uid);
  res=await request('/api/billing/test-plan',{plan:'free'});
  assert.equal((await res.json()).plan,'free');
  assert.equal((await request('/api/billing/checkout',{})).status,403);
  assert.equal((await request('/api/billing/webhook',{})).status,403);
 }finally{globalThis.fetch=original;}
});
