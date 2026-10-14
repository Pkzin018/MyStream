import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
declare global { interface Window { YT: any; onYouTubeIframeAPIReady: () => void; } }
export default function YouTubePlayer() {
  const { itemAtual, setYtPlayer, proximaMidia, setPlaying } = usePlayer();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(itemAtual);
  const nextRef = useRef(proximaMidia);
  const videoIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  currentRef.current = itemAtual;
  nextRef.current = proximaMidia;
  useEffect(() => {
    let disposed = false;
    const init = () => {
      if (disposed || !containerRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        playerVars: { autoplay: 1, controls: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: (e: any) => { if (!disposed) { setYtPlayer(e.target); setReady(true); } },
          onStateChange: (e: any) => { setPlaying(e.data === window.YT.PlayerState.PLAYING); if (e.data === window.YT.PlayerState.ENDED) nextRef.current(); },
          onError: () => setError('Este vídeo não pôde ser reproduzido aqui. Escolha outro resultado ou abra no YouTube.'),
          onAutoplayBlocked: () => setError('Toque no botão de reprodução do vídeo para começar.'),
        },
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.getElementById('yt-api-script')) {
        const script = document.createElement('script'); script.id = 'yt-api-script'; script.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(script);
      }
    }
    return () => { disposed = true; playerRef.current?.destroy?.(); playerRef.current = null; setYtPlayer(null); };
  }, []);
  useEffect(() => {
    if (ready && itemAtual?.tipo === 'yt' && videoIdRef.current !== itemAtual.url) {
      videoIdRef.current = itemAtual.url; setError(''); playerRef.current?.loadVideoById(itemAtual.url);
    }
  }, [ready, itemAtual?.url]);
  return <div><div className="w-full aspect-video bg-black rounded-lg overflow-hidden"><div ref={containerRef} className="w-full h-full" /></div>{error && <p role="alert" className="p-2 text-xs text-amber-200">{error} {itemAtual?.tipo === 'yt' && <a className="underline" href={'https://www.youtube.com/watch?v=' + itemAtual.url} target="_blank" rel="noreferrer">Abrir no YouTube</a>}</p>}</div>;
}
