import { Home, Compass, Heart, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';

type View = 'inicio' | 'explorar' | 'favoritos' | 'playlists';

interface MobileNavProps {
  view: View;
  onViewChange: (v: View) => void;
}

const ITEMS = [
  { id: 'inicio' as View, label: 'Início', icon: Home },
  { id: 'explorar' as View, label: 'Explorar', icon: Compass },
  { id: 'favoritos' as View, label: 'Favoritos', icon: Heart },
  { id: 'playlists' as View, label: 'Playlists', icon: ListMusic },
];

export default function MobileNav({ view, onViewChange }: MobileNavProps) {
  return (
    <nav className="mobile-bottom-nav glass-panel fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 safe-area-pb">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id;
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[56px] relative"
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
              />
            )}
            <Icon
              size={22}
              className={`transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span
              className={`text-[10px] font-semibold transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
