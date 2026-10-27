import { decodeMediaText } from '../lib/utils';
import {useState} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, ListMusic, Headphones, Maximize2, ChevronUp, X,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface PlayerBarProps {
  onOpenQueue: () => void;
  onFocusMode: () => void;
  isMobile?: boolean;
}

function formatTime(s: number): string {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function PlayerBar({ onOpenQueue, onFocusMode, isMobile }: PlayerBarProps) {
  const {
    itemAtual, tocando, progresso, duracao, currentTime,
    state, playPause, buscarTempo, ajustarVolume, toggleMute,
    muted, toggleShuffle, toggleRepeat, isFavorito, toggleFav,
    modoAudio, toggleModoAudio, proximaMidia, anteriorMidia,
  } = usePlayer();

  const [expanded,setExpanded]=useState(false);
  const { configuracoes } = state;
  const fav = itemAtual ? isFavorito(itemAtual.url) : false;
  const volPct = muted ? 0 : (configuracoes.volume * 100);

  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    buscarTempo(Number(e.target.value));
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    ajustarVolume(Number(e.target.value) / 100);
  };

  const VolumeIcon = muted || configuracoes.volume === 0 ? VolumeX
    : configuracoes.volume < 0.5 ? Volume1
    : Volume2;

  const RepeatIcon = configuracoes.repeat === 'one' ? Repeat1 : Repeat;

  return (
    <>
    <motion.footer
      className="player-bar glass-panel fixed left-0 right-0 z-50 mobile-player-pos"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Top progress bar */}
      <input
        type="range"
        aria-label="Posição da reprodução"
        className="progress-slider w-full block"
        value={progresso}
        min={0} max={100} step={0.1}
        onChange={handleProgress}
        style={{ '--progress': `${progresso}%` } as React.CSSProperties}
      />

      {/* Compact mobile player; detailed controls live in its expanded view. */}
      <div className="mobile-mini-player flex md:hidden items-center gap-2 px-3 py-2">
        <button className="flex items-center gap-3 min-w-0 flex-1 text-left" aria-label="Abrir controles da reprodução" onClick={()=>{if(itemAtual?.tipo!=='audio')onFocusMode();else setExpanded(true);}}>
          <img src={itemAtual?.thumb || '/mystream-logo.png'} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0"/>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{decodeMediaText(itemAtual?.nome) || 'Nada tocando'}</span><span className="block text-xs text-muted-foreground truncate">{decodeMediaText(itemAtual?.artista) || 'MyStream'}</span></span>
        </button>
        <button className="icon-btn shrink-0" onClick={onOpenQueue} aria-label="Abrir lista de reprodução"><ListMusic size={20}/></button>
        <button className="play-btn-main shrink-0" onClick={playPause} aria-label={tocando?'Pausar':'Reproduzir'}>{tocando?<Pause size={20} fill="black"/>:<Play size={20} fill="black"/>}</button>
        <button className="icon-btn shrink-0" onClick={proximaMidia} aria-label="Próxima"><SkipForward size={22}/></button>
      </div>

      {/* === DESKTOP LAYOUT === */}
      <div className="hidden md:flex items-center justify-between px-4 py-3 gap-4">
        {/* Now Playing */}
        <div className="flex items-center gap-3 w-[280px] min-w-0">
          <AnimatePresence mode="wait">
            {itemAtual && (
              <motion.div
                key={itemAtual.url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
                onClick={onFocusMode}
              >
                <img
                  src={itemAtual.thumb || 'https://picsum.photos/seed/nowplay/56/56'}
                  alt={decodeMediaText(itemAtual.nome)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={14} className="text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!itemAtual && (
            <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0" />
          )}

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={itemAtual?.url || 'none'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-semibold truncate text-foreground"
              >
                {decodeMediaText(itemAtual?.nome) || 'Nada tocando'}
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground truncate">
              {decodeMediaText(itemAtual?.artista) || 'MyStream Premium'}
            </p>
          </div>

          <button
            className={`icon-btn ml-1 flex-shrink-0 ${fav ? 'active' : ''}`}
            onClick={() => itemAtual && toggleFav(itemAtual)}
            title="Favoritar"
          >
            <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Center controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[480px]">
          <div className="flex items-center gap-4">
            <button
              className={`icon-btn ${configuracoes.shuffle ? 'active' : ''}`}
              onClick={toggleShuffle}
              title="Aleatório (S)"
            >
              <Shuffle size={16} />
            </button>

            <button className="icon-btn" onClick={anteriorMidia} title="Anterior">
              <SkipBack size={18} />
            </button>

            <button
              className="play-btn-main"
              onClick={playPause}
          aria-label="Reproduzir ou pausar"
              title="Play/Pause (Espaço)"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={tocando ? 'pause' : 'play'}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center justify-center"
                >
                  {tocando
                    ? <Pause size={18} fill="black" />
                    : <Play size={18} fill="black" />
                  }
                </motion.span>
              </AnimatePresence>
            </button>

            <button className="icon-btn" onClick={proximaMidia} title="Próxima">
              <SkipForward size={18} />
            </button>

            <button
              className={`icon-btn ${configuracoes.repeat !== 'none' ? 'active' : ''}`}
              onClick={toggleRepeat}
              title="Repetir (R)"
            >
              <RepeatIcon size={16} />
            </button>
          </div>

          {/* Progress & Time */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="flex items-center justify-center gap-1 flex-1">
              <div className={`equalizer ${tocando ? 'active' : ''}`}>
                <div className="bar"/><div className="bar"/><div className="bar"/><div className="bar"/>
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-10 flex-shrink-0">
              {formatTime(duracao)}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 w-[280px] justify-end">
          <button
            className={`icon-btn ${modoAudio ? 'active' : ''}`}
            onClick={toggleModoAudio}
            title="Modo Áudio"
          >
            <Headphones size={16} />
          </button>

          <button className="icon-btn" onClick={toggleMute} title="Mute (M)">
            <VolumeIcon size={16} />
          </button>

          <input
            type="range"
            className="volume-slider"
            min={0} max={100} step={1}
            value={volPct}
            onChange={handleVolume}
            style={{ '--vol-progress': `${volPct}%` } as React.CSSProperties}
          />

          <button className="icon-btn" onClick={onOpenQueue} title="Fila">
            <ListMusic size={16} />
          </button>
        </div>
      </div>
    </motion.footer>
    {expanded&&itemAtual&&<div className="mobile-full-player fixed inset-0 z-[220] bg-background text-foreground p-6 flex flex-col overflow-y-auto md:hidden" role="dialog" aria-modal="true" aria-label="Reprodução" onKeyDown={e=>{if(e.key==='Escape')setExpanded(false);}}>
      <div className="flex items-center justify-between mb-6"><p className="text-xs font-semibold tracking-widest text-muted-foreground">TOCANDO AGORA</p><button autoFocus className="icon-btn" aria-label="Fechar controles" onClick={()=>setExpanded(false)}><X size={22}/></button></div>
      <img src={itemAtual.thumb || '/mystream-logo.png'} alt="" className="w-full aspect-square max-w-80 self-center rounded-2xl object-cover shadow-xl"/>
      <h2 className="text-xl font-bold mt-6">{decodeMediaText(itemAtual.nome)}</h2><p className="text-muted-foreground mt-1">{decodeMediaText(itemAtual.artista)}</p>
      <input aria-label="Posição da reprodução" type="range" min={0} max={100} step={.1} value={progresso} onChange={handleProgress} className="progress-slider w-full mt-7" style={{'--progress':`${progresso}%`} as React.CSSProperties}/>
      <div className="flex justify-between text-xs text-muted-foreground mt-3"><span>{formatTime(currentTime)}</span><span>{formatTime(duracao)}</span></div>
      <div className="flex items-center justify-between mt-5"><button className={`icon-btn ${configuracoes.shuffle?'active':''}`} onClick={toggleShuffle} aria-label="Aleatório" aria-pressed={configuracoes.shuffle}><Shuffle size={22}/></button><button className="icon-btn" onClick={anteriorMidia} aria-label="Anterior"><SkipBack size={28}/></button><button className="play-btn-main !w-16 !h-16" onClick={playPause} aria-label={tocando?'Pausar':'Reproduzir'}>{tocando?<Pause size={28} fill="black"/>:<Play size={28} fill="black"/>}</button><button className="icon-btn" onClick={proximaMidia} aria-label="Próxima"><SkipForward size={28}/></button><button className={`icon-btn ${configuracoes.repeat!=='none'?'active':''}`} onClick={toggleRepeat} aria-label="Repetir" aria-pressed={configuracoes.repeat!=='none'}><RepeatIcon size={22}/></button></div>
      <div className="flex justify-between items-center mt-7"><button className={`icon-btn ${fav?'active':''}`} onClick={()=>toggleFav(itemAtual)} aria-label="Favoritar"><Heart size={22} fill={fav?'currentColor':'none'}/></button><button className="icon-btn" onClick={()=>{setExpanded(false);onOpenQueue();}} aria-label="Abrir fila"><ListMusic size={22}/></button></div>
    </div>}
    </>
  );
}
