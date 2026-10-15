import PixTestPanel from './PixTestPanel';
import {useEffect, useState} from 'react';
import {Check, Crown, RefreshCw} from 'lucide-react';
import {useBilling} from '../context/BillingContext';
import {cancelSubscription, formatBytes, startCheckout, setTestPlan} from '../lib/billing';

const date = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
const brl = (n: number) => n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

export default function PlanPanel() {
 const {status, loading, error, refresh} = useBilling();
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const [confirmCancel, setConfirmCancel] = useState(false);
 const pending = status?.subscriptionStatus === 'pending' && status.plan === 'free';

 // Depois de voltar do Mercado Pago, confirma o pagamento por até 1 minuto.
 useEffect(() => {
  if (!pending) return;
  const poll = setInterval(() => void refresh(), 5000);
  const stop = setTimeout(() => clearInterval(poll), 60000);
  return () => {clearInterval(poll); clearTimeout(stop);};
 }, [pending, refresh]);

 const subscribe = async () => {
  setBusy(true); setMessage('');
  try {const {url} = await startCheckout(); window.location.assign(url);}
  catch (e) {setMessage(e instanceof Error ? e.message : 'Não foi possível iniciar o pagamento.'); setBusy(false);}
 };
 const cancel = async () => {
  setBusy(true); setMessage('');
  try {await cancelSubscription(); setConfirmCancel(false); await refresh(); setMessage('Assinatura cancelada. Você mantém o Pro até o fim do período já pago.');}
  catch (e) {setMessage(e instanceof Error ? e.message : 'Não foi possível cancelar agora.');}
  finally {setBusy(false);}
 };

 if (!status) return <div className="rounded-2xl border border-border bg-card p-5 md:p-7" role="status">
  {error ? <><p className="text-red-300">{error}</p><button onClick={() => void refresh()} className="mt-4 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold">Tentar novamente</button></> : 'Carregando seu plano…'}
 </div>;

 const pro = status.plan === 'pro';
 const pct = Math.min(100, Math.round(status.usedBytes / status.limits.storageBytes * 100));
 const {free, pro: paid} = status.plans;
 const freeList = [formatBytes(free.storageBytes) + ' de armazenamento privado', `Até ${free.playlists} playlists`, 'Arquivos de até ' + formatBytes(free.maxFileBytes), 'Busca e player do YouTube'];
 const proList = [formatBytes(paid.storageBytes) + ' de armazenamento privado', 'Playlists ilimitadas', 'Arquivos de até ' + formatBytes(paid.maxFileBytes), 'Busca e player do YouTube', 'Apoia o desenvolvimento do MyStream'];

 const simulate = async (plan: 'free' | 'pro') => {
  setBusy(true); setMessage('');
  try {await setTestPlan(plan); await refresh(); setMessage('Plano de teste atualizado. Nenhuma cobrança realizada.');}
  catch(e) {setMessage(e instanceof Error ? e.message : 'Falha ao simular.');}
  finally {setBusy(false);}
 };
 return <div className="space-y-6">
  {status.isAdmin && <PixTestPanel/>}
  {status.testMode && <div className="rounded-2xl border border-primary bg-primary/10 p-5 space-y-3">
   <h2 className="font-bold">Simulação de planos · sem assinatura paga</h2>
   <p className="text-sm">{status.isAdmin ? 'Administrador: alterne seu plano para conferir os recursos e limites. O Pro de teste dura 7 dias.' : 'As assinaturas estão em teste. Pagamentos desativados.'}</p>
   {status.isAdmin && <div className="flex flex-wrap gap-3">
    <button disabled={busy} onClick={()=>void simulate('free')} className="rounded-xl bg-secondary px-4 py-3 disabled:opacity-50">Testar Gratuito</button>
    <button disabled={busy} onClick={()=>void simulate('pro')} className="rounded-xl bg-primary text-black px-4 py-3 disabled:opacity-50">Testar Pro por 7 dias</button>
   </div>}
  </div>}
  <div className="rounded-2xl border border-border bg-card p-5 md:p-7">
   <div className="flex items-center gap-3"><Crown size={26} className={pro ? 'text-primary' : 'text-muted-foreground'}/><h2 className="text-xl font-bold">Seu plano: {pro ? 'MyStream Pro' : 'Gratuito'}</h2></div>
   {pro && !status.testMode && <p className="mt-2 text-muted-foreground text-sm">{status.renews ? `Renova automaticamente · próximo ciclo até ${date(status.proUntil)}` : `Cancelado · acesso Pro até ${date(status.proUntil)}`}</p>}
   <div className="mt-5">
    <div className="flex justify-between text-sm font-semibold"><span>Armazenamento</span><span>{formatBytes(status.usedBytes)} de {formatBytes(status.limits.storageBytes)}</span></div>
    <div className="mt-2 h-2.5 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Armazenamento usado"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : 'bg-primary'}`} style={{width: pct + '%'}}/></div>
   </div>
  </div>

  <div className="grid md:grid-cols-2 gap-4">
   {([{title: 'Gratuito', price: 'R$ 0', list: freeList, current: !pro}, {title: 'Pro', price: brl(status.priceBrl) + '/mês', list: proList, current: pro}] as const).map(plan =>
    <div key={plan.title} className={`rounded-2xl border p-5 ${plan.title === 'Pro' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
     <div className="flex items-baseline justify-between"><h3 className="text-lg font-bold">{plan.title}</h3>{plan.current && <span className="text-xs font-bold text-primary">Plano atual</span>}</div>
     <p className="text-2xl font-black mt-1">{plan.price}</p>
     <ul className="mt-4 space-y-2 text-sm">{plan.list.map(item => <li key={item} className="flex gap-2"><Check size={16} className="text-primary shrink-0 mt-0.5"/>{item}</li>)}</ul>
    </div>)}
  </div>

  {!pro && !pending && <div>
   <button onClick={() => void subscribe()} disabled={busy || !status.configured} className="rounded-xl bg-primary text-black font-bold px-6 py-3 disabled:opacity-50">{busy ? 'Abrindo o Mercado Pago…' : 'Assinar o Pro'}</button>
   <p className="mt-3 text-xs text-muted-foreground">{status.configured ? 'Pagamento recorrente mensal pelo Mercado Pago, com cartão. Cancele quando quiser, aqui mesmo.' : 'As assinaturas ainda estão sendo configuradas. Volte em breve.'}</p>
  </div>}

  {pending && <div className="rounded-2xl border border-border bg-secondary p-5 text-sm space-y-3" role="status">
   <p className="font-semibold">Aguardando a confirmação do pagamento…</p>
   <p className="text-muted-foreground">Assim que o Mercado Pago confirmar, seu plano muda sozinho. Se você não concluiu o pagamento, pode tentar de novo.</p>
   <div className="flex flex-wrap gap-3"><button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-xl bg-secondary border border-border px-4 py-2 font-semibold"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>Verificar agora</button><button onClick={() => void subscribe()} disabled={busy} className="rounded-xl bg-primary text-black font-bold px-4 py-2 disabled:opacity-50">Pagar novamente</button></div>
  </div>}

  {!status.testMode && pro && status.renews && (confirmCancel
   ? <div className="rounded-2xl border border-border bg-secondary p-5 text-sm space-y-3"><p>Cancelar a renovação? Você continua com o Pro até {date(status.proUntil)}.</p><div className="flex gap-3"><button onClick={() => void cancel()} disabled={busy} className="rounded-xl bg-red-500 text-white font-bold px-4 py-2 disabled:opacity-50">{busy ? 'Cancelando…' : 'Sim, cancelar'}</button><button onClick={() => setConfirmCancel(false)} disabled={busy} className="rounded-xl bg-secondary border border-border px-4 py-2 font-semibold">Voltar</button></div></div>
   : <button onClick={() => setConfirmCancel(true)} className="text-sm text-muted-foreground underline">Cancelar assinatura</button>)}

  {message && <p role="status" className="text-sm rounded-xl border border-border bg-secondary p-4">{message}</p>}
 </div>;
}
