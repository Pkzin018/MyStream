import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useState } from 'react';
import type { MediaItem, AppState } from '../types';
import { adicionarAoHistorico, toggleFavorito } from '../lib/storage';

import { useAccount } from './AccountContext';
import { emptyState, loadAccountState, saveAccountState } from '../lib/account-storage';

interface PlayerContextType {
  flushAccount: () => Promise<void>;
  state: AppState;
  dispatch: React.Dispatch<Action>;
  itemAtual: MediaItem | null;
  setPlaying: (playing:boolean)=>void;
  tocando: boolean;
  ytPlayer: any;
  setYtPlayer: (p: any) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  progresso: number;
  duracao: number;
  currentTime: number;
  tocarItem: (item: MediaItem, lista?: MediaItem[]) => void;
  proximaMidia: () => void;
  anteriorMidia: () => void;
  playPause: () => void;
  buscarTempo: (pct: number) => void;
  ajustarVolume: (v: number) => void;
  toggleMute: () => void;
  muted: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFav: (item: MediaItem) => void;
  isFavorito: (url: string) => boolean;
  adicionarAFila: (item: MediaItem) => void;
  removerDaFila: (index: number) => void;
  reordenarFila: (from: number, to: number) => void;
  mudarCorDinamica: (cor: string) => void;
  corDinamica: string;
  modoAudio: boolean;
  toggleModoAudio: () => void;
}

