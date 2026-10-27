import { decodeMediaText } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Trash2, ListPlus, Plus, MoreHorizontal, X } from 'lucide-react';
import type { MediaItem } from '../types';
import { usePlayer } from '../context/PlayerContext';

interface MediaCardProps {
  item: MediaItem;
  index: number;
  lista: MediaItem[];
  isBusca?: boolean;
  playlistId?: string;
  onAddToPlaylist?: (item: MediaItem) => void;
  onRemove?: (item: MediaItem) => void;
}

function SkeletonCard() {
  return (
    <div className="media-card">
      <div className="skeleton w-full aspect-square mb-3 rounded-lg" />
      <div className="skeleton h-4 w-4/5 mb-2" />
      <div className="skeleton h-3 w-3/5" />
    </div>
  );
}

export { SkeletonCard };

export default function MediaCard({ item, index, lista, isBusca, playlistId, onAddToPlaylist, onRemove }: MediaCardProps) {
  const { tocarItem, itemAtual, isFavorito, toggleFav, adicionarAFila, dispatch } = usePlayer();
  const isPlaying = itemAtual?.url === item.url;
  const fav = isFavorito(item.url);
  const [menuOpen,setMenuOpen]=useState(false);
  const menuTrigger=useRef<HTMLButtonElement>(null);
  const menuClose=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(menuOpen)menuClose.current?.focus();},[menuOpen]);
  const closeMenu=()=>{setMenuOpen(false);menuTrigger.current?.focus();};
  const [imgError, setImgError] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    tocarItem(item, lista);
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFav(item);
  };

  const handleAddQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    adicionarAFila(item);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'ADD_BIBLIOTECA', payload: item });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(item);
  };

  const thumb = (!imgError && item.thumb) ? item.thumb : `https://picsum.photos/seed/${encodeURIComponent(decodeMediaText(item.nome))}/200/200`;

  return (
    <>
    <motion.div
      className={`media-card group ${isPlaying ? 'is-playing' : ''}`}
      onClick={() => tocarItem(item, lista)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
    >
      <div className="card-img-wrap">
        <img
          src={thumb}
          alt={decodeMediaText(item.nome)}
          className="card-img-wrap-img w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cubic-bezier(0.3,0,0,1)' }}
        />

        {item.duracao !== undefined && item.duracao > 0 && (
          <div className="absolute bottom-2 left-2 z-10 flex gap-1 pointer-events-none">
            <span className="rounded-md bg-black/85 px-2 py-1 text-[10px] font-bold text-white">{item.duracao >= 3600 ? `${Math.floor(item.duracao / 3600)}:` : ''}{item.duracao >= 3600 ? String(Math.floor(item.duracao % 3600 / 60)).padStart(2, '0') : Math.floor(item.duracao / 60)}:{String(Math.floor(item.duracao % 60)).padStart(2, '0')}</span>
          </div>
        )}

        {/* Overlay buttons top-right */}
        <div className="card-overlay-btns">
          {isBusca ? (
            <>
              <button className="overlay-icon-btn" title="Adicionar à fila" onClick={handleAddQueue}>
                <ListPlus size={12} />
              </button>
              <button className="overlay-icon-btn" title="Salvar na biblioteca" onClick={handleSave}>
                <Plus size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                className="overlay-icon-btn"
                title={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                onClick={handleFav}
                style={{ color: fav ? 'hsl(141,71%,43%)' : 'white' }}
              >
                <Heart size={12} fill={fav ? 'currentColor' : 'none'} />
              </button>
              {onRemove && (
                <button className="overlay-icon-btn danger" title="Remover" onClick={handleRemove}>
                  <Trash2 size={12} />
                </button>
              )}
            </>
          )}
        </div>

        {/* More button top-left */}
        {onAddToPlaylist && (
          <button
            className="overlay-icon-btn absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Adicionar a playlist"
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(item); }}
          >
            <MoreHorizontal size={12} />
          </button>
        )}

        {/* Equalizer overlay when playing */}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
            <div className="equalizer active">
              <div className="bar" /><div className="bar" /><div className="bar" /><div className="bar" />
            </div>
          </div>
        )}

        {/* Float play button */}
        <button className="play-float" onClick={handlePlay} title="Tocar">
          <Play size={18} fill="black" />
        </button>
      </div>

      <div className="card-caption flex gap-1 items-start"><h4 className="card-title min-w-0 flex-1 text-sm font-bold text-foreground truncate mb-1">{decodeMediaText(item.nome)}</h4><button ref={menuTrigger} className="mobile-card-menu md:hidden shrink-0" aria-label={"Opções de " + decodeMediaText(item.nome)} onClick={e=>{e.stopPropagation();setMenuOpen(true);}}><MoreHorizontal size={20}/></button></div>
      <p className="text-xs text-muted-foreground truncate">
        {decodeMediaText(item.artista) || (item.tipo === 'yt' ? 'YouTube' : 'Mídia Local')}
      </p>
    </motion.div>
    {menuOpen && <div className="fixed inset-0 z-[300] bg-black/70 flex items-end md:hidden" onClick={closeMenu}>
      <section role="dialog" aria-modal="true" aria-label="Opções da mídia" className="mobile-actions bg-background text-foreground w-full rounded-t-3xl p-5 border-t border-border" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')closeMenu();if(e.key==='Tab'){const buttons=Array.from(e.currentTarget.querySelectorAll('button'));const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
       <div className="flex items-start gap-3 mb-4"><h3 className="font-semibold flex-1">{decodeMediaText(item.nome)}</h3><button ref={menuClose} className="icon-btn" aria-label="Fechar opções" onClick={closeMenu}><X size={20}/></button></div>
       <button onClick={e=>{handleFav(e);closeMenu();}}><Heart size={20}/>{fav?'Remover dos favoritos':'Favoritar'}</button>
       <button onClick={e=>{handleAddQueue(e);closeMenu();}}><ListPlus size={20}/>Adicionar à fila</button>
       {isBusca&&<button onClick={e=>{handleSave(e);closeMenu();}}><Plus size={20}/>Salvar na biblioteca</button>}
       {onAddToPlaylist&&<button onClick={()=>{closeMenu();onAddToPlaylist(item);}}><ListPlus size={20}/>Adicionar à playlist</button>}
       {onRemove&&<button onClick={e=>{handleRemove(e);closeMenu();}}><Trash2 size={20}/>Remover</button>}
      </section>
    </div>}
    </>
  );
}
