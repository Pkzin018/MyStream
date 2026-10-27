import {useEffect,useRef,useState} from 'react';
import {useBilling} from '../context/BillingContext';
import ProWelcome from './ProWelcome';
import RenewalCheckout from './RenewalCheckout';
import PixTestPanel from './PixTestPanel';
import {formatBytes} from '../lib/billing';
export default function PlanPanel({onContinue}:{onContinue?:()=>void}){
 const {status,error,refresh}=useBilling();
 const previousPlan=useRef<string | null>(null);
 const [welcome,setWelcome]=useState(false);
 useEffect(()=>{
  if(!status)return;
  if(previousPlan.current==='free'&&status.plan==='pro')setWelcome(true);
  if(status.plan==='free')setWelcome(false);
  previousPlan.current=status.plan;
 },[status?.plan]);
 if(!status)return <div role="status" className="rounded-2xl border border-border p-5">{error||'Carregando seu plano…'}{error&&<button onClick={()=>void refresh()} className="block mt-3 underline">Tentar novamente</button>}</div>;
 if(status.plan==='pro')return <ProWelcome key={status.proUntil} status={status} welcome={welcome} onContinue={()=>{setWelcome(false);onContinue?.();}}/>;
 const expired=status.subscriptionStatus==='pix_paid';
 return <section className="space-y-6">
  <div className="rounded-2xl border border-border bg-card p-6"><h2 className="text-2xl font-bold">{expired?'Renove seu MyStream Pro':'Seu espaço pode ir além'}</h2><p className="mt-3 text-muted-foreground">{expired?'Seu período Pro terminou. Seus dados continuam na conta. Renove para liberar os benefícios novamente.':'Ative o Pro com um pagamento Pix e aproveite 30 dias de benefícios.'}</p><ul className="space-y-2 mt-5 text-sm"><li>✓ {formatBytes(status.plans.pro.storageBytes)} de armazenamento privado</li><li>✓ Playlists ilimitadas</li><li>✓ Arquivos próprios de até {formatBytes(status.plans.pro.maxFileBytes)}</li><li>✓ Biblioteca, favoritos e configurações na sua conta</li></ul></div>
  <RenewalCheckout/>
  {status.isAdmin&&status.testMode&&!expired&&<details className="rounded-2xl border border-border p-4"><summary className="cursor-pointer text-sm">Teste administrativo de R$1,00</summary><div className="mt-4"><PixTestPanel/></div></details>}
 </section>;
}
