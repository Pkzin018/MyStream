import {supabase} from './supabase';
import {requestUploadTicket, BillingError} from './billing';
import type {MediaItem, MediaType} from '../types';

const MIME_ALIASES: Record<string, string> = {'audio/mp3': 'audio/mpeg', 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4', 'audio/wave': 'audio/wav', 'audio/x-flac': 'audio/flac'};
export const normalizeMime = (type: string) => MIME_ALIASES[type] || type;

// Envia um arquivo para o armazenamento privado. O servidor confere a cota do plano
// e devolve um ticket de envio; o arquivo vai direto do navegador para o Supabase.
export async function uploadToTicket(file: File, kind: 'media' | 'avatar'): Promise<string> {
 const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
 const contentType = normalizeMime(file.type);
 const ticket = await requestUploadTicket({kind, size: file.size, ext: extension, contentType});
 const {error} = await supabase.storage.from('mystream-media').uploadToSignedUrl(ticket.path, ticket.token, file, {contentType});
 if (error) throw new BillingError('Não foi possível enviar este arquivo. Verifique o formato e tente novamente.', 'UPLOAD_FAILED');
 return ticket.path;
}

export async function uploadMedia(file: File, _userId: string, tipo: MediaType): Promise<MediaItem> {
 const path = await uploadToTicket(file, 'media');
 const {data, error: signError} = await supabase.storage.from('mystream-media').createSignedUrl(path, 86400);
 if (signError) throw signError;
 return {storagePath: path, url: data.signedUrl, nome: file.name.replace(/\.[^/.]+$/, ''), thumb: '', tipo};
}
