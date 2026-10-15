import { handlePix } from './pix.mjs';
import { handleBilling } from './billing.mjs';
export function parseDuration(value) {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value || '');
  return m ? Number(m[1] || 0)*86400 + Number(m[2] || 0)*3600 + Number(m[3] || 0)*60 + Number(m[4] || 0) : undefined;
}
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true, searchConfigured: Boolean(env.YOUTUBE_API_KEY) });
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname === '/api/billing/webhook' || url.pathname === '/api/billing/pix' || url.pathname === '/api/billing/pix/status') return handlePix(request,env,url);
    if (url.pathname.startsWith('/api/billing/') || url.pathname.startsWith('/api/media/')) return handleBilling(request, env, url);
    if (url.pathname !== '/api/yt/search') return json({message:'Rota não encontrada.'},404);
    if (request.method !== 'GET') return json({message:'Método não permitido.'},405,{'Allow':'GET'});
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({message:'Origem não permitida.'},403);
    const q = (url.searchParams.get('q') || '').trim().replace(/\s+/g,' ');
    const max = Number(url.searchParams.get('max') || 24);
    const token = url.searchParams.get('pageToken') || '';
    if (!q || q.length > 200 || !Number.isInteger(max) || max < 1 || max > 50 || token.length > 300 || !/^[A-Za-z0-9_=-]*$/.test(token)) return json({message:'Busca inválida. Use até 200 caracteres.'},400);
    if (!env.YOUTUBE_API_KEY) return json({code:'NOT_CONFIGURED',message:'A busca ainda está sendo configurada. Adicione um link do YouTube para ouvir enquanto isso.'},503);
    const keyUrl = new URL('/api/cache/v2/yt/search',url.origin);
    keyUrl.search = new URLSearchParams({q,max:String(max),pageToken:token}).toString();
    const cache = caches.default;
    const key = new Request(keyUrl);
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Search-Cache':'HIT'}});
    if (env.SEARCH_LIMITER) {
      const limit = await env.SEARCH_LIMITER.limit({key:request.headers.get('CF-Connecting-IP') || 'unknown'});
      if (!limit.success) return json({message:'Muitas buscas em sequência. Aguarde um minuto.'},429,{'Retry-After':'60'});
    }
    const upstream = new URL('https://www.googleapis.com/youtube/v3/search');
    upstream.search = new URLSearchParams({part:'snippet',q,maxResults:String(max),type:'video',videoEmbeddable:'true',videoSyndicated:'true',key:env.YOUTUBE_API_KEY,...(token?{pageToken:token}:{})}).toString();
    try {
      const res = await fetch(upstream,{signal:AbortSignal.timeout(8000)});
      const data = await res.json();
      if (!res.ok) {
        const reasons = data.error?.errors?.map(e=>e.reason) || [];
        if (reasons.some(r=>['quotaExceeded','dailyLimitExceeded'].includes(r))) return json({code:'QUOTA_EXCEEDED',message:'A cota diária de buscas terminou. Seus favoritos e links do YouTube continuam disponíveis.'},429);
        if (reasons.includes('invalidPageToken')) return json({message:'Essa página expirou. Faça a busca novamente.'},400);
        return json({message:'O YouTube não autorizou a busca. A configuração do servidor precisa ser conferida.'},502);
      }
      const items = (data.items || []).filter(v=>v.id?.videoId).map(v=>({url:v.id.videoId,nome:v.snippet.title,thumb:v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${v.id.videoId}/hqdefault.jpg`,tipo:'yt',artista:v.snippet.channelTitle}));
      const ids = items.map(v => v.url).join(',');
      if (ids) {
        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        detailsUrl.search = new URLSearchParams({part:'contentDetails',id:ids,key:env.YOUTUBE_API_KEY}).toString();
        const detailRes = await fetch(detailsUrl,{signal:AbortSignal.timeout(8000)});
        if (!detailRes.ok) return json({message:'Não foi possível conferir a duração dos vídeos. Tente novamente.'},502);
        const detailData = await detailRes.json();
        const durations = new Map((detailData.items || []).map(v => [v.id,parseDuration(v.contentDetails?.duration)]));
        for (const item of items) {
          const seconds = durations.get(item.url);
          if (seconds !== undefined) item.duracao = seconds;
        }
      }
      const response = json({items,nextPageToken:data.nextPageToken || null},200,{'Cache-Control':'public, max-age=21600'});
      ctx.waitUntil(cache.put(key,response.clone()));
      return json({items,nextPageToken:data.nextPageToken || null},200,{'X-Search-Cache':'MISS'});
    } catch {
      return json({message:'O YouTube demorou para responder. Tente novamente em alguns instantes.'},504);
    }
  }
};
