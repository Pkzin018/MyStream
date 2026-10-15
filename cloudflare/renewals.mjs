import {sb} from './billing.mjs';
export function renewalNotice(proUntil,now=Date.now()) {
 const end=new Date(proUntil || '').getTime();
 if(!Number.isFinite(end) || end-now>3*86400000)return null;
 const expired=end<=now;
 return {id:(expired?'expired:':'due:')+proUntil,expired,expiresAt:proUntil,title:expired?'Seu Pro venceu':'Seu Pro está perto de vencer',message:expired?'Renove com Pix para liberar mais 30 dias de benefícios.':'Seu acesso vence em '+new Date(end).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. Renove com Pix para continuar com seus benefícios.'};
}
export async function sendRenewalReminders(env,now=Date.now()) {
 if(!env.RESEND_API_KEY || !env.EMAIL_FROM)return {configured:false,sent:0};
 const rows=await sb(env,'/rest/v1/mystream_subscriptions?status=eq.pix_paid&pro_until=gte.'+encodeURIComponent(new Date(now-86400000).toISOString())+'&pro_until=lte.'+encodeURIComponent(new Date(now+3*86400000).toISOString())+'&select=user_id,pro_until&order=pro_until.asc');
 let sent=0;
 for(const row of rows || []) {
  const notice=renewalNotice(row.pro_until,now);if(!notice)continue;
  const kind=notice.expired?'expired':'due';
  const where='?user_id=eq.'+row.user_id+'&pro_until=eq.'+encodeURIComponent(row.pro_until)+'&kind=eq.'+kind;
  if((await sb(env,'/rest/v1/mystream_renewal_emails'+where+'&select=sent_at'))?.[0]?.sent_at)continue;
  const user=await sb(env,'/auth/v1/admin/users/'+row.user_id);
  if(!user?.email || !user.email_confirmed_at)continue;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'ms-renewal-'+row.user_id+'-'+new Date(row.pro_until).getTime()+'-'+kind},body:JSON.stringify({from:env.EMAIL_FROM,to:[user.email],subject:notice.title+' · MyStream',text:notice.message+'\n\nAbra o MyStream e acesse Perfil > Plano para renovar:\nhttps://mystream-eopkzin.eopkzin.workers.dev/\n\nCada pagamento confirmado libera 30 dias. Nenhum débito automático será realizado.'}),signal:AbortSignal.timeout(10000)});
  if(!res.ok)continue;
  await sb(env,'/rest/v1/mystream_renewal_emails?on_conflict=user_id,pro_until,kind',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:row.user_id,pro_until:row.pro_until,kind,sent_at:new Date(now).toISOString()})});
  sent++;
 }
 return {configured:true,sent};
}
