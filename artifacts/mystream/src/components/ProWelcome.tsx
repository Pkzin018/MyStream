import {useState} from 'react';
import RenewalCheckout from './RenewalCheckout';
import {motion,useReducedMotion} from 'framer-motion';
import {Check,Crown,HardDrive,ListMusic,Upload,Heart,ArrowRight} from 'lucide-react';
import type {BillingStatus} from '../lib/billing';
import {formatBytes} from '../lib/billing';

export default function ProWelcome({status,onContinue,welcome=false}:{status:BillingStatus;onContinue?:()=>void;welcome?:boolean}){
 const reduce=useReducedMotion();const [renew,setRenew]=useState(false);
 const benefits=[
  {Icon:HardDrive,title:formatBytes(status.limits.storageBytes)+' só seus',text:'Armazenamento privado para seus arquivos de áudio e vídeo.'},
  {Icon:ListMusic,title:'Playlists ilimitadas',text:'Organize seus conteúdos por momento, estilo ou atividade.'},
  {Icon:Upload,title:'Arquivos de até '+formatBytes(status.limits.maxFileBytes),text:'Envie seus arquivos próprios e acesse pela sua conta.'},
  {Icon:Heart,title:'Sua biblioteca conectada',text:'Seus favoritos, histórico e configurações acompanham sua conta.'}
 ];
 const percent=Math.min(100,Math.round(status.usedBytes/status.limits.storageBytes*100));
 return <section className="space-y-6 max-w-3xl mx-auto">
  {status.renewalNotice && <div className="rounded-2xl border border-primary bg-primary/10 p-5"><h2 className="font-bold">{status.renewalNotice.title}</h2><p className="text-sm mt-2">{status.renewalNotice.message}</p><button onClick={()=>setRenew(!renew)} className="mt-3 rounded-xl bg-primary text-black font-bold px-4 py-2">{renew?'Fechar renovação':'Renovar com Pix'}</button></div>}

  {welcome ? <motion.div initial={reduce?false:{opacity:0,y:18}} animate={{opacity:1,y:0}} className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-card to-card px-6 py-10 md:p-12 text-center">
   {!reduce && Array.from({length:14},(_,i)=><motion.span aria-hidden="true" key={i} className="absolute h-2 w-2 rounded-sm bg-primary pointer-events-none" style={{left:(10+(i*17)%80)+'%',top:'45%'}} initial={{opacity:0,y:0}} animate={{opacity:[0,1,0],y:[0,-70-(i%4)*20,120],x:[0,(i%2?1:-1)*(25+i*3)],rotate:[0,180+i*20]}} transition={{duration:1.8,delay:i*.025}}/>)}
   <motion.div initial={reduce?false:{scale:.3}} animate={{scale:1}} transition={{type:'spring',stiffness:220,damping:14}} className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-primary text-black shadow-lg shadow-primary/20"><Check size={42} strokeWidth={3}/></motion.div>
   <p className="text-primary text-xs tracking-widest font-bold uppercase mb-3">MyStream Pro ativo</p>
   <h2 className="text-3xl md:text-4xl font-black">Agora você é Pro!</h2>
   <p className="text-muted-foreground mt-4 max-w-md mx-auto">{status.subscriptionStatus==='pix_paid'?'Pagamento confirmado. Seus benefícios já estão liberados.':'Seu acesso Pro está ativo. Aproveite seus benefícios.'}</p>
   {status.proUntil && <p className="text-sm mt-3">Acesso até {new Date(status.proUntil).toLocaleDateString('pt-BR')}</p>}
   {onContinue && <button onClick={onContinue} className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary text-black font-bold px-6 py-3">Aproveitar meu Pro<ArrowRight size={18}/></button>}
  </motion.div> : <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
   <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 font-bold text-primary"><Crown size={22}/>MyStream Pro</span><span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Ativo</span></div>
   <h2 className="mt-5 text-2xl font-bold">Seu plano</h2>
   <p className="mt-2 text-sm text-muted-foreground">Acompanhe seu acesso e gerencie sua assinatura.</p>
   <dl className="mt-6 grid gap-5 sm:grid-cols-2">
    <div><dt className="text-sm text-muted-foreground">{status.renews?'Próxima renovação':'Acesso até'}</dt><dd className="mt-1 font-semibold">{status.proUntil?new Date(status.proUntil).toLocaleDateString('pt-BR'):'Sem data de término informada'}</dd></div>
    <div><dt className="text-sm text-muted-foreground">Renovação</dt><dd className="mt-1 font-semibold">{status.renews?'Automática':'Manual com Pix'}</dd></div>
   </dl>
  </div>}
  <div className="rounded-2xl border border-border bg-card p-5">
   <h3 className="font-bold">Renovação do plano</h3>
   <p className="mt-2 text-sm text-muted-foreground">{status.renews?'Sua assinatura está configurada para renovação automática.':'Seu Pix é um pagamento único. Você decide quando renovar, sem débito automático.'}</p>
   {!status.renews&&<button aria-expanded={renew} aria-controls="pro-renewal-checkout" onClick={()=>setRenew(!renew)} className="mt-4 rounded-xl border border-primary/40 text-primary font-bold px-4 py-3">{renew?'Fechar renovação':'Renovar com Pix'}</button>}
  </div>
  {renew&&<div id="pro-renewal-checkout"><RenewalCheckout/></div>}
  <div className="grid sm:grid-cols-2 gap-4">{benefits.map(({Icon,title,text},i)=><motion.div key={title} initial={reduce?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:reduce?0:.15+i*.08}} className="rounded-2xl border border-border bg-card p-5"><Icon size={24} className="text-primary mb-3"/><h3 className="font-bold">{title}</h3><p className="text-sm text-muted-foreground mt-2">{text}</p></motion.div>)}</div>
  <div className="rounded-2xl border border-border bg-card p-5">
   <div className="flex items-center gap-2 mb-4 font-bold"><Crown size={19} className="text-primary"/>Seu espaço Pro</div>
   <div className="flex justify-between gap-3 text-sm"><span>Armazenamento usado</span><span>{formatBytes(status.usedBytes)} de {formatBytes(status.limits.storageBytes)}</span></div>
   <div role="progressbar" aria-label="Armazenamento usado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 rounded-full bg-secondary overflow-hidden mt-3"><div style={{width:percent+'%'}} className="h-full bg-primary rounded-full"/></div>
   {status.subscriptionStatus==='pix_paid' && <p className="text-xs text-muted-foreground mt-4">Este pagamento Pix é avulso e não autoriza débitos futuros.</p>}
  </div>
 </section>;
}
