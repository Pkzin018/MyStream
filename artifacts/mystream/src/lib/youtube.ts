import type { MediaItem } from '../types';
interface SearchResult { items: MediaItem[]; nextPageToken: string | null }
const TTL = 6 * 60 * 60 * 1000;
const pending = new Map<string, Promise<SearchResult>>();
export async function buscarYouTube(termo: string, max = 24, pageToken: string | null = null, _apiKey?: string): Promise<SearchResult> {
  const q = termo.trim().replace(/\s+/g, ' ');
  if (!q) return { items: [], nextPageToken: null };
  const params = new URLSearchParams({ q, max: String(max) });
  if (pageToken) params.set('pageToken', pageToken);
  const key = 'mystream_search_v4:' + params;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && Date.now() - cached.at < TTL) return cached.result;
  } catch { /* Storage is optional. */ }
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    let res: Response;
    try { res = await fetch('/api/yt/search?' + params, { signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error('Não foi possível conectar à busca. Verifique sua conexão e tente novamente.'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'A busca está indisponível no momento.');
    if (!Array.isArray(data.items)) throw new Error('Resposta inválida da busca.');
    const result: SearchResult = { items: data.items, nextPageToken: data.nextPageToken || null };
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('mystream_search_v4:'));
      if (keys.length >= 30) localStorage.removeItem(keys[0]);
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), result }));
    } catch { /* Storage is optional. */ }
    return result;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
export async function gerarRecomendacoes(historico: MediaItem[], apiKey?: string): Promise<MediaItem[]> {
  const recentes = historico.slice(-5);
  const termo = recentes.length ? (recentes[recentes.length - 1].artista || recentes[recentes.length - 1].nome) + ' música' : 'música brasileira sucessos';
  return (await buscarYouTube(termo, 24, null, apiKey)).items;
}
