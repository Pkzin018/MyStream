import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
interface AccountValue { recovery: boolean; finishRecovery:()=>void; avatar:string; user: User | null; loading: boolean; error: string; signOut: () => Promise<void> }
const AccountContext = createContext<AccountValue | null>(null);
export function AccountProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery,setRecovery]=useState(window.location.hash.includes('type=recovery'));
  const [avatar,setAvatar]=useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const {data} = supabase.auth.onAuthStateChange((event, session) => {if(event==='PASSWORD_RECOVERY') setRecovery(true);setUser(session?.user || null); setLoading(false);});
    supabase.auth.getSession().then(({data, error}) => { if(error) setError('Não foi possível recuperar sua sessão.'); setUser(data.session?.user || null); setLoading(false); }).catch(() => {setError('Não foi possível conectar à sua conta.'); setLoading(false);});
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(()=>{
    let cancelled=false;setAvatar('');
    const path=user?.user_metadata?.avatar_path;
    if(path && path.startsWith(user!.id+'/')) supabase.storage.from('mystream-media').createSignedUrl(path,86400).then(({data})=>{if(!cancelled) setAvatar(data?.signedUrl || '');});
    return ()=>{cancelled=true;};
  },[user?.id,user?.user_metadata?.avatar_path]);
  useEffect(()=>{
    document.documentElement.dataset.theme = user?.user_metadata?.theme === 'light' ? 'light' : 'dark';
  },[user?.id,user?.user_metadata?.theme]);
  const signOut = async () => {
    const {error} = await supabase.auth.signOut();
    if(error) {setError('Não foi possível sair. Tente novamente.'); return;}
    setUser(null);
    for(const key of Object.keys(localStorage)) if(key.startsWith('mystream_search_') || key.startsWith('mystream_recommendations_')) localStorage.removeItem(key);
  };
  return <AccountContext.Provider value={{user, loading, error, signOut,recovery,finishRecovery:()=>setRecovery(false),avatar}}>{children}</AccountContext.Provider>;
}
export function useAccount() {const value = useContext(AccountContext); if(!value) throw new Error('AccountProvider ausente'); return value;}
