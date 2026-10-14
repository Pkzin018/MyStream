import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Home, Compass, Heart, ListMusic, Music, Video, Plus, User, LogIn } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { usePlayer } from '../context/PlayerContext';
import {uploadMedia} from '../lib/media-storage';
import type { MediaType } from '../types';

type View = 'inicio' | 'explorar' | 'favoritos' | 'playlists';

interface SidebarProps {
  view: View;
  onViewChange: (v: View) => void;
  onAddMedia: (item: { url: string; nome: string; thumb: string; tipo: MediaType }) => void;
  apiKey: string;
  onSetApiKey: (k: string) => void;
}

const MENU_ITEMS = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'explorar', label: 'Explorar', icon: Compass },
  { id: 'favoritos', label: 'Favoritos', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
] as const;

export default function Sidebar({ view, onViewChange, onAddMedia, apiKey, onSetApiKey }: SidebarProps) {
  const { dispatch, flushAccount } = usePlayer();
  const { user, signOut } = useAccount();
  const [ytLink, setYtLink] = useState('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [uploadStatus,setUploadStatus]=useState('');
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>,tipo:MediaType) => {
    const files=Array.from(e.target.files || []); e.target.value='';
    if(!user || !files.length) return;
    setUploadStatus('Enviando arquivos…');
    try {
      for(const file of files) onAddMedia(await uploadMedia(file,user.id,tipo));
      setUploadStatus('Arquivos adicionados à sua biblioteca.');
    } catch(error) {setUploadStatus(error instanceof Error?error.message:'Não foi possível enviar.');}
  };
  const handleAudioUpload=(e:React.ChangeEvent<HTMLInputElement>)=>void handleUpload(e,'audio');
  const handleVideoUpload=(e:React.ChangeEvent<HTMLInputElement>)=>void handleUpload(e,'video');

  const handleAddYtLink = () => {
    const trimmed = ytLink.trim();
    if (!trimmed) return;
    let videoId = trimmed;
    const match = trimmed.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) videoId = match[1];
    const item = {
      url: videoId,
      nome: `YouTube: ${videoId}`,
      thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      tipo: 'yt' as MediaType,
    };
    dispatch({ type: 'ADD_BIBLIOTECA', payload: item });
    onAddMedia(item);
    setYtLink('');
  };

  return (
    <motion.aside
      className="glass-panel flex flex-col rounded-xl h-full overflow-hidden"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <img src="/mystream-logo.png" alt="Logo MyStream" className="w-10 h-10 object-contain flex-shrink-0" />
        <span className="text-xl font-black tracking-tight text-foreground">MyStream</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3">
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex items-center gap-4 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200 w-full text-left
              ${view === id
                ? 'text-foreground bg-white/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            onClick={() => onViewChange(id)}
          >
            <Icon size={18} className="flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Library */}
      <div className="mt-6 px-3 border-t border-white/8 pt-5 flex-1 overflow-y-auto">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
          Sua Biblioteca
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            className="flex flex-col items-center gap-2 py-3 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 transition-colors text-xs font-semibold text-foreground"
            onClick={() => audioInputRef.current?.click()}
          >
            <Music size={18} />
            + Áudio
          </button>
          <button
            className="flex flex-col items-center gap-2 py-3 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 transition-colors text-xs font-semibold text-foreground"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video size={18} />
            + Vídeo
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground mb-3">Áudios e vídeos privados na sua conta · até 50 MB por arquivo.</p>
        {uploadStatus && <p role="status" className="text-xs text-amber-200 mb-3">{uploadStatus}</p>}
        <input ref={audioInputRef} type="file" accept="audio/*" hidden multiple onChange={handleAudioUpload} />
        <input ref={videoInputRef} type="file" accept="video/*" hidden multiple onChange={handleVideoUpload} />

        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 mb-4">
          <input
            className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
            placeholder="URL do YouTube..."
            value={ytLink}
            onChange={e => setYtLink(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddYtLink()}
          />
          <button
            onClick={handleAddYtLink}
            className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center hover:bg-primary transition-colors flex-shrink-0"
          >
            <Plus size={12} />
          </button>
        </div>

      </div>

      {/* User profile placeholder */}
      <div className="px-3 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Minha conta'}</p>
            <p className="text-xs text-muted-foreground">Meu universo</p>
          </div>
          <button title="Sair da conta" aria-label="Sair da conta" onClick={()=>{void (async()=>{try {await flushAccount();await signOut();} catch { /* Save error is visible in the sync status. */ }})();}}><LogIn size={16} className="text-muted-foreground flex-shrink-0" /></button>
        </div>
      </div>
    </motion.aside>
  );
}
