import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ListMusic, Play, Trash2, Edit3, Check, X } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { usePlayer } from '../context/PlayerContext';
import { useBilling } from '../context/BillingContext';
import { openPlan } from '../lib/billing';
import type { MediaItem, Playlist } from '../types';

interface PlaylistsPageProps {
  onAddToPlaylist: (item: MediaItem) => void;
}

export default function PlaylistsPage({ onAddToPlaylist }: PlaylistsPageProps) {
  const { state, dispatch, tocarItem } = usePlayer();
  const { status: plan } = useBilling();
  const limite = plan?.limits.playlists ?? null;
  const noLimite = limite !== null && state.playlists.length >= limite;
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');

  const handleCriar = () => {
    if (!novoNome.trim() || noLimite) return;
    dispatch({ type: 'CRIAR_PLAYLIST', payload: { nome: novoNome.trim() } });
    setNovoNome('');
    setCriando(false);
  };

  const handleDeletar = (id: string) => {
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
    dispatch({ type: 'DELETAR_PLAYLIST', payload: id });
  };

  const handleRenomear = (id: string) => {
    if (!editNome.trim()) return;
    dispatch({ type: 'RENOMEAR_PLAYLIST', payload: { id, nome: editNome.trim() } });
    setEditando(null);
    if (selectedPlaylist?.id === id) {
      const updated = state.playlists.find(p => p.id === id);
      if (updated) setSelectedPlaylist({ ...updated, nome: editNome.trim() });
    }
  };

  const handleTocarPlaylist = (pl: Playlist) => {
    if (!pl.musicas.length) return;
    tocarItem(pl.musicas[0], pl.musicas);
  };

  const handleRemoveMusicaPlaylist = (pl: Playlist, item: MediaItem) => {
    dispatch({ type: 'REMOVE_MUSICA_PLAYLIST', payload: { playlistId: pl.id, url: item.url } });
    if (selectedPlaylist?.id === pl.id) {
      setSelectedPlaylist({ ...pl, musicas: pl.musicas.filter(m => m.url !== item.url) });
    }
  };

  if (selectedPlaylist) {
    const pl = state.playlists.find(p => p.id === selectedPlaylist.id) || selectedPlaylist;
    return (
      <div className="fade-in">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          onClick={() => setSelectedPlaylist(null)}
        >
          ← Voltar para Playlists
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/60 to-primary/20 flex items-center justify-center flex-shrink-0">
            <ListMusic size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">{pl.nome}</h2>
            <p className="text-sm text-muted-foreground mt-1">{pl.musicas.length} músicas</p>
            {pl.musicas.length > 0 && (
              <button
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:brightness-110 transition-all"
                onClick={() => handleTocarPlaylist(pl)}
              >
                <Play size={14} fill="currentColor" /> Tocar tudo
              </button>
            )}
          </div>
        </div>

        {pl.musicas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <ListMusic size={40} />
            <p className="text-sm">Playlist vazia — adicione músicas pelos cards</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5">
            {pl.musicas.map((item, idx) => (
              <MediaCard
                key={item.url}
                item={item}
                index={idx}
                lista={pl.musicas}
                playlistId={pl.id}
                onAddToPlaylist={onAddToPlaylist}
                onRemove={(item) => handleRemoveMusicaPlaylist(pl, item)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <motion.h2
          className="text-2xl font-black tracking-tight"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Suas Playlists
        </motion.h2>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all"
          onClick={() => noLimite ? openPlan() : setCriando(true)}
        >
          <Plus size={15} /> {noLimite ? 'Limite atingido · Ver Pro' : 'Nova Playlist'}
        </button>
      </div>

      {criando && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mb-6"
        >
          <input
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            placeholder="Nome da nova playlist..."
            autoFocus
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCriar()}
          />
          <button onClick={handleCriar} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            Criar
          </button>
          <button onClick={() => setCriando(false)} className="icon-btn">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {state.playlists.length === 0 && !criando ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <ListMusic size={48} />
          <h3 className="text-lg font-bold text-foreground">Nenhuma playlist ainda</h3>
          <p className="text-sm">Crie sua primeira playlist para organizar suas músicas</p>
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:brightness-110 transition-all"
            onClick={() => noLimite ? openPlan() : setCriando(true)}
          >
            <Plus size={15} /> Criar Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
          {state.playlists.map((pl, idx) => (
            <motion.div
              key={pl.id}
              className="media-card group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedPlaylist(pl)}
            >
              <div className="card-img-wrap mb-3">
                {pl.musicas[0]?.thumb ? (
                  <img src={pl.musicas[0].thumb} alt={pl.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
                    <ListMusic size={36} className="text-primary/60" />
                  </div>
                )}
                <button
                  className="play-float"
                  onClick={e => { e.stopPropagation(); handleTocarPlaylist(pl); }}
                  title="Tocar playlist"
                >
                  <Play size={18} fill="black" />
                </button>
              </div>

              {editando === pl.id ? (
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <input
                    className="flex-1 bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-sm outline-none text-foreground"
                    value={editNome}
                    onChange={e => setEditNome(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleRenomear(pl.id)}
                  />
                  <button onClick={() => handleRenomear(pl.id)} className="icon-btn active">
                    <Check size={13} />
                  </button>
                </div>
              ) : (
                <h4 className="text-sm font-bold text-foreground truncate mb-1">{pl.nome}</h4>
              )}
              <p className="text-xs text-muted-foreground">{pl.musicas.length} músicas</p>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="overlay-icon-btn"
                  onClick={() => { setEditando(pl.id); setEditNome(pl.nome); }}
                >
                  <Edit3 size={11} />
                </button>
                <button
                  className="overlay-icon-btn danger"
                  onClick={() => handleDeletar(pl.id)}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
