import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import MediaCard, { SkeletonCard } from '../components/MediaCard';
import { buscarYouTube } from '../lib/youtube';
import type { MediaItem } from '../types';

interface ExplorarPageProps {
  searchQuery: string;
  apiKey: string;
  onAddToPlaylist: (item: MediaItem) => void;
}

const DEFAULT_QUERY = '';

export default function ExplorarPage({ searchQuery, apiKey, onAddToPlaylist }: ExplorarPageProps) {
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'long'>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const [title, setTitle] = useState('Explorar');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextPageRef = useRef<string | null>(null);
  const activeQueryRef = useRef('');
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const buscar = useCallback(async (termo: string, reset: boolean) => {
    // Block concurrent "load more" calls
    if (!reset && busyRef.current) return;
    if (!reset && !nextPageRef.current) return;

    const requestId = ++requestIdRef.current;
    setError('');
    busyRef.current = true;
    const page = reset ? null : nextPageRef.current;
    const q = termo.trim() || DEFAULT_QUERY;

    if (reset) {
      activeQueryRef.current = q;
      nextPageRef.current = null;
      setLoading(true);
      setItems([]);
      setTitle(termo.trim() ? `Resultados para "${termo.trim()}"` : 'Explorar — Sugestões');
    } else {
      setLoadingMore(true);
    }

    try {
      const { items: novos, nextPageToken } = await buscarYouTube(q, 50, page, apiKey);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      nextPageRef.current = nextPageToken;
      if (reset) {
        setItems(novos);
      } else {
        setItems(prev => [...prev, ...novos.filter(item => !prev.some(existing => existing.url === item.url))]);
      }
    } catch (e) {
      if (mountedRef.current && requestId === requestIdRef.current) setError(e instanceof Error ? e.message : 'Falha na busca.');
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
        busyRef.current = false;
      }
    }
  }, [apiKey]);

  // Single effect: run whenever searchQuery changes (including initial '')
  useEffect(() => {
    buscar(searchQuery, true);
  }, [searchQuery]);

  const visibleItems = items.filter(item => durationFilter === 'all' || (item.duracao !== undefined && item.duracao > 0 && (durationFilter === 'short' ? item.duracao <= 60 : item.duracao > 60)));

  return (
    <div className="fade-in">
      <motion.h2
        className="text-2xl font-black tracking-tight mb-6"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        key={title}
      >
        {title}
      </motion.h2>

      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtrar por duração">
        {([['all', 'Todos'], ['short', 'Curtos · até 1 min'], ['long', 'Longos · mais de 1 min']] as const).map(([value, label]) => (
          <button key={value} aria-pressed={durationFilter === value} onClick={() => setDurationFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${durationFilter === value ? 'bg-primary text-black border-primary' : 'bg-white/5 text-foreground border-white/10 hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-5">Filtro por duração. Vídeo curto não significa necessariamente um Short do YouTube.</p>
      {!loading && searchQuery && <p className="text-xs text-muted-foreground mb-4">{visibleItems.length} exibidos de {items.length} resultados carregados. {nextPageRef.current ? 'Há mais resultados disponíveis abaixo.' : 'Fim dos resultados retornados pelo YouTube.'}</p>}
      {error && <p role="alert" className="mb-5 text-sm text-red-300">{error} Você ainda pode adicionar um link do YouTube na biblioteca.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5">
        {loading
          ? Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)
          : visibleItems.map((item, idx) => (
              <MediaCard
                key={item.url}
                item={item}
                index={idx}
                lista={visibleItems}
                isBusca
                onAddToPlaylist={onAddToPlaylist}
              />
            ))
        }
        {loadingMore && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
      </div>

      {!loading && !error && visibleItems.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
          <div className="text-4xl">🔍</div>
          <p className="text-sm">{searchQuery ? (items.length ? 'Nenhum vídeo desta duração nesta página. Carregue mais resultados ou troque o filtro.' : 'Nenhum resultado encontrado') : 'Digite uma música e pressione Enter ou Buscar'}</p>
        </div>
      )}

      <button className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-black disabled:opacity-50" disabled={loadingMore} hidden={!nextPageRef.current} onClick={() => buscar(activeQueryRef.current, false)}>{loadingMore ? 'Carregando…' : 'Carregar mais resultados'}</button>
    </div>
  );
}
