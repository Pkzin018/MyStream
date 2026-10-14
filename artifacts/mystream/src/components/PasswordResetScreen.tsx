import {useState} from 'react';
import {supabase} from '../lib/supabase';
import {useAccount} from '../context/AccountContext';
import {authMessage} from '../lib/auth-errors';
export default function PasswordResetScreen(){
 const {finishRecovery}=useAccount();const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(password!==confirm){setMessage('As senhas não coincidem.');return;}setBusy(true);try{const {error}=await supabase.auth.updateUser({password});if(error) throw error;finishRecovery();}catch(e){setMessage(authMessage(e));}finally{setBusy(false);}};
 return <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-5"><form onSubmit={submit} className="glass-panel rounded-3xl p-8 max-w-md w-full flex flex-col gap-4"><img src="/mystream-logo.png" alt="MyStream" className="w-14 h-14"/><h1 className="text-2xl font-bold">Definir nova senha</h1><label>Nova senha<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 bg-white/5 border border-white/15 rounded-xl p-3 w-full"/></label><label>Confirmar nova senha<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 bg-white/5 border border-white/15 rounded-xl p-3 w-full"/></label>{message&&<p role="alert" className="text-amber-200">{message}</p>}<button disabled={busy} className="rounded-xl bg-primary text-black font-bold p-3">{busy?'Salvando…':'Salvar nova senha'}</button></form></main>;
}
