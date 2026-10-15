// MyStream Pro — assinaturas via Mercado Pago (preapproval) e cota de armazenamento.
// Rotas: GET /api/billing/status · POST /api/billing/checkout · POST /api/billing/cancel
//        POST /api/billing/webhook (Mercado Pago) · POST /api/media/upload-ticket
// Segredos (wrangler secret put): SUPABASE_SERVICE_ROLE_KEY, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET
// Variáveis (wrangler.jsonc): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, PRO_PRICE_BRL, FREE_STORAGE_MB, PRO_STORAGE_MB

const MB = 1024 * 1024;
const testMode = env => env.BILLING_MODE !== 'live';
const admin = user => user?.app_metadata?.mystream_role === 'admin';
const GRACE_MS = 2 * 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_MIME = new Set(['audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac','video/mp4','video/webm','video/quicktime','video/ogg']);
const AVATAR_MIME = new Set(['image/jpeg','image/png','image/webp']);
export const FREE_PLAYLISTS = 5;

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

export function limitsFor(env, pro) {
  const free = Number(env.FREE_STORAGE_MB) || 200;
  const paid = Number(env.PRO_STORAGE_MB) || 2048;
  return { storageBytes: (pro ? paid : free) * MB, maxFileBytes: 50 * MB, playlists: pro ? null : FREE_PLAYLISTS };
}
export function isPro(row, now = Date.now()) {
  return Boolean(row?.pro_until) && new Date(row.pro_until).getTime() > now;
}

