import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {useAccount} from './AccountContext';
import {getBillingStatus, type BillingStatus} from '../lib/billing';

interface BillingValue {status: BillingStatus | null; loading: boolean; error: string; refresh: () => Promise<void>}
const BillingContext = createContext<BillingValue | null>(null);

export function BillingProvider({children}: {children: React.ReactNode}) {
 const {user} = useAccount();
 const [status, setStatus] = useState<BillingStatus | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const refresh = useCallback(async () => {
  if (!user) return;
  setLoading(true);
  try {setStatus(await getBillingStatus()); setError('');}
  catch (e) {setError(e instanceof Error ? e.message : 'Não foi possível carregar seu plano.');}
  finally {setLoading(false);}
 }, [user?.id]);
 useEffect(() => {setStatus(null); setError(''); void refresh();}, [refresh]);
 useEffect(()=>{const update=()=>{if(document.visibilityState==='visible')void refresh();};window.addEventListener('focus',update);const timer=setInterval(update,60000);return()=>{window.removeEventListener('focus',update);clearInterval(timer);};},[refresh]);
 return <BillingContext.Provider value={{status, loading, error, refresh}}>{children}</BillingContext.Provider>;
}

export function useBilling() {
 const value = useContext(BillingContext);
 if (!value) throw new Error('BillingProvider ausente');
 return value;
}
