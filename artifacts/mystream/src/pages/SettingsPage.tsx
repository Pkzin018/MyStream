import {useEffect, useState} from 'react';
import {ArrowLeft, User, LockKeyhole, Sun, Moon, Mail} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useAccount} from '../context/AccountContext';
import {authMessage} from '../lib/auth-errors';
import {uploadToTicket} from '../lib/media-storage';
import PlanPanel from '../components/PlanPanel';
import {Crown} from 'lucide-react';

type Tab='profile'|'password'|'plan';

export default function SettingsPage({onBack,initialTab='profile'}:{onBack:()=>void;initialTab?:Tab}) {
 const {user,avatar}=useAccount();
 const [tab,setTab]=useState<Tab>(initialTab);
 const [name,setName]=useState(user?.user_metadata?.display_name || '');
 const [theme,setTheme]=useState(user?.user_metadata?.theme === 'light' ? 'light' : 'dark');
 const [photo,setPhoto]=useState<File|null>(null);
 const [preview,setPreview]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [sent,setSent]=useState(false);
 useEffect(()=>{if(!photo){setPreview('');return;}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url);},[photo]);
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(!user)return;setBusy(true);setMessage('');
  let uploaded:string|undefined;
  try{
   let path=user.user_metadata?.avatar_path;
   if(photo){
    if(photo.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(photo.type))throw new Error('Use uma foto JPG, PNG ou WebP de até 2 MB.');
    uploaded=await uploadToTicket(photo,'avatar');path=uploaded;
   }
   const {error}=await supabase.auth.updateUser({data:{display_name:name.trim(),avatar_path:path || null,theme}});
   if(error)throw error;
   setMessage('Perfil atualizado.');setPhoto(null);
  }catch(e){if(uploaded)await supabase.storage.from('mystream-media').remove([uploaded]);const raw=e instanceof Error?e.message:'';setMessage(raw.startsWith('Use ')||raw.startsWith('Não foi possível enviar')?raw:authMessage(e));}
  finally{setBusy(false);}
 };
 const sendLink=async()=>{
  if(!user?.email)return;setBusy(true);setMessage('');
  try{
   const {error}=await supabase.auth.resetPasswordForEmail(user.email,{redirectTo:window.location.origin+'/'});
   if(error)throw error;
   setSent(true);setMessage('Solicitação enviada. Confira seu e-mail e a pasta de spam. Abra o link para confirmar e definir sua nova senha.');
  }catch(e){setMessage(authMessage(e));}finally{setBusy(false);}
 };
 return <section className="settings-page max-w-3xl mx-auto fade-in">
  <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><ArrowLeft size={18}/>Voltar</button>
  <h1 className="text-2xl md:text-3xl font-bold">Configurações da conta</h1>
  <p className="text-muted-foreground mt-2 mb-6">Seu perfil, sua aparência e sua segurança.</p>
  <nav aria-label="Configurações" className="flex gap-2 border-b border-border pb-3 mb-6">{([{id:'profile',label:'Perfil',Icon:User},{id:'password',label:'Senha',Icon:LockKeyhole},{id:'plan',label:'Plano',Icon:Crown}] as const).map(({id,label,Icon})=><button key={id} disabled={busy} aria-current={tab===id?'page':undefined} onClick={()=>{setTab(id);setMessage('');}} className={`flex gap-2 items-center rounded-xl px-5 py-3 ${tab===id?'bg-primary text-black font-semibold':'bg-secondary text-foreground'}`}><Icon size={18}/>{label}</button>)}</nav>
  {tab==='plan'?<PlanPanel onContinue={onBack}/>:tab==='profile'?<form onSubmit={save} className="space-y-6">
   <div className="flex flex-wrap items-center gap-5">{preview||avatar?<img src={preview||avatar} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border border-border"/>:<div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center"><User size={36}/></div>}<label className="text-sm font-semibold">Trocar foto<input aria-label="Trocar foto" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>setPhoto(e.target.files?.[0] || null)} className="block max-w-full text-xs mt-3"/><span className="block text-xs text-muted-foreground mt-2">JPG, PNG ou WebP · até 2 MB</span></label></div>
   <label className="block text-sm font-semibold">Nome<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} className="block mt-2 w-full rounded-xl p-3 bg-secondary border border-border"/></label>
   <div><p className="text-sm font-semibold">E-mail cadastrado</p><p className="mt-2 text-muted-foreground break-all">{user?.email}</p></div>
   <fieldset><legend className="text-sm font-semibold mb-3">Tema</legend><div className="grid grid-cols-2 gap-3">{([{id:'dark',label:'Escuro',Icon:Moon},{id:'light',label:'Claro',Icon:Sun}] as const).map(({id,label,Icon})=><label key={id} className={`flex items-center gap-3 rounded-xl p-4 border cursor-pointer ${theme===id?'border-primary bg-primary/10':'border-border bg-secondary'}`}><input type="radio" name="theme" value={id} checked={theme===id} onChange={()=>setTheme(id)}/><Icon size={20}/>{label}</label>)}</div></fieldset>
   <button disabled={busy} className="rounded-xl bg-primary text-black font-bold px-6 py-3 disabled:opacity-50">{busy?'Salvando…':'Salvar perfil'}</button>
  </form>:<div className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-4"><LockKeyhole size={30} className="text-primary"/><h2 className="text-xl font-bold">Trocar senha</h2><p className="text-muted-foreground">Para confirmar que é você, enviaremos um link ao e-mail cadastrado. Abra esse link para escolher e confirmar sua nova senha.</p><p className="flex items-center gap-2 break-all"><Mail size={18} className="shrink-0"/>{user?.email}</p><button onClick={sendLink} disabled={busy||sent} className="rounded-xl bg-primary text-black font-bold px-5 py-3 disabled:opacity-50">{busy?'Enviando…':sent?'Link solicitado':'Enviar link de confirmação'}</button></div>}
  {message&&<p role="status" className="mt-5 text-sm rounded-xl border border-border bg-secondary p-4">{message}</p>}
 </section>;
}
