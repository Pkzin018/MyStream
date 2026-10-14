import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { authMessage } from '../lib/auth-errors';
export default function AccountScreen() {
 const [mode,setMode]=useState<'login'|'signup'|'reset'>('login');
 const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const resend=async()=>{
  if(!email.trim()) {setMessage('Preencha seu e-mail para reenviar a confirmação.');return;}
  setBusy(true);setMessage('');
  try {const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:window.location.origin}});if(error) throw error;setMessage('Se houver um cadastro aguardando confirmação, o e-mail será reenviado. Confira também o spam. Se já confirmou, use Entrar.');}
  catch(e){setMessage(authMessage(e));}finally{setBusy(false);}
 };
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();setBusy(true);setMessage('');
  try {
   if(mode==='reset') {
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});if(error) throw error;
    setMessage('Se este e-mail tiver uma conta, você receberá o link para definir uma nova senha. Confira também o spam.');
   } else if(mode==='signup') {
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()},emailRedirectTo:window.location.origin}});if(error) throw error;
    if(!data.session) setMessage('Se este for um cadastro novo, você receberá a confirmação por e-mail. Se já tem uma conta, entre com sua senha anterior ou use “Esqueci minha senha”.');
   } else {const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error) throw error;}
  } catch(e){setMessage(authMessage(e));}finally{setBusy(false);}
 };
 return <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-5"><section className="glass-panel rounded-3xl p-7 md:p-10 w-full max-w-md">
  <div className="flex items-center gap-3 mb-7"><img src="/mystream-logo.png" alt="Logo MyStream" className="w-14 h-14 object-contain"/><span className="text-2xl font-black">MyStream</span></div>
  <h1 className="text-2xl font-black mb-2">{mode==='reset'?'Recuperar minha conta':'Seu universo de música'}</h1><p className="text-muted-foreground text-sm mb-6">Sua biblioteca, seus favoritos e suas playlists, em qualquer dispositivo.</p>
  <div className="flex gap-2 mb-6">{(['login','signup'] as const).map(m=><button disabled={busy} key={m} onClick={()=>{setMode(m);setMessage('');}} className={`rounded-full px-4 py-2 text-sm font-bold ${mode===m?'bg-primary text-black':'bg-white/5'}`}>{m==='login'?'Entrar':'Criar conta'}</button>)}</div>
  <form onSubmit={submit} className="flex flex-col gap-4">
   {mode==='signup'&&<label className="text-sm">Seu nome<input required maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl p-3 bg-white/5 border border-white/15"/></label>}
   <label className="text-sm">E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl p-3 bg-white/5 border border-white/15"/></label>
   {mode!=='reset'&&<label className="text-sm">Senha<input type="password" required minLength={mode==='signup'?8:1} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl p-3 bg-white/5 border border-white/15"/></label>}
   {message&&<p role="status" className="text-sm text-amber-200">{message}</p>}
   <button disabled={busy} className="rounded-xl bg-primary text-black font-bold p-3 disabled:opacity-50">{busy?'Aguarde…':mode==='reset'?'Enviar link de recuperação':mode==='login'?'Entrar no MyStream':'Criar minha conta'}</button>
  </form>
  <div className="flex flex-col items-start gap-3 mt-5 text-sm text-primary"><button disabled={busy} onClick={()=>{setMode('reset');setMessage('');}}>Esqueci minha senha</button><button disabled={busy} onClick={()=>void resend()}>Reenviar confirmação de e-mail</button></div>
 </section></main>;
}