// ---------- Supabase (service role, só no servidor) ----------
function sbHeaders(env, extra = {}) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  // Chaves novas (sb_secret_...) só vão em "apikey"; chaves JWT legadas também em Authorization.
  return { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: 'Bearer ' + key } : {}), 'Content-Type': 'application/json', ...extra };
}
async function sb(env, path, init = {}) {
  const res = await fetch(env.SUPABASE_URL + path, { ...init, headers: sbHeaders(env, init.headers), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('supabase ' + res.status + ' ' + path);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
async function getRow(env, uid) {
  const rows = await sb(env, `/rest/v1/mystream_subscriptions?user_id=eq.${uid}&select=*`);
  return rows?.[0] || null;
}
async function saveRow(env, row) {
  await sb(env, '/rest/v1/mystream_subscriptions?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }) });
}
async function storageUsed(env, uid) {
  const n = await sb(env, '/rest/v1/rpc/mystream_storage_used', { method: 'POST', body: JSON.stringify({ uid }) });
  return Number(n) || 0;
}

// ---------- Autenticação do usuário (JWT do Supabase Auth) ----------
async function authUser(request, env) {
  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') || '')?.[1];
  if (!token) return null;
  try {
    const res = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const user = await res.json();
    return UUID.test(user?.id || '') ? user : null;
  } catch { return null; }
}

// ---------- Mercado Pago ----------
async function mp(env, path, init = {}) {
  const res = await fetch('https://api.mercadopago.com' + path, { ...init, headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error('mp ' + res.status); err.status = res.status; err.data = data; throw err; }
  return data;
}

// Traz o estado real da assinatura do Mercado Pago e grava no banco.
// O acesso Pro vale até (próxima cobrança + 2 dias de tolerância); cancelar não corta o que já foi pago.
export async function syncPreapproval(env, preapprovalId, expectedUid) {
  const pre = await mp(env, '/preapproval/' + encodeURIComponent(preapprovalId));
  const uid = pre.external_reference;
  if (!UUID.test(uid || '') || (expectedUid && uid !== expectedUid)) throw new Error('external_reference inválido');
  const existing = await getRow(env, uid);
  let proUntil = existing?.pro_until || null;
  if (pre.status === 'authorized' && pre.next_payment_date) {
    const candidate = new Date(new Date(pre.next_payment_date).getTime() + GRACE_MS).toISOString();
    if (!proUntil || candidate > proUntil) proUntil = candidate;
  }
  const row = { user_id: uid, mp_preapproval_id: String(pre.id), status: pre.status || 'pending', pro_until: proUntil };
  await saveRow(env, row);
  return row;
}

async function verifySignature(request, url, secret) {
  const sig = request.headers.get('x-signature') || '';
  const ts = /(?:^|,)\s*ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /(?:^|,)\s*v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  let dataId = url.searchParams.get('data.id') || '';
  if (/^[A-Za-z0-9]+$/.test(dataId)) dataId = dataId.toLowerCase();
  const manifest = `id:${dataId};request-id:${request.headers.get('x-request-id') || ''};ts:${ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const expected = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

async function webhook(request, env, url) {
  if (!env.MP_WEBHOOK_SECRET || !env.MP_ACCESS_TOKEN || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ message: 'Cobrança não configurada.' }, 503);
  if (!(await verifySignature(request, url, env.MP_WEBHOOK_SECRET))) return json({ message: 'Assinatura inválida.' }, 401);
  const body = await request.json().catch(() => ({}));
  const type = body.type || url.searchParams.get('type') || url.searchParams.get('topic') || '';
  const id = String(body?.data?.id || url.searchParams.get('data.id') || '');
  if (!id) return json({ ok: true });
  try {
    if (type === 'subscription_preapproval') await syncPreapproval(env, id);
    else if (type === 'subscription_authorized_payment') {
      const payment = await mp(env, '/authorized_payments/' + encodeURIComponent(id));
      if (payment.preapproval_id) await syncPreapproval(env, String(payment.preapproval_id));
    }
  } catch { return json({ message: 'Falha ao processar; tente novamente.' }, 500); } // MP reenvia
  return json({ ok: true });
}

// ---------- Rotas do usuário ----------
async function status(env, user) {
  let row = await getRow(env, user.id);
  const stale = row?.updated_at && Date.now() - new Date(row.updated_at).getTime() > 6 * 3600000;
  if (!testMode(env) && row?.mp_preapproval_id && env.MP_ACCESS_TOKEN && (row.status === 'pending' || (row.status === 'authorized' && stale))) {
    try { row = await syncPreapproval(env, row.mp_preapproval_id, user.id); } catch { /* mantém o que está salvo */ }
  }
  const pro = isPro(row);
  return json({
    testMode: testMode(env),
    isAdmin: admin(user),
    configured: !testMode(env) && Boolean(env.MP_ACCESS_TOKEN && env.MP_WEBHOOK_SECRET),
    plan: pro ? 'pro' : 'free',
    subscriptionStatus: row?.status || 'none',
    proUntil: row?.pro_until || null,
    renews: pro && row?.status === 'authorized',
    usedBytes: await storageUsed(env, user.id),
    limits: limitsFor(env, pro),
    plans: { free: limitsFor(env, false), pro: limitsFor(env, true) },
    priceBrl: Number(env.PRO_PRICE_BRL) || 14.9
  });
}

async function checkout(env, user, origin) {
  if (!env.MP_ACCESS_TOKEN || !env.MP_WEBHOOK_SECRET) return json({ code: 'NOT_CONFIGURED', message: 'A cobrança ainda está sendo configurada.' }, 503);
  const row = await getRow(env, user.id);
  if (isPro(row) && row.status === 'authorized') return json({ message: 'Sua assinatura Pro já está ativa.' }, 409);
  try {
    const pre = await mp(env, '/preapproval', { method: 'POST', body: JSON.stringify({
      reason: 'MyStream Pro', external_reference: user.id, payer_email: user.email, status: 'pending',
      back_url: origin + '/?billing=return',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: Number(env.PRO_PRICE_BRL) || 14.9, currency_id: 'BRL' }
    }) });
    if (!pre.init_point) throw new Error('sem init_point');
    await saveRow(env, { user_id: user.id, mp_preapproval_id: String(pre.id), status: 'pending', pro_until: row?.pro_until || null });
    return json({ url: pre.init_point });
  } catch { return json({ message: 'Não foi possível iniciar o pagamento. Tente novamente.' }, 502); }
}

async function cancel(env, user) {
  const row = await getRow(env, user.id);
  if (!row?.mp_preapproval_id || row.status === 'cancelled') return json({ message: 'Nenhuma assinatura ativa para cancelar.' }, 404);
  try {
    await mp(env, '/preapproval/' + encodeURIComponent(row.mp_preapproval_id), { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
    await syncPreapproval(env, row.mp_preapproval_id, user.id);
    return json({ ok: true });
  } catch { return json({ message: 'Não foi possível cancelar agora. Tente novamente.' }, 502); }
}

async function uploadTicket(request, env, user) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind === 'avatar' ? 'avatar' : 'media';
  const size = Number(body?.size);
  const type = String(body?.contentType || '');
  const ext = String(body?.ext || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const maxFile = kind === 'avatar' ? 2 * MB : 50 * MB;
  if (!Number.isFinite(size) || size <= 0) return json({ message: 'Arquivo inválido.' }, 400);
  if (size > maxFile) return json({ code: 'FILE_TOO_LARGE', message: kind === 'avatar' ? 'Use uma foto de até 2 MB.' : 'Cada arquivo pode ter até 50 MB.' }, 413);
  if (!(kind === 'avatar' ? AVATAR_MIME : MEDIA_MIME).has(type)) return json({ message: 'Formato de arquivo não aceito.' }, 415);
  const pro = isPro(await getRow(env, user.id));
  const limit = limitsFor(env, pro).storageBytes;
  const used = await storageUsed(env, user.id);
  if (used + size > limit) return json({ code: 'QUOTA_EXCEEDED', plan: pro ? 'pro' : 'free', message: pro ? 'Seu armazenamento Pro está cheio. Apague arquivos para enviar novos.' : 'Seu armazenamento gratuito acabou. Assine o Pro para ter mais espaço.' }, 413);
  const path = `${user.id}/${kind === 'avatar' ? 'avatar-' : ''}${crypto.randomUUID()}${kind === 'avatar' ? '' : '.' + ext}`;
  try {
    const signed = await sb(env, '/storage/v1/object/upload/sign/mystream-media/' + path, { method: 'POST', body: '{}' });
    const token = new URL(signed.url, env.SUPABASE_URL).searchParams.get('token');
    if (!token) throw new Error('sem token');
    return json({ path, token });
  } catch { return json({ message: 'Não foi possível preparar o envio. Tente novamente.' }, 502); }
}

export async function handleBilling(request, env, url) {
  const route = url.pathname;
  if (route === '/api/billing/webhook') {
    if (testMode(env)) return json({message: 'Cobrança real desativada no teste.'}, 403);
    if (request.method !== 'POST') return json({ message: 'Método não permitido.' }, 405, { Allow: 'POST' });
    return webhook(request, env, url);
  }
  const routes = { '/api/billing/test-plan': 'POST', '/api/billing/status': 'GET', '/api/billing/checkout': 'POST', '/api/billing/cancel': 'POST', '/api/media/upload-ticket': 'POST' };
  if (!(route in routes)) return json({ message: 'Rota não encontrada.' }, 404);
  if (request.method !== routes[route]) return json({ message: 'Método não permitido.' }, 405, { Allow: routes[route] });
  const origin = request.headers.get('Origin');
  if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ message: 'Origem não permitida.' }, 403);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ code: 'NOT_CONFIGURED', message: 'O servidor ainda está sendo configurado.' }, 503);
  const user = await authUser(request, env);
  if (!user) return json({ message: 'Entre na sua conta para continuar.' }, 401);
  try {
    if (route === '/api/billing/test-plan') {
      if (!testMode(env) || !admin(user)) return json({message: 'Acesso restrito ao administrador em modo de teste.'}, 403);
      const body = await request.json().catch(() => null);
      if (!['free','pro'].includes(body?.plan)) return json({message: 'Plano inválido.'}, 400);
      const existing = await getRow(env, user.id);
      if (existing?.mp_preapproval_id) return json({message: 'Esta conta possui assinatura de pagamento. Use uma conta sem cobrança para simular.'},409);
      await saveRow(env, {user_id:user.id, status:body.plan === 'pro' ? 'test' : 'none', pro_until:body.plan === 'pro' ? new Date(Date.now()+7*86400000).toISOString() : null});
      return status(env,user);
    }
    if (testMode(env) && ['/api/billing/checkout','/api/billing/cancel'].includes(route)) return json({message: 'Nenhuma cobrança é realizada em modo de teste.'},403);
    if (route === '/api/billing/status') return await status(env, user);
    if (route === '/api/billing/checkout') return await checkout(env, user, url.origin);
    if (route === '/api/billing/cancel') return await cancel(env, user);
    return await uploadTicket(request, env, user);
  } catch { return json({ message: 'Erro temporário. Tente novamente.' }, 502); }
}
