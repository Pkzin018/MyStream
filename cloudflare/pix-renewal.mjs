import {authUser,sb,mp} from './billing.mjs';
import {summarize} from './pix.mjs';
const table='/rest/v1/mystream_pix_renewals';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function syncRenewal(env,row){
 const order=await mp(env,'/v1/orders/'+encodeURIComponent(row.order_id));
 const payment=summarize(order,row);
 await sb(env,table+'?id=eq.'+row.id,{method:'PATCH',body:JSON.stringify({status:payment.status,paid:payment.paid})});
 if(payment.paid)await sb(env,'/rest/v1/rpc/mystream_activate_pix_renewal',{method:'POST',body:JSON.stringify({p_id:row.id})});
 return payment;
}
export async function handleRenewal(request,env,url){
 if(request.method!==(url.pathname.endsWith('/status')?'GET':'POST'))return json({message:'Método não permitido.'},405);
 const origin=request.headers.get('Origin');if((origin && origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({message:'Origem não permitida.'},403);
 const user=await authUser(request,env);if(!user)return json({message:'Entre na sua conta.'},401);
 if(!env.MP_ACCESS_TOKEN)return json({message:'O pagamento Pix ainda está sendo configurado.'},503);
 if(env.SEARCH_LIMITER && !(await env.SEARCH_LIMITER.limit({key:'pix:'+user.id})).success)return json({message:'Aguarde um minuto antes de tentar novamente.'},429);
 try{
  const subscription=(await sb(env,'/rest/v1/mystream_subscriptions?user_id=eq.'+user.id+'&select=pro_until'))?.[0];
  const cycle=subscription?.pro_until || 'initial';
  let query='?user_id=eq.'+user.id;
  const orderId=url.searchParams.get('orderId');
  if(orderId){if(!/^ORD[A-Za-z0-9]+$/.test(orderId))return json({message:'Pagamento inválido.'},400);query+='&order_id=eq.'+orderId;}
  else query+='&cycle_key=eq.'+encodeURIComponent(cycle);
  let row=(await sb(env,table+query+'&select=*'))?.[0];
  if(request.method==='GET')return json({payment:row?.order_id?await syncRenewal(env,row):null});
  if(subscription?.pro_until && new Date(subscription.pro_until).getTime()>Date.now()+3*86400000)return json({message:'Seu Pro está ativo. A renovação abre três dias antes do vencimento.'},409);
  const body=await request.json().catch(()=>null);
  if(!body?.confirmRealPayment || typeof body.email!=='string' || body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return json({message:'Informe o e-mail do pagador e confirme o pagamento.'},400);
  if(row?.order_id){
   const previous=await syncRenewal(env,row);
   if(previous.paid || !['expired','cancelled','failed'].includes(previous.status))return json({payment:previous});
   await sb(env,table+'?id=eq.'+row.id+'&paid=eq.false',{method:'PATCH',body:JSON.stringify({cycle_key:'archived:'+row.id})});row=null;
  }
  if(!row){
   const amount=Number(env.PRO_PRICE_BRL || '14.90');if(!Number.isFinite(amount)||amount<=0)throw new Error('price');
   await sb(env,table+'?on_conflict=user_id,cycle_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({user_id:user.id,cycle_key:cycle,request_id:crypto.randomUUID(),payer_email:body.email.trim(),amount})});
   row=(await sb(env,table+query+'&select=*'))?.[0];
  }
  if(row.order_id)return json({payment:await syncRenewal(env,row)});
  const amount=Number(row.amount).toFixed(2);
  const order=await mp(env,'/v1/orders',{method:'POST',headers:{'X-Idempotency-Key':row.request_id},body:JSON.stringify({type:'online',processing_mode:'automatic',total_amount:amount,external_reference:row.request_id,transactions:{payments:[{amount,payment_method:{id:'pix',type:'bank_transfer'},expiration_time:'P1D'}]},payer:{email:row.payer_email}})});
  if(!/^ORD[A-Za-z0-9]+$/.test(order.id || ''))throw new Error('order');
  row={...row,order_id:order.id};
  await sb(env,table+'?id=eq.'+row.id,{method:'PATCH',body:JSON.stringify({order_id:order.id})});
  return json({payment:await syncRenewal(env,row)});
 }catch{return json({message:'Não foi possível gerar ou confirmar o Pix. Tente novamente. Se a cobrança já existe, ela será reutilizada.'},502);}
}
