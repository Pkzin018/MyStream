import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import MediaCard from '../components/MediaCard';
import { usePlayer } from '../context/PlayerContext';
import type { MediaItem } from '../types';

interface FavoritosPageProps {
  onAddToPlaylist: (item: MediaItem) => void;
}

export default function FavoritosPage({ onAddToPlaylist }: FavoritosPageProps) {
  const { state, dispatch } = usePlayer();
  const { favoritos } = state;

  const handleRemove = (item: MediaItem) => {
    dispatch({ type: 'TOGGLE_FAV', payload: item });
  };

  return (
    <div className="fade-in">
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center flex-shrink-0">
          <Heart size={22} className="text-white" fill="white" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">Músicas Curtidas</h2>
          <p className="text-sm text-muted-foreground">{favoritos.length} músicas</p>
        </div>
      </motion.div>

      {favoritos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <Heart size={48} />
          <h3 className="text-lg font-bold text-foreground">Nenhuma música favorita ainda</h3>
          <p className="text-sm text-center">Curta músicas clicando no ícone de coração</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-5">
          {favoritos.map((item, idx) => (
            <MediaCard
              key={item.url}
              item={item}
              index={idx}
              lista={favoritos}
              onAddToPlaylist={onAddToPlaylist}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
