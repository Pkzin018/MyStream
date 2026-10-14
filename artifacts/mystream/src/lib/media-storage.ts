import {supabase} from './supabase';
import type {MediaItem, MediaType} from '../types';
export async function uploadMedia(file:File,userId:string,tipo:MediaType):Promise<MediaItem> {
 if(file.size>50*1024*1024) throw new Error('Cada arquivo pode ter até 50 MB.');
 const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'') || 'bin';
 const path=userId+'/'+crypto.randomUUID()+'.'+extension;
 const {error}=await supabase.storage.from('mystream-media').upload(path,file,{upsert:false,contentType:file.type});
 if(error) throw new Error('Não foi possível enviar este arquivo. Verifique o formato e tente novamente.');
 const {data,error:signError}=await supabase.storage.from('mystream-media').createSignedUrl(path,86400);
 if(signError) throw signError;
 return {storagePath:path,url:data.signedUrl,nome:file.name.replace(/\.[^/.]+$/,''),thumb:'',tipo};
}
