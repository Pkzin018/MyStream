import {supabase} from './supabase';

export interface BillingStatus {
 testMode: boolean;
 isAdmin: boolean;
 configured: boolean;
 plan: 'free' | 'pro';
 subscriptionStatus: 'none' | 'pending' | 'authorized' | 'paused' | 'cancelled' | string;
 proUntil: string | null;
 renews: boolean;
 usedBytes: number;
 limits: {storageBytes: number; maxFileBytes: number; playlists: number | null};
 plans: {free: BillingStatus['limits']; pro: BillingStatus['limits']};
 priceBrl: number;
}

export class BillingError extends Error {
 code: string;
 constructor(message: string, code = '') {super(message); this.code = code;}
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
 const {data} = await supabase.auth.getSession();
 const token = data.session?.access_token;
 if (!token) throw new BillingError('Entre na sua conta para continuar.', 'NO_SESSION');
 let res: Response;
 try {
  res = await fetch(path, {...init, headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...init.headers}});
 } catch {
  throw new BillingError('Sem conexão com o servidor. Tente novamente.', 'NETWORK');
 }
 const body = await res.json().catch(() => ({}));
 if (!res.ok) throw new BillingError(body.message || 'Algo deu errado. Tente novamente.', body.code || String(res.status));
 return body as T;
}

export const getBillingStatus = () => authed<BillingStatus>('/api/billing/status');
export const startCheckout = () => authed<{url: string}>('/api/billing/checkout', {method: 'POST'});
export const cancelSubscription = () => authed<{ok: true}>('/api/billing/cancel', {method: 'POST'});
export const requestUploadTicket = (body: {kind: 'media' | 'avatar'; size: number; ext: string; contentType: string}) =>
 authed<{path: string; token: string}>('/api/media/upload-ticket', {method: 'POST', body: JSON.stringify(body)});

export function formatBytes(bytes: number) {
 if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1).replace('.', ',') + ' GB';
 return Math.round(bytes / 1024 ** 2) + ' MB';
}

export const openPlan = () => window.dispatchEvent(new Event('mystream-open-plan'));

export const setTestPlan = (plan: 'free' | 'pro') => authed<BillingStatus>('/api/billing/test-plan', {method:'POST',body:JSON.stringify({plan})});
