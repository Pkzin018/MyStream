import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import MediaCard, { SkeletonCard } from '../components/MediaCard';
import { useAccount } from '../context/AccountContext';
import { usePlayer } from '../context/PlayerContext';
import { buscarYouTube, gerarRecomendacoes } from '../lib/youtube';
import type { MediaItem } from '../types';

interface InicioPageProps {
  apiKey: string;
  onAddToPlaylist: (item: MediaItem) => void;
}

export default function InicioPage({ apiKey, onAddToPlaylist }: InicioPageProps) {
  const {user}=useAccount();
  const recommendationKey='mystream_recommendations_v3:'+user?.id;
  const { state, dispatch } = usePlayer();
  const [recomendados, setRecomendados] = useState<MediaItem[]>([]);
  const [error, setError] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);

  const carregarRecomendacoes = useCallback(async () => {
    setError('');
    setLoadingRec(true);
    try {
      const items = await gerarRecomendacoes(state.historico, apiKey);
      setRecomendados(items);
      try { localStorage.setItem(recommendationKey, JSON.stringify({at:Date.now(),items})); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao buscar sugestões.');
    } finally {
      setLoadingRec(false);
    }
  }, [state.historico.length, apiKey]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(recommendationKey) || 'null');
      if (saved && Date.now() - saved.at < 86400000) setRecomendados(saved.items);
    } catch {}
  }, []);

  const recentes = [...state.historico].reverse().slice(0, 12);
  const biblioteca = state.biblioteca.slice(0, 12);

  const handleRemoveHistorico = (item: MediaItem) => {
    const historico = state.historico.filter(h => h.url !== item.url);
    dispatch({ type: 'SET_STATE', payload: { historico } });
  };

  const handleRemoveBiblioteca = (item: MediaItem) => {
    dispatch({ type: 'REMOVE_BIBLIOTECA', payload: item.url });
  };

  return (
    <div className="fade-in">
      {/* Recentes */}
      {recentes.length > 0 && (
        <section className="mb-10">
          <motion.h2
            className="text-2xl font-black tracking-tight mb-5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Continuar Ouvindo
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5">
            {recentes.map((item, idx) => (
              <MediaCard
                key={item.url}
                item={item}
                index={idx}
                lista={recentes}
                onAddToPlaylist={onAddToPlaylist}
                onRemove={handleRemoveHistorico}
              />
            ))}
          </div>
        </section>
      )}

      {/* Biblioteca local */}
      {biblioteca.length > 0 && (
        <section className="mb-10">
          <motion.h2
            className="text-2xl font-black tracking-tight mb-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Sua Biblioteca
          </motion.h2>
          <p className="text-sm text-muted-foreground mb-5">Músicas e vídeos salvos</p>
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5">
            {biblioteca.map((item, idx) => (
              <MediaCard
                key={item.url}
                item={item}
                index={idx}
                lista={biblioteca}
                onAddToPlaylist={onAddToPlaylist}
                onRemove={handleRemoveBiblioteca}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recomendados */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-1">
          <motion.h2
            className="text-2xl font-black tracking-tight"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Feito para você ✨
          </motion.h2>
          <button
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            onClick={carregarRecomendacoes}
            disabled={loadingRec}
          >
            {loadingRec ? 'Carregando…' : 'Buscar sugestões'}
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{state.historico.length ? 'Baseado no seu histórico' : 'Busque sugestões para descobrir músicas'}</p>
        {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5">
          {loadingRec
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            : recomendados.map((item, idx) => (
                <MediaCard
                  key={item.url}
                  item={item}
                  index={idx}
                  lista={recomendados}
                  isBusca
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))
          }
        </div>
      </section>

      {recentes.length === 0 && biblioteca.length === 0 && !loadingRec && recomendados.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <div className="text-6xl">🎵</div>
          <h3 className="text-xl font-bold text-foreground">Bem-vindo ao MyStream</h3>
          <p className="text-sm text-center max-w-xs">
            Pesquise músicas, adicione áudios ou cole um link do YouTube para começar
          </p>
        </div>
      )}
    </div>
  );
}
