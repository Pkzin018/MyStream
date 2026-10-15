import {useState} from 'react';
import {Bell} from 'lucide-react';
import {useBilling} from '../context/BillingContext';
import {openPlan} from '../lib/billing';
export default function RenewalNotifications(){
 const {status}=useBilling();const [open,setOpen]=useState(false);const n=status?.renewalNotice;
 return <div className="relative shrink-0">
  <button aria-label={n?'Notificações: renovação do Pro':'Notificações'} aria-expanded={open} onClick={()=>setOpen(!open)} className="relative icon-btn"><Bell size={19}/>{n&&<span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary"/>}</button>
  {open&&<div className="fixed md:absolute right-3 md:right-0 top-20 md:top-12 z-[210] w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-card shadow-xl p-5" role="region" aria-label="Notificações">
   <h2 className="font-bold mb-3">Notificações</h2>
   {n?<><h3 className="font-semibold">{n.title}</h3><p className="text-sm text-muted-foreground mt-2">{n.message}</p><button onClick={()=>{setOpen(false);openPlan();}} className="mt-4 rounded-xl bg-primary text-black font-bold px-4 py-2">Ver renovação</button></>:<p className="text-sm text-muted-foreground">Nenhum aviso de renovação no momento.</p>}
  </div>}
 </div>;
}