type Action =
  | { type: 'CARREGAR'; payload: AppState }
  | { type: 'SET_STATE'; payload: Partial<AppState> }
  | { type: 'ADD_BIBLIOTECA'; payload: MediaItem }
  | { type: 'REMOVE_BIBLIOTECA'; payload: string }
  | { type: 'TOGGLE_FAV'; payload: MediaItem }
  | { type: 'ADD_HISTORICO'; payload: MediaItem }
  | { type: 'ADD_FILA'; payload: MediaItem }
  | { type: 'REMOVE_FILA'; payload: number }
  | { type: 'SET_FILA'; payload: MediaItem[] }
  | { type: 'CRIAR_PLAYLIST'; payload: { nome: string } }
  | { type: 'ADD_MUSICA_PLAYLIST'; payload: { playlistId: string; item: MediaItem } }
  | { type: 'REMOVE_MUSICA_PLAYLIST'; payload: { playlistId: string; url: string } }
  | { type: 'DELETAR_PLAYLIST'; payload: string }
  | { type: 'RENOMEAR_PLAYLIST'; payload: { id: string; nome: string } }
  | { type: 'SET_CONFIGURACAO'; payload: Partial<AppState['configuracoes']> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CARREGAR': return action.payload;
    case 'SET_STATE': return { ...state, ...action.payload };
    case 'ADD_BIBLIOTECA': {
      if (state.biblioteca.find(b => b.url === action.payload.url)) return state;
      return { ...state, biblioteca: [action.payload, ...state.biblioteca] };
    }
    case 'REMOVE_BIBLIOTECA':
      return { ...state, biblioteca: state.biblioteca.filter(b => b.url !== action.payload) };
    case 'TOGGLE_FAV':
      return toggleFavorito(state, action.payload);
    case 'ADD_HISTORICO':
      return adicionarAoHistorico(state, action.payload);
    case 'ADD_FILA':
      return { ...state, fila: [...state.fila, action.payload] };
    case 'REMOVE_FILA': {
      const f = [...state.fila];
      f.splice(action.payload, 1);
      return { ...state, fila: f };
    }
    case 'SET_FILA':
      return { ...state, fila: action.payload };
    case 'CRIAR_PLAYLIST': {
      const nova = { id: crypto.randomUUID(), nome: action.payload.nome, musicas: [], criadaEm: Date.now() };
      return { ...state, playlists: [...state.playlists, nova] };
    }
    case 'ADD_MUSICA_PLAYLIST': {
      const playlists = state.playlists.map(pl => {
        if (pl.id !== action.payload.playlistId) return pl;
        if (pl.musicas.find(m => m.url === action.payload.item.url)) return pl;
        return { ...pl, musicas: [...pl.musicas, action.payload.item] };
      });
      return { ...state, playlists };
    }
    case 'REMOVE_MUSICA_PLAYLIST': {
      const playlists = state.playlists.map(pl => {
        if (pl.id !== action.payload.playlistId) return pl;
        return { ...pl, musicas: pl.musicas.filter(m => m.url !== action.payload.url) };
      });
      return { ...state, playlists };
    }
    case 'DELETAR_PLAYLIST':
      return { ...state, playlists: state.playlists.filter(p => p.id !== action.payload) };
    case 'RENOMEAR_PLAYLIST': {
      const playlists = state.playlists.map(pl =>
        pl.id === action.payload.id ? { ...pl, nome: action.payload.nome } : pl
      );
      return { ...state, playlists };
    }
    case 'SET_CONFIGURACAO':
      return { ...state, configuracoes: { ...state.configuracoes, ...action.payload } };
    default:
      return state;
  }
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const {user} = useAccount();
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [accountReady,setAccountReady] = useState(false);
  const [loadError,setLoadError] = useState('');
  const [syncStatus,setSyncStatus] = useState('Carregando seu universo…');
  const savedJsonRef = useRef('');
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [itemAtual, setItemAtual] = useState<MediaItem | null>(null);
  const [tocando, setTocando] = useState(false);
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const [progresso, setProgresso] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [corDinamica, setCorDinamica] = useState('rgba(29,185,84,0.3)');
  const [modoAudio, setModoAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackRef = useRef({ item: itemAtual, next: () => {}, previous: () => {} });
  const playbackGeneration = useRef(0);
  const recoveryAttempted = useRef(false);
  const desiredPlayback = useRef(false);
  const lastAudioTime = useRef(0);
  const resumePosition = useRef<number | null>(null);
  const debug = useCallback((event: string, code?: number) => {
    if (new URLSearchParams(window.location.search).get('debugAudio') !== '1') return;
    // No names, URLs, signed tokens or account data in diagnostics.
    console.info('[MyStream playback]', {at: new Date().toISOString(), event, visibility: document.visibilityState, code});
  }, []);
  const playAudio = useCallback((audio: HTMLAudioElement) => {
    const generation = playbackGeneration.current;
    void audio.play().catch((error: DOMException) => {
      if (generation !== playbackGeneration.current || error.name === 'AbortError') return;
      setTocando(false);
      debug('play-rejected');
      toast.error('Não foi possível iniciar o áudio. Toque em reproduzir para tentar novamente.');
    });
  }, [debug]);
  const progressoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const listaAtualRef = useRef<MediaItem[]>([]);
  const playItemRef = useRef<(item: MediaItem) => void>(() => {});
  const sameTrack = (a: MediaItem, b: MediaItem) => a.storagePath && b.storagePath ? a.storagePath === b.storagePath : a.url === b.url;
  const replaceQueue = useCallback((fila: MediaItem[]) => {
    stateRef.current = {...stateRef.current, fila};
    dispatch({type: 'SET_FILA', payload: fila});
  }, []);
  const ytPlayerRef = useRef<any>(null);

  useEffect(() => {
    const audio = document.getElementById('ms-audio') as HTMLAudioElement;
    (audioRef as any).current = audio;
    if(!audio)return;
    const onPlay=()=>setTocando(true),onPause=()=>setTocando(false);
    audio.addEventListener('play',onPlay);audio.addEventListener('pause',onPause);
    return()=>{audio.removeEventListener('play',onPlay);audio.removeEventListener('pause',onPause);};
  }, [accountReady]);

  useEffect(() => {
    ytPlayerRef.current = ytPlayer;
  }, [ytPlayer]);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;
    if (!user) return;
    loadAccountState(user.id).then(loaded => {
      if(cancelled) return;
      savedJsonRef.current=JSON.stringify(loaded);
      dispatch({type:'CARREGAR',payload:loaded});
      setAccountReady(true); setSyncStatus('Sincronizado');
    }).catch(() => {if(!cancelled) setLoadError('Não foi possível carregar sua biblioteca. Seus dados continuam protegidos.');});
    return () => {cancelled=true;mountedRef.current=false;};
  }, [user?.id]);

  const persist = useCallback(async () => {
    if(!user || !accountReady) return;
    const snapshot=stateRef.current;
    const json=JSON.stringify(snapshot);
    if(json===savedJsonRef.current) return;
    if(mountedRef.current) setSyncStatus('Salvando…');
    const save = saveChainRef.current.catch(()=>{}).then(async()=> {
      await saveAccountState(user.id,snapshot); savedJsonRef.current=json;
    });
    saveChainRef.current=save;
    try {await save;if(mountedRef.current) setSyncStatus('Sincronizado');}
    catch {if(mountedRef.current) setSyncStatus('Não foi possível salvar. Tente novamente.');throw new Error('Falha ao salvar sua biblioteca.');}
  }, [user?.id,accountReady]);

  useEffect(() => {
    if(!accountReady) return;
    const timer=setTimeout(()=>{void persist().catch(()=>{});},600);
    return ()=>clearTimeout(timer);
  },[state,accountReady,persist]);

  useEffect(() => {
    const flush=()=>{void persist().catch(()=>{});};
    window.addEventListener('mystream-save-before-signout',flush);
    return ()=>window.removeEventListener('mystream-save-before-signout',flush);
  },[persist]);

  useEffect(() => () => {
    audioRef.current?.pause();
    ytPlayerRef.current?.pauseVideo?.();
    if(progressoInterval.current) clearInterval(progressoInterval.current);
  }, []);


  const iniciarProgresso = useCallback((isYT: boolean, mediaEl?: HTMLMediaElement | null) => {
    if (progressoInterval.current) clearInterval(progressoInterval.current);
    progressoInterval.current = setInterval(() => {
      let atual = 0, total = 0;
      if (isYT && ytPlayerRef.current?.getCurrentTime) {
        atual = ytPlayerRef.current.getCurrentTime() || 0;
        total = ytPlayerRef.current.getDuration() || 0;
      } else {
        const el = mediaEl || audioRef.current;
        if (el) { atual = el.currentTime || 0; total = el.duration || 0; }
      }
      if (total > 0) {
        setProgresso((atual / total) * 100);
        setCurrentTime(atual);
        setDuracao(total);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if(ytPlayer && itemAtual?.tipo === 'yt') iniciarProgresso(true);
    if(itemAtual?.tipo==='video') iniciarProgresso(false,document.getElementById('ms-video') as HTMLVideoElement);
  },[ytPlayer,itemAtual?.url,iniciarProgresso]);

  const CORES_DINAMICAS = [
    'rgba(29,185,84,0.35)', 'rgba(226,33,52,0.35)', 'rgba(59,130,246,0.35)',
    'rgba(139,92,246,0.35)', 'rgba(245,158,11,0.35)', 'rgba(236,72,153,0.35)',
    'rgba(20,184,166,0.35)', 'rgba(249,115,22,0.35)',
  ];

  const mudarCorDinamica = useCallback((imagemOuTexto: string) => {
    const idx = (imagemOuTexto.length + imagemOuTexto.charCodeAt(0)) % CORES_DINAMICAS.length;
    setCorDinamica(CORES_DINAMICAS[idx]);
  }, []);

  const proximaMidia = useCallback(() => {
    const {fila, configuracoes: cfg} = stateRef.current;
    const current = playbackRef.current.item;
    if (fila.length) {
      replaceQueue(fila.slice(1));
      playItemRef.current(fila[0]);
      return;
    }
    const list = listaAtualRef.current;
    if (!current || !list.length) return;
    const index = list.findIndex(item => sameTrack(item, current));
    let next: MediaItem | undefined;
    if (cfg.repeat === 'one') next = current;
    else if (cfg.shuffle) next = list[Math.floor(Math.random() * list.length)];
    else if (index >= 0 && index + 1 < list.length) next = list[index + 1];
    else if (cfg.repeat === 'all') next = list[0];
    if (next) playItemRef.current(next);
  }, [replaceQueue]);

  const anteriorMidia = useCallback(() => {
    const current = playbackRef.current.item;
    if (!current) return;
    const list = listaAtualRef.current;
    const index = list.findIndex(item => sameTrack(item, current));
    if (index > 0) {
      replaceQueue(list.slice(index));
      playItemRef.current(list[index - 1]);
      return;
    }
    const hist = stateRef.current.historico;
    const historyIndex = hist.findIndex(item => sameTrack(item, current));
    if (index < 0 && historyIndex > 0) {
      replaceQueue([current, ...stateRef.current.fila]);
      playItemRef.current(hist[historyIndex - 1]);
    } else {
      const audio = audioRef.current;
      if (current.tipo === 'audio' && audio) {audio.currentTime = 0; desiredPlayback.current = true; playAudio(audio);}
    }
  }, [replaceQueue, playAudio]);

  const tocarItemInterno = useCallback((item: MediaItem) => {
    window.dispatchEvent(new CustomEvent('mystream-media-selected', { detail: { tipo: item.tipo } }));
    setItemAtual(item);
    setModoAudio(false);
    setTocando(true);
    setProgresso(0); setCurrentTime(0); setDuracao(0);
    dispatch({ type: 'ADD_HISTORICO', payload: item });
    mudarCorDinamica(item.thumb || item.nome);

    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.nome,
        artist: item.artista || 'MyStream',
        artwork: item.thumb ? [{ src: item.thumb }] : [],
      });
    }

    const audio = audioRef.current;
    playbackGeneration.current++;
    recoveryAttempted.current = false;
    resumePosition.current = null;
    lastAudioTime.current = 0;
    desiredPlayback.current = item.tipo === 'audio';
    playbackRef.current.item = item;
    if (audio && item.tipo !== 'audio') audio.pause();
    if (ytPlayerRef.current?.pauseVideo) { ytPlayerRef.current.pauseVideo(); }

    if (item.tipo === 'yt') {
      if (ytPlayerRef.current?.loadVideoById) {
        ytPlayerRef.current.loadVideoById(item.url);
        iniciarProgresso(true);
      }
    } else if (item.tipo === 'audio' && audio) {
      audio.src = item.url;
      audio.volume = stateRef.current.configuracoes.volume;
      audio.load();
      playAudio(audio);
      iniciarProgresso(false, audio);
    } else if (item.tipo === 'video') {
      iniciarProgresso(false, document.getElementById('ms-video') as HTMLVideoElement);
    }
  }, [mudarCorDinamica, iniciarProgresso, playAudio]);
  playItemRef.current = tocarItemInterno;

  const tocarItem = useCallback((item: MediaItem, lista?: MediaItem[]) => {
    if (lista) {
      listaAtualRef.current = lista;
      const idx = lista.findIndex(i => sameTrack(i, item));
      replaceQueue(lista.slice(idx + 1));
    }
    tocarItemInterno(item);
  }, [tocarItemInterno, replaceQueue]);

  const playPause = useCallback(() => {
    if (!itemAtual) return;
    const audio = audioRef.current;
    if (itemAtual.tipo === 'yt' && ytPlayerRef.current) {
      const s = ytPlayerRef.current.getPlayerState?.();
      if (s === 1) { ytPlayerRef.current.pauseVideo(); setTocando(false); }
      else { ytPlayerRef.current.playVideo(); setTocando(true); }
    } else {
      const el=itemAtual.tipo==='video'?document.getElementById('ms-video') as HTMLVideoElement:audio;
      if(!el) return;
      if (el.paused) {
        desiredPlayback.current = true;
        if (itemAtual.tipo === 'audio') playAudio(el as HTMLAudioElement);
        else void el.play().catch(()=>setTocando(false));
        setTocando(true);
      } else { desiredPlayback.current = false; el.pause(); setTocando(false); }
    }
  }, [itemAtual, playAudio]);

  const buscarTempo = useCallback((pct: number) => {
    if (!itemAtual) return;
    if (itemAtual.tipo === 'yt' && ytPlayerRef.current?.seekTo) {
      const d = ytPlayerRef.current.getDuration();
      ytPlayerRef.current.seekTo((pct / 100) * d, true);
    } else {
      const audio = itemAtual.tipo==='video'?document.getElementById('ms-video') as HTMLVideoElement:audioRef.current;
      if (audio?.duration) audio.currentTime = (pct / 100) * audio.duration;
    }
  }, [itemAtual]);

  const ajustarVolume = useCallback((v: number) => {
    dispatch({ type: 'SET_CONFIGURACAO', payload: { volume: v } });
    if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(v * 100);
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    const video=document.getElementById('ms-video') as HTMLVideoElement;
    if(video) video.volume=v;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    const newMuted = !muted;
    setMuted(newMuted);
    if (ytPlayerRef.current) {
      newMuted ? ytPlayerRef.current.mute() : ytPlayerRef.current.unMute();
    }
    if (audio) audio.muted = newMuted;
    const video=document.getElementById('ms-video') as HTMLVideoElement;
    if(video) video.muted=newMuted;
  }, [muted]);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'SET_CONFIGURACAO', payload: { shuffle: !state.configuracoes.shuffle } });
  }, [state.configuracoes.shuffle]);

  const toggleRepeat = useCallback(() => {
    const order: AppState['configuracoes']['repeat'][] = ['none', 'all', 'one'];
    const curr = state.configuracoes.repeat;
    const next = order[(order.indexOf(curr) + 1) % order.length];
    dispatch({ type: 'SET_CONFIGURACAO', payload: { repeat: next } });
  }, [state.configuracoes.repeat]);

  const toggleFav = useCallback((item: MediaItem) => {
    dispatch({ type: 'TOGGLE_FAV', payload: item });
  }, []);

  const isFavorito = useCallback((url: string) => {
    return !!state.favoritos.find(f => f.url === url);
  }, [state.favoritos]);

  const adicionarAFila = useCallback((item: MediaItem) => {
    dispatch({ type: 'ADD_FILA', payload: item });
    if (!itemAtual) tocarItemInterno(item);
  }, [itemAtual, tocarItemInterno]);

  const removerDaFila = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FILA', payload: index });
  }, []);

  const reordenarFila = useCallback((from: number, to: number) => {
    const f = [...state.fila];
    const [moved] = f.splice(from, 1);
    f.splice(to, 0, moved);
    dispatch({ type: 'SET_FILA', payload: f });
  }, [state.fila]);

  const toggleModoAudio = useCallback(() => {
    setModoAudio(p => !p);
  }, []);

  playbackRef.current = {item: itemAtual, next: proximaMidia, previous: anteriorMidia};

  // Persistent native handlers use refs so track changes do not clear the session.
  useEffect(() => {
    if (!accountReady) return;
    const audio = audioRef.current;
    if (!audio) return;
    const ended = () => playbackRef.current.next();
    const progress = () => { if (!audio.error) lastAudioTime.current = audio.currentTime; };
    const loaded = () => {
      if (resumePosition.current === null) return;
      const position = resumePosition.current;
      resumePosition.current = null;
      if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(position, Math.max(0, audio.duration - 0.1));
      if (desiredPlayback.current) playAudio(audio);
    };
    const recover = async () => {
      debug('audio-error', audio.error?.code);
      const item = playbackRef.current.item;
      if (!item || item.tipo !== 'audio') return;
      if (!item.storagePath || recoveryAttempted.current || audio.error?.code === 3) {
        setTocando(false);
        toast.error('Falha ao carregar o áudio. Verifique sua conexão e tente novamente.');
        return;
      }
      recoveryAttempted.current = true;
      const generation = playbackGeneration.current;
      const position = lastAudioTime.current;
      try {
        const {data, error} = await supabase.storage.from('mystream-media').createSignedUrl(item.storagePath, 86400);
        if (generation !== playbackGeneration.current || !mountedRef.current) return;
        if (error || !data?.signedUrl) throw new Error('renewal');
        resumePosition.current = position;
        audio.src = data.signedUrl;
        audio.load();
        debug('url-renewed');
      } catch {
        if (generation !== playbackGeneration.current || !mountedRef.current) return;
        setTocando(false);
        toast.error('Não foi possível renovar o acesso ao áudio. Tente reproduzir novamente.');
      }
    };
    const visibility = () => debug('visibilitychange');
    const events = ['play','pause','ended','stalled','waiting','loadedmetadata'] as const;
    const log = (event: Event) => debug(event.type);
    audio.addEventListener('ended', ended);
    audio.addEventListener('timeupdate', progress);
    audio.addEventListener('loadedmetadata', loaded);
    audio.addEventListener('error', recover);
    events.forEach(event => audio.addEventListener(event, log));
    document.addEventListener('visibilitychange', visibility);
    const session = 'mediaSession' in navigator ? navigator.mediaSession : null;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => {if(playbackRef.current.item?.tipo === 'audio'){desiredPlayback.current=true;playAudio(audio);}},
      pause: () => {if(playbackRef.current.item?.tipo === 'audio'){desiredPlayback.current=false;audio.pause();}},
      nexttrack: () => {if(playbackRef.current.item?.tipo === 'audio') playbackRef.current.next();},
      previoustrack: () => {if(playbackRef.current.item?.tipo === 'audio') playbackRef.current.previous();},
      seekto: d => {if(playbackRef.current.item?.tipo === 'audio' && d.seekTime !== undefined)audio.currentTime=d.seekTime;},
      seekbackward: d => {if(playbackRef.current.item?.tipo === 'audio')audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10));},
      seekforward: d => {if(playbackRef.current.item?.tipo === 'audio' && Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+(d.seekOffset||10));},
    };
    for (const [action, handler] of Object.entries(handlers)) try {session?.setActionHandler(action as MediaSessionAction, handler!);} catch {}
    return () => {
      playbackGeneration.current++;
      audio.removeEventListener('ended', ended);
      audio.removeEventListener('timeupdate', progress);
      audio.removeEventListener('loadedmetadata', loaded);
      audio.removeEventListener('error', recover);
      events.forEach(event => audio.removeEventListener(event, log));
      document.removeEventListener('visibilitychange', visibility);
      for (const action of Object.keys(handlers)) try {session?.setActionHandler(action as MediaSessionAction, null);} catch {}
      if (session) {session.metadata=null;session.playbackState='none';}
    };
  }, [accountReady, debug, playAudio]);
  useEffect(()=>{
    if(!('mediaSession' in navigator)||itemAtual?.tipo!=='audio')return;
    navigator.mediaSession.playbackState=tocando?'playing':'paused';
    if(duracao>0 && Number.isFinite(duracao))try{navigator.mediaSession.setPositionState({duration:duracao,playbackRate:1,position:Math.min(duracao,Math.max(0,currentTime))});}catch{}
  },[itemAtual?.tipo,tocando,duracao,currentTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); playPause(); break;
        case 'ArrowRight': proximaMidia(); break;
        case 'ArrowLeft': anteriorMidia(); break;
        case 'KeyS': toggleShuffle(); break;
        case 'KeyR': toggleRepeat(); break;
        case 'KeyM': toggleMute(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playPause, proximaMidia, anteriorMidia, toggleShuffle, toggleRepeat, toggleMute]);

  if(!accountReady) return <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"><div className="glass-panel rounded-2xl p-8 text-center"><img src="/mystream-logo.png" alt="MyStream" className="w-16 h-16 mx-auto mb-4"/><p>{loadError || 'Carregando seu universo…'}</p>{loadError && <button className="mt-4 text-primary" onClick={()=>window.location.reload()}>Tentar novamente</button>}</div></main>;
  return (
    <PlayerContext.Provider value={{
      flushAccount: persist, setPlaying: setTocando, state, dispatch, itemAtual, tocando, ytPlayer, setYtPlayer,
      audioRef, progresso, duracao, currentTime,
      tocarItem, proximaMidia, anteriorMidia, playPause, buscarTempo,
      ajustarVolume, toggleMute, muted, toggleShuffle, toggleRepeat,
      toggleFav, isFavorito, adicionarAFila, removerDaFila, reordenarFila,
      mudarCorDinamica, corDinamica, modoAudio, toggleModoAudio,
    }}>
      <div className={`sync-status fixed top-1 right-4 z-[100] text-[10px] text-muted-foreground ${syncStatus === 'Sincronizado' ? 'sync-idle' : ''}`} role="status">{syncStatus.includes('Não foi') ? <button onClick={()=>void persist().catch(()=>{})}>{syncStatus}</button> : syncStatus}</div>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
