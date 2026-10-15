import {syncRenewal} from './pix-renewal.mjs';
import {authUser, sb, mp, verifySignature} from './billing.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const table='/rest/v1/mystream_pix_tests';
export function summarize(order,row) {
 if(order.id!==row.order_id || order.external_reference!==row.request_id || Number(order.total_amount)!==Number(row.amount || 1) || (order.currency_id && order.currency_id!=='BRL') || (order.country_code && order.country_code!=='BRA')) throw new Error('order mismatch');
 const payment=order.transactions?.payments?.[0];
 if(!payment && ['processing','created'].includes(order.status))return {id:order.id,status:order.status,detail:order.status_detail,paid:false,amount:Number(row.amount || 1).toFixed(2),qrCode:'',qrImage:''};
 if(payment?.payment_method?.id!=='pix' || Number(payment.amount)!==Number(row.amount || 1)) throw new Error('payment mismatch');
 const paid=order.status==='processed' && order.status_detail==='accredited' && payment.status==='processed' && payment.status_detail==='accredited';
 return {id:order.id,status:order.status,detail:order.status_detail,paid,amount:Number(row.amount || 1).toFixed(2),qrCode:payment.payment_method.qr_code || '',qrImage:payment.payment_method.qr_code_base64 || ''};
}
async function getRow(env,uid) {return (await sb(env,table+'?user_id=eq.'+uid+'&select=*'))?.[0];}
export async function sync(env,row) {
 const order=await mp(env,'/v1/orders/'+encodeURIComponent(row.order_id));
 const result=summarize(order,row);
 await sb(env,table+'?user_id=eq.'+row.user_id,{method:'PATCH',body:JSON.stringify({status:result.status,paid:result.paid,updated_at:new Date().toISOString()})});
 if(result.paid) await sb(env,'/rest/v1/rpc/mystream_activate_paid_pix',{method:'POST',body:JSON.stringify({p_user_id:row.user_id,p_order_id:row.order_id})});
 return result;
}
export async function handlePix(request,env,url) {
 const webhook=url.pathname==='/api/billing/webhook';
 if(webhook) {
  if(request.method!=='POST')return json({message:'Método não permitido.'},405);
  if(!env.MP_WEBHOOK_SECRET)return json({message:'Assinatura de webhook não configurada.'},503);
  const id=url.searchParams.get('data.id') || '';
  if(!/^ORD[A-Za-z0-9]+$/.test(id))return json({message:'Order inválida.'},400);
  if(!await verifySignature(request,url,env.MP_WEBHOOK_SECRET))return json({message:'Assinatura inválida.'},401);
  try {
   const rows=await sb(env,table+'?order_id=eq.'+id+'&select=*');
   if(rows?.[0])await sync(env,rows[0]);
   else {const renewals=await sb(env,'/rest/v1/mystream_pix_renewals?order_id=eq.'+id+'&select=*');if(renewals?.[0])await syncRenewal(env,renewals[0]);}
   return json({ok:true});
  }catch{return json({message:'Falha temporária ao confirmar a order.'},502);}
 }
 if(!['/api/billing/pix','/api/billing/pix/status'].includes(url.pathname))return json({message:'Rota não encontrada.'},404);
 if(request.method!==(url.pathname.endsWith('/status')?'GET':'POST'))return json({message:'Método não permitido.'},405);
 const origin=request.headers.get('Origin');
 if((origin && origin!==url.origin) || request.headers.get('Sec-Fetch-Site')==='cross-site')return json({message:'Origem não permitida.'},403);
 const user=await authUser(request,env);
 if(!user)return json({message:'Entre na sua conta.'},401);
 if(user.app_metadata?.mystream_role!=='admin')return json({message:'Teste disponível apenas para administrador.'},403);
 if(!env.MP_ACCESS_TOKEN)return json({message:'Access Token do Mercado Pago não configurado.'},503);
 if(env.SEARCH_LIMITER && !(await env.SEARCH_LIMITER.limit({key:'pix:'+user.id})).success)return json({message:'Aguarde um minuto antes de tentar novamente.'},429);
 try {
  if(request.method==='GET'){const row=await getRow(env,user.id);return json({payment:row?.order_id?await sync(env,row):null,webhookConfigured:Boolean(env.MP_WEBHOOK_SECRET)});}
  const body=await request.json().catch(()=>null);
  if(!body || typeof body.email!=='string' || body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return json({message:'Informe o e-mail do pagador.'},400);
  if(body.confirmRealPayment!==true)return json({message:'Confirme que este Pix movimenta R$1,00 real.'},400);
  let row=await getRow(env,user.id);
  if(!row) {
   await sb(env,table+'?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({user_id:user.id,request_id:crypto.randomUUID(),payer_email:body.email.trim(),status:'creating'})});
   row=await getRow(env,user.id);
  }
  if(row.order_id)return json({payment:await sync(env,row),webhookConfigured:Boolean(env.MP_WEBHOOK_SECRET)});
  const order=await mp(env,'/v1/orders',{method:'POST',headers:{'X-Idempotency-Key':row.request_id},body:JSON.stringify({type:'online',processing_mode:'automatic',total_amount:Number(row.amount || 1).toFixed(2),external_reference:row.request_id,transactions:{payments:[{amount:Number(row.amount || 1).toFixed(2),payment_method:{id:'pix',type:'bank_transfer'},expiration_time:'PT30M'}]},payer:{email:row.payer_email}})});
  if(!/^ORD[A-Za-z0-9]+$/.test(order.id || ''))throw new Error('invalid order');
  row={...row,order_id:order.id};
  const result=summarize(order,row);
  await sb(env,table+'?user_id=eq.'+user.id,{method:'PATCH',body:JSON.stringify({order_id:order.id,status:result.status,paid:result.paid,updated_at:new Date().toISOString()})});
  return json({payment:result,webhookConfigured:Boolean(env.MP_WEBHOOK_SECRET)});
 }catch(e) {
  const code=String(e?.data?.errors?.[0]?.code || e?.data?.cause?.[0]?.code || e?.data?.error || '').replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,80);
  return json({message:'Não foi possível consultar ou gerar o Pix. Confira as credenciais, a habilitação de Pix e os dados do pagador no Mercado Pago.',code:code || 'PIX_UNAVAILABLE'},502);
 }
}
