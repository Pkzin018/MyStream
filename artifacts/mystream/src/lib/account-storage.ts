import { supabase } from './supabase';
import type { AppState, MediaItem } from '../types';
export function emptyState(): AppState {
 return {biblioteca:[],favoritos:[],historico:[],playlists:[],fila:[],configuracoes:{volume:1,shuffle:false,repeat:'none',modoAudio:false}};
}
export function cloudState(state: AppState): AppState {
 const permanent = (item:MediaItem) => !item.url.startsWith('blob:');
 const stable=(items:MediaItem[])=>items.filter(permanent).map(item=>item.storagePath?{...item,url:'storage:'+item.storagePath}:item);
 return {...state, fila:[], biblioteca:stable(state.biblioteca),favoritos:stable(state.favoritos),historico:stable(state.historico),playlists:state.playlists.map(p=>({...p,musicas:stable(p.musicas)}))};
}
export async function loadAccountState(userId:string):Promise<AppState> {
 const {data,error} = await supabase.from('mystream_user_state').select('state').eq('user_id',userId).maybeSingle();
 if(error) throw error;
 const base=emptyState();
 const loaded:AppState=data ? {...base,...data.state,fila:[],configuracoes:{...base.configuracoes,...data.state.configuracoes}} : base;
 const all=[...loaded.biblioteca,...loaded.favoritos,...loaded.historico,...loaded.playlists.flatMap(p=>p.musicas)];
 const paths=[...new Set(all.flatMap(item=>item.storagePath?[item.storagePath]:[]))];
 if(paths.length) {
   const {data:urls,error:signError}=await supabase.storage.from('mystream-media').createSignedUrls(paths,86400);
   if(signError) throw signError;
   const map=new Map(urls.map(item=>[item.path,item.signedUrl]));
   const hydrate=(items:MediaItem[])=>items.map(item=>item.storagePath?{...item,url:map.get(item.storagePath)||''}:item);
   loaded.biblioteca=hydrate(loaded.biblioteca);loaded.favoritos=hydrate(loaded.favoritos);loaded.historico=hydrate(loaded.historico);loaded.playlists=loaded.playlists.map(p=>({...p,musicas:hydrate(p.musicas)}));
 }
 return loaded;
}
export async function saveAccountState(userId:string,state:AppState) {
 const {error} = await supabase.from('mystream_user_state').upsert({user_id:userId,state:cloudState(state),updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error) throw error;
}
