import RenewalNotifications from './components/RenewalNotifications';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Menu } from 'lucide-react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobileNav from './components/MobileNav';
import QueuePanel from './components/QueuePanel';
import VideoPanel from './components/VideoPanel';
import PlaylistModal from './components/PlaylistModal';
import InicioPage from './pages/InicioPage';
import ExplorarPage from './pages/ExplorarPage';
import FavoritosPage from './pages/FavoritosPage';
import PlaylistsPage from './pages/PlaylistsPage';
import { AccountProvider, useAccount } from './context/AccountContext';
import AccountScreen from './components/AccountScreen';
import PasswordResetScreen from './components/PasswordResetScreen';
import SettingsPage from './pages/SettingsPage';
import {BillingProvider} from './context/BillingContext';
import type { MediaItem, MediaType } from './types';

type View = 'inicio' | 'explorar' | 'favoritos' | 'playlists';

const LS_API_KEY = 'mystream_yt_api_key';

function AppInner() {
  const { corDinamica, dispatch, itemAtual, tocando, anteriorMidia, proximaMidia } = usePlayer();
  const {user,avatar}=useAccount();
  const [profileOpen,setProfileOpen]=useState(()=>new URLSearchParams(window.location.search).get('billing')==='return');
  const [profileTab,setProfileTab]=useState<'profile'|'password'|'plan'>(()=>new URLSearchParams(window.location.search).get('billing')==='return'?'plan':'profile');
  const [view, setView] = useState<View>('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playlistModalItem, setPlaylistModalItem] = useState<MediaItem | null>(null);
  const apiKey = '';

  const handleApiKey = useCallback((_k: string) => {
    // The deployed app uses a server-side secret only.
  }, []);

  const submitSearch = () => {
    if (!searchInput.trim()) return;
    setSearchQuery(searchInput.trim());
    setProfileOpen(false);
    setView('explorar');
  };

  useEffect(() => {
    if(new URLSearchParams(window.location.search).has('billing')) window.history.replaceState(null,'',window.location.pathname);
    const openPlan=()=>{setProfileTab('plan');setProfileOpen(true);setSidebarOpen(false);};
    window.addEventListener('mystream-open-plan',openPlan);
    return ()=>window.removeEventListener('mystream-open-plan',openPlan);
  }, []);

  useEffect(() => {
    const reopen = (event: Event) => setVideoOpen((event as CustomEvent<{tipo: string}>).detail.tipo === 'yt' || (event as CustomEvent<{tipo: string}>).detail.tipo === 'video');
    window.addEventListener('mystream-media-selected', reopen);
    return () => window.removeEventListener('mystream-media-selected', reopen);
  }, []);

  // Open video panel automatically when YT item plays
  useEffect(() => {
    if (itemAtual?.tipo === 'yt' || itemAtual?.tipo === 'video') setVideoOpen(true);
    else setVideoOpen(false);
  }, [itemAtual?.url]);

  const handleAddMedia = useCallback((item: { url: string; nome: string; thumb: string; tipo: MediaType }) => {
    dispatch({ type: 'ADD_BIBLIOTECA', payload: item });
  }, [dispatch]);

  const handleAddToPlaylist = useCallback((item: MediaItem) => {
    setPlaylistModalItem(item);
  }, []);

  const handleViewChange = useCallback((v: View) => {
    setProfileOpen(false);
    setView(v);
    setSidebarOpen(false);
  }, []);

  return (
    <div
      className={`app-shell relative min-h-screen bg-background ${focusMode ? 'focus-mode' : ''} ${itemAtual ? 'has-media' : ''}`}
      style={{ '--dynamic-color': corDinamica } as React.CSSProperties}
    >
      {/* Dynamic gradient background */}
      <div className="dynamic-bg" />

      {/* Audio element */}
      <audio id="ms-audio" />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 z-[201] w-72 md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <Sidebar
                view={view}
                onViewChange={handleViewChange}
                onAddMedia={handleAddMedia}
                apiKey={apiKey}
                onSetApiKey={handleApiKey}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="app-layout flex h-dvh pb-mobile-player md:pb-[90px]">
        {/* Desktop Sidebar */}
        <div className={`sidebar hidden md:block w-72 flex-shrink-0 p-3 h-full ${focusMode ? '!hidden' : ''}`}>
          <Sidebar
            view={view}
            onViewChange={handleViewChange}
            onAddMedia={handleAddMedia}
            apiKey={apiKey}
            onSetApiKey={handleApiKey}
          />
        </div>

        {/* Main content */}
        <div className="app-main min-w-0 flex-1 flex flex-col overflow-hidden p-2 md:p-3 md:pl-0 gap-2 md:gap-3">
          {/* Top nav */}
          <div className="app-header glass-panel rounded-xl flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 flex-shrink-0">
            {/* Mobile hamburger */}
            <button
              className="icon-btn md:hidden flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            {focusMode && (
              <button
                className="icon-btn hidden md:flex"
                onClick={() => setFocusMode(false)}
                title="Sair do modo foco"
              >
                <X size={18} />
              </button>
            )}

            <button aria-label="Meu perfil" title="Meu perfil" onClick={()=>{setProfileTab('profile');setProfileOpen(true);}} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">{avatar?<img src={avatar} alt="Meu perfil" className="w-9 h-9 rounded-full object-cover"/>:<span className="text-sm font-bold">{(user?.user_metadata?.display_name || user?.email || 'M').slice(0,1).toUpperCase()}</span>}</button>
            <RenewalNotifications/>
            {/* Search */}
            <div className="flex-1 min-w-0 relative">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 md:px-4 py-2 md:py-2.5 focus-within:bg-white/15 focus-within:border-white/20 border border-transparent transition-all">
                <button onClick={submitSearch} aria-label="Buscar"><Search size={15} className="text-muted-foreground flex-shrink-0" /></button>
                <input
                  className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
                  placeholder="Buscar músicas e vídeos"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchInput.trim().length > 0) {
                      setSearchQuery(searchInput.trim());
                      setProfileOpen(false);
    setView('explorar');
                    }
                  }}
                  autoComplete="off"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                    <X size={14} className="text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content + Video panel */}
          <div className="min-w-0 flex-1 flex gap-3 overflow-hidden">
            {/* Scroll area */}
            <div className="app-content min-w-0 glass-panel rounded-xl flex-1 overflow-y-auto p-3 md:p-6 scroll-smooth">
              {profileOpen ? <SettingsPage key={profileTab} initialTab={profileTab} onBack={()=>setProfileOpen(false)}/> : <AnimatePresence mode="wait">
                {view === 'inicio' && (
                  <motion.div
                    key="inicio"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <InicioPage apiKey={apiKey} onAddToPlaylist={handleAddToPlaylist} />
                  </motion.div>
                )}
                {view === 'explorar' && (
                  <motion.div
                    key="explorar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExplorarPage
                      searchQuery={searchQuery}
                      apiKey={apiKey}
                      onAddToPlaylist={handleAddToPlaylist}
                    />
                  </motion.div>
                )}
                {view === 'favoritos' && (
                  <motion.div
                    key="favoritos"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FavoritosPage onAddToPlaylist={handleAddToPlaylist} />
                  </motion.div>
                )}
                {view === 'playlists' && (
                  <motion.div
                    key="playlists"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PlaylistsPage onAddToPlaylist={handleAddToPlaylist} />
                  </motion.div>
                )}
              </AnimatePresence>}
            </div>

            {/* Video panel (right side when active, desktop only) */}
            {(itemAtual?.tipo === 'yt' || itemAtual?.tipo === 'video') && (
              <motion.div
                className={`player-queue mobile-video-sheet fixed inset-0 z-[80] md:static md:w-80 md:flex-shrink-0 md:z-auto ${videoOpen ? 'block' : 'hidden'}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <VideoPanel
                  isOpen={true}
                  onOpenQueue={()=>setQueueOpen(true)}
                  onClose={() => setVideoOpen(false)}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Queue panel (overlay) */}
      <QueuePanel isOpen={queueOpen} onClose={() => setQueueOpen(false)} />

      {/* Player bar */}
      <PlayerBar
        onOpenQueue={() => setQueueOpen(p => !p)}
        onFocusMode={() => {setVideoOpen(true);}}
      />

      {/* Mobile bottom nav — sits below player bar */}
      <div className="md:hidden">
        <MobileNav view={view} onViewChange={(v)=>{setVideoOpen(false);handleViewChange(v);}} />
      </div>

      {/* Playlist modal */}
      <PlaylistModal
        isOpen={!!playlistModalItem}
        item={playlistModalItem}
        onClose={() => setPlaylistModalItem(null)}
      />
    </div>
  );
}

function AccountApp() {
  const {user,loading,error,recovery} = useAccount();
  if(loading) return <main className="min-h-screen bg-background text-foreground flex items-center justify-center">Carregando sua conta…</main>;
  if(user && recovery) return <PasswordResetScreen/>;
  if(!user) return <><AccountScreen />{error && <p role="alert" className="fixed bottom-4 left-4 text-red-300">{error}</p>}</>;
  return <BillingProvider key={user.id}><PlayerProvider key={user.id}><AppInner /></PlayerProvider></BillingProvider>;
}
export default function App() {return <AccountProvider><AccountApp /></AccountProvider>;}
