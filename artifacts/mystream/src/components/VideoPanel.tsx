import { decodeMediaText } from '../lib/utils';
import {X, Headphones, Video, Play, Pause, SkipBack, SkipForward, Heart, Shuffle, Repeat, Repeat1, ListMusic} from 'lucide-react';
import {usePlayer} from '../context/PlayerContext';
import YouTubePlayer from './YouTubePlayer';

function time(s:number){const n=Number.isFinite(s)?Math.max(0,Math.floor(s)):0;return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export default function VideoPanel({isOpen,onClose,onOpenQueue}:{isOpen:boolean;onClose:()=>void;onOpenQueue:()=>void}) {
 const {itemAtual,modoAudio,toggleModoAudio,proximaMidia,anteriorMidia,setPlaying,tocando,playPause,progresso,currentTime,duracao,buscarTempo,isFavorito,toggleFav,state,toggleShuffle,toggleRepeat}=usePlayer();
 if(!itemAtual || itemAtual.tipo==='audio' || !isOpen)return null;
 const fav=isFavorito(itemAtual.url);
 const RepeatIcon=state.configuracoes.repeat==='one'?Repeat1:Repeat;
 return <section className="video-panel glass-panel rounded-xl overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
   <span className="text-sm font-semibold flex items-center gap-2"><span className={`w-2 h-2 rounded-full bg-primary ${tocando?'animate-pulse':''}`}/>{modoAudio?'Modo áudio':'Em reprodução'}</span>
   <div className="flex items-center gap-2"><button className="icon-btn" onClick={onOpenQueue} aria-label="Abrir lista de reprodução" title="Lista de reprodução"><ListMusic size={21}/></button><button className={`icon-btn ${modoAudio?'active':''}`} onClick={toggleModoAudio} aria-label={modoAudio?'Voltar ao vídeo':'Só escutar'} title={modoAudio?'Voltar ao vídeo':'Só escutar'}>{modoAudio?<Video size={21}/>:<Headphones size={21}/>}</button><button className="icon-btn" aria-label="Fechar player" onClick={onClose}><X size={21}/></button></div>
  </div>
  {/* Keep the same media element mounted when switching presentation. */}
  <div className={modoAudio?'hidden':'block'}>{itemAtual.tipo==='yt'?<YouTubePlayer/>:<video id="ms-video" className="w-full aspect-video" src={itemAtual.url} controls playsInline autoPlay onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={proximaMidia}/>}</div>
  {modoAudio&&<div className="record-stage p-6 flex flex-col items-center gap-5"><div className={`record-disc ${tocando?'record-spinning':''}`}><img src={itemAtual.thumb || '/mystream-logo.png'} alt=""/><span className="record-spindle"/></div><div className={`equalizer ${tocando?'active':''}`} aria-hidden="true"><div className="bar"/><div className="bar"/><div className="bar"/><div className="bar"/></div></div>}
  <div className="p-5"><h2 className="text-lg font-bold leading-snug">{decodeMediaText(itemAtual.nome)}</h2><p className="text-sm text-muted-foreground mt-2">{decodeMediaText(itemAtual.artista) || 'YouTube'}</p></div>
  <div className="px-5 pb-6 md:hidden">
   <input aria-label="Posição da reprodução" className="progress-slider w-full" type="range" min={0} max={100} step={.1} value={progresso} onChange={e=>buscarTempo(Number(e.target.value))} style={{'--progress':`${progresso}%`} as React.CSSProperties}/>
   <div className="flex justify-between text-xs text-muted-foreground mt-3"><span>{time(currentTime)}</span><span>{time(duracao)}</span></div>
   <div className="flex justify-between items-center mt-5"><button className={`icon-btn ${state.configuracoes.shuffle?'active':''}`} aria-label="Aleatório" aria-pressed={state.configuracoes.shuffle} onClick={toggleShuffle}><Shuffle size={20}/></button><button className="icon-btn" aria-label="Anterior" onClick={anteriorMidia}><SkipBack size={26}/></button><button className="play-btn-main !w-14 !h-14" aria-label={tocando?'Pausar':'Reproduzir'} onClick={playPause}>{tocando?<Pause size={24} fill="black"/>:<Play size={24} fill="black"/>}</button><button className="icon-btn" aria-label="Próxima" onClick={proximaMidia}><SkipForward size={26}/></button><button className={`icon-btn ${state.configuracoes.repeat!=='none'?'active':''}`} aria-label="Repetir" onClick={toggleRepeat}><RepeatIcon size={20}/></button></div>
   <div className="flex justify-center mt-4"><button className={`icon-btn ${fav?'active':''}`} aria-label="Favoritar" aria-pressed={fav} onClick={()=>toggleFav(itemAtual)}><Heart size={22} fill={fav?'currentColor':'none'}/></button></div>
  </div>
 </section>;
}
