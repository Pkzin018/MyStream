import {useEffect,useState} from 'react';
import {pixTest, type PixTestResult} from '../lib/billing';
export default function PixTestPanel(){
 const [email,setEmail]=useState('');const [confirmed,setConfirmed]=useState(false);
 const [result,setResult]=useState<PixTestResult|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const check=async()=>{try{setResult(await pixTest());}catch(e){setMessage(e instanceof Error?e.message:'Falha ao consultar.');}};
 useEffect(()=>{void check();},[]);
 const payment=result?.payment;
 useEffect(()=>{
  if(!payment || payment.paid || ['expired','cancelled','failed','refunded'].includes(payment.status))return;
  const interval=setInterval(()=>void check(),15000);const stop=setTimeout(()=>clearInterval(interval),30*60*1000);
  return()=>{clearInterval(interval);clearTimeout(stop);};
 },[payment?.id,payment?.paid,payment?.status]);
 const create=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{setResult(await pixTest({email,confirmRealPayment:confirmed}));}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível gerar o Pix.');}finally{setBusy(false);}};
 return <section className="rounded-2xl border border-primary p-5 space-y-4">
  <h2 className="font-bold text-xl">Teste Pix · R$1,00 real</h2>
  <p className="text-sm text-muted-foreground">Pagamento único para a conta Mercado Pago configurada. Não cria assinatura nem altera seu plano.</p>
  {result && !result.webhookConfigured && <p className="text-sm">Webhook pendente de configuração. O botão Verificar pagamento consulta o Mercado Pago diretamente.</p>}
  {!payment?<form onSubmit={create} className="space-y-4">
   <label className="block text-sm">E-mail de quem vai pagar<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="block w-full bg-secondary border border-border rounded-xl p-3 mt-2"/></label>
   <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Entendo que este Pix movimenta R$1,00 real.</label>
   <button disabled={busy||!confirmed} className="rounded-xl px-5 py-3 bg-primary text-black font-bold disabled:opacity-50">{busy?'Gerando…':'Gerar Pix de R$1,00'}</button>
  </form>:<div className="space-y-4">
   <p role="status" className="font-semibold">{payment.paid?'Pagamento confirmado pelo Mercado Pago!':`Status: ${payment.status} · ${payment.detail || 'aguardando atualização'}`}</p>
   {!payment.paid && payment.qrImage && <img alt="QR Code Pix de R$1,00" src={'data:image/png;base64,'+payment.qrImage} className="w-64 max-w-full bg-white rounded-xl p-3"/>}
   {!payment.paid && payment.qrCode && <><label className="block text-sm">Pix copia e cola<textarea readOnly value={payment.qrCode} className="block mt-2 w-full bg-secondary rounded-xl border border-border p-3 text-xs"/></label><button onClick={()=>void navigator.clipboard.writeText(payment.qrCode).then(()=>setMessage('Código Pix copiado.')).catch(()=>setMessage('Selecione e copie o código manualmente.'))} className="rounded-xl bg-primary text-black px-4 py-3 font-bold">Copiar código Pix</button></>}
   {!payment.paid && !payment.qrCode && <p className="text-sm">O Mercado Pago ainda está preparando os dados do pagamento. Aguarde e verifique novamente.</p>}
   <button disabled={busy} onClick={()=>void check()} className="block rounded-xl border border-border bg-secondary px-4 py-3">Verificar pagamento</button>
   <p className="text-xs text-muted-foreground break-all">Order: {payment.id}. Confira valor e recebedor no aplicativo do seu banco antes de pagar.</p>
  </div>}
  {message&&<p role="status" className="text-sm">{message}</p>}
 </section>;
}
