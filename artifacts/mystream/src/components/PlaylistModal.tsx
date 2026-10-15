import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useBilling } from '../context/BillingContext';
import { openPlan } from '../lib/billing';
import type { MediaItem } from '../types';

interface PlaylistModalProps {
  isOpen: boolean;
  item: MediaItem | null;
  onClose: () => void;
}

export default function PlaylistModal({ isOpen, item, onClose }: PlaylistModalProps) {
  const { state, dispatch } = usePlayer();
  const { status: plan } = useBilling();
  const limite = plan?.limits.playlists ?? null;
  const noLimite = limite !== null && state.playlists.length >= limite;
  const [novaPlaylist, setNovaPlaylist] = useState('');
  const [criando, setCriando] = useState(false);
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set());

  const handleAddToPlaylist = (playlistId: string) => {
    if (!item) return;
    dispatch({ type: 'ADD_MUSICA_PLAYLIST', payload: { playlistId, item } });
    setAdicionados(prev => new Set([...prev, playlistId]));
  };

  const handleCriar = () => {
    if (!novaPlaylist.trim() || noLimite) return;
    dispatch({ type: 'CRIAR_PLAYLIST', payload: { nome: novaPlaylist.trim() } });
    setNovaPlaylist('');
    setCriando(false);
  };

  const handleClose = () => {
    setAdicionados(new Set());
    setCriando(false);
    setNovaPlaylist('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="auth-modal-overlay" onClick={handleClose}>
          <motion.div
            className="glass-panel rounded-2xl p-6 w-full max-w-sm mx-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-foreground">Adicionar à Playlist</h3>
              <button className="icon-btn" onClick={handleClose}><X size={16} /></button>
            </div>

            {item && (
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/5">
                <img
                  src={item.thumb || 'https://picsum.photos/seed/pl/40/40'}
                  alt={item.nome}
                  className="w-10 h-10 rounded object-cover"
                />
                <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
              </div>
            )}

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {state.playlists.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma playlist ainda</p>
              ) : (
                state.playlists.map(pl => {
                  const added = adicionados.has(pl.id);
                  return (
                    <button
                      key={pl.id}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left
                        ${added ? 'bg-primary/20 border border-primary/40' : 'bg-white/5 hover:bg-white/10'}
                      `}
                      onClick={() => handleAddToPlaylist(pl.id)}
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{pl.nome}</p>
                        <p className="text-xs text-muted-foreground">{pl.musicas.length} músicas</p>
                      </div>
                      {added && <Check size={16} className="text-primary" />}
                    </button>
                  );
                })
              )}
            </div>

            {criando ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                  placeholder="Nome da playlist..."
                  autoFocus
                  value={novaPlaylist}
                  onChange={e => setNovaPlaylist(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCriar()}
                />
                <button
                  onClick={handleCriar}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:brightness-110 transition-all"
                >
                  Criar
                </button>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-2 justify-center py-3 rounded-xl border border-dashed border-white/20 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                onClick={() => noLimite ? openPlan() : setCriando(true)}
              >
                <Plus size={16} />
                {noLimite ? `Limite de ${limite} playlists · Ver Pro` : 'Nova Playlist'}
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
