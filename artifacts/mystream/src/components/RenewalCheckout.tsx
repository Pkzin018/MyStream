import {useEffect,useRef,useState} from 'react';
import {useAccount} from '../context/AccountContext';
import {useBilling} from '../context/BillingContext';
import {renewPix,type PixTestResult} from '../lib/billing';
export default function RenewalCheckout(){
 const {user}=useAccount();const {status,refresh}=useBilling();
 const [email,setEmail]=useState(user?.email || '');const [confirmed,setConfirmed]=useState(false);
 const [payment,setPayment]=useState<PixTestResult['payment']>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const id=useRef('');const checking=useRef(false);const done=useRef(false);
 const accept=async(next:PixTestResult['payment'])=>{setPayment(next);if(next?.id)id.current=next.id;if(next?.paid&&!done.current){await refresh();done.current=true;}};
 const check=async()=>{if(checking.current)return;checking.current=true;try{await accept((await renewPix(undefined,id.current)).payment);setMessage('');}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível conferir o pagamento.');}finally{checking.current=false;}};
 useEffect(()=>{void check();const focus=()=>{if(document.visibilityState==='visible')void check();};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[]);
 useEffect(()=>{if(!payment||payment.paid||['expired','cancelled','failed'].includes(payment.status))return;const timer=setInterval(()=>void check(),15000);return()=>clearInterval(timer);},[payment?.id,payment?.paid,payment?.status]);
 const create=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{await accept((await renewPix({email,confirmRealPayment:confirmed})).payment);}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível gerar o Pix.');}finally{setBusy(false);}};
 const price=(status?.priceBrl||14.9).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return <section className="rounded-2xl border border-border bg-card p-5 space-y-4 text-left">
  <h2 className="font-bold text-xl">{status?.proUntil?'Renovar':'Ativar'} Pro com Pix · {price}</h2>
  <p className="text-sm text-muted-foreground">30 dias de benefícios após a confirmação. Você recebe um aviso para renovar. Não há débito automático.</p>
  {(!payment||['expired','cancelled','failed'].includes(payment.status))?<form onSubmit={create} className="space-y-4">
   {payment&&<p className="text-sm">O Pix anterior expirou ou foi cancelado. Você pode gerar uma nova cobrança.</p>}
   <label className="block text-sm">E-mail do pagador<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full p-3 rounded-xl border border-border bg-secondary"/></label>
   <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo o pagamento único de {price}.</label>
   <button disabled={busy||!confirmed} className="bg-primary text-black font-bold px-5 py-3 rounded-xl disabled:opacity-50">{busy?'Gerando…':'Gerar QR Code Pix'}</button>
  </form>:<div className="space-y-4">
   <p role="status" className="font-semibold">{payment.paid?'Pagamento confirmado. Liberando seu Pro…':['expired','cancelled','failed'].includes(payment.status)?'Esta cobrança não está mais disponível. Entre em contato para emitir outra.':'Aguardando o pagamento do Pix…'}</p>
   {!payment.paid&&payment.qrImage&&<img alt="QR Code para pagar o Pro" src={'data:image/png;base64,'+payment.qrImage} className="w-64 max-w-full bg-white p-3 rounded-xl"/>}
   {!payment.paid&&payment.qrCode&&<><textarea aria-label="Pix copia e cola" readOnly value={payment.qrCode} className="w-full p-3 text-xs bg-secondary border border-border rounded-xl"/><button onClick={()=>void navigator.clipboard.writeText(payment.qrCode).then(()=>setMessage('Código copiado.')).catch(()=>setMessage('Selecione o código e copie manualmente.'))} className="bg-primary text-black font-bold px-4 py-3 rounded-xl">Copiar código Pix</button></>}
   {!payment.paid&&<button onClick={()=>void check()} className="block px-4 py-3 rounded-xl border border-border">Verificar pagamento</button>}
   <p className="text-xs text-muted-foreground">Confira o valor e o recebedor no seu banco antes de confirmar o Pix.</p>
  </div>}
  {message&&<p role="status" className="text-sm">{message}</p>}
 </section>;
}
