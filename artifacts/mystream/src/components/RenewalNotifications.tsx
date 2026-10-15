import {useState} from 'react';
import {Bell} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {useBilling} from '../context/BillingContext';
import {openPlan} from '../lib/billing';
export default function RenewalNotifications(){
 const {status}=useBilling();const [open,setOpen]=useState(false);const n=status?.renewalNotice;
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild><button type="button" aria-label={n?'Notificações: renovação do Pro':'Notificações'} className="relative icon-btn shrink-0"><Bell size={19}/>{n&&<span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary"/>}</button></PopoverTrigger>
  <PopoverContent align="end" side="bottom" sideOffset={10} collisionPadding={12} className="z-[240] w-80 max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-2xl border-border bg-card text-foreground shadow-xl p-5" aria-label="Notificações">
   <h2 className="font-bold mb-3">Notificações</h2>
   {n?<><h3 className="font-semibold">{n.title}</h3><p className="text-sm text-muted-foreground mt-2">{n.message}</p><button onClick={()=>{setOpen(false);openPlan();}} className="mt-4 rounded-xl bg-primary text-black font-bold px-4 py-2">Ver renovação</button></>:<p className="text-sm text-muted-foreground">Nenhum aviso de renovação no momento.</p>}
  </PopoverContent>
 </Popover>;
}
