import { decodeMediaText } from '../lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripVertical, Trash2, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const { state, itemAtual, removerDaFila, reordenarFila } = usePlayer();
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragging(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = (toIndex: number) => {
    if (dragging !== null && dragging !== toIndex) {
      reordenarFila(dragging, toIndex);
    }
    setDragging(null);
    setDragOver(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="queue-panel glass-panel open"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/8">
            <h3 className="font-bold text-foreground">Fila de Reprodução</h3>
            <button className="icon-btn" aria-label="Fechar lista de reprodução" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Currently playing */}
          {itemAtual && (
            <div className="p-4 border-b border-white/8">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Tocando Agora
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={itemAtual.thumb || 'https://picsum.photos/seed/now/40/40'}
                  alt={decodeMediaText(itemAtual.nome)}
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary truncate">{decodeMediaText(itemAtual.nome)}</p>
                  <p className="text-xs text-muted-foreground">{decodeMediaText(itemAtual.artista) || 'MyStream'}</p>
                </div>
                <div className="equalizer active ml-auto">
                  <div className="bar"/><div className="bar"/><div className="bar"/><div className="bar"/>
                </div>
              </div>
            </div>
          )}

          {/* Queue list */}
          <div className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              A Seguir ({state.fila.length})
            </p>

            {state.fila.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <Music size={32} />
                <p className="text-sm">Fila vazia</p>
                <p className="text-xs text-center">Adicione músicas à fila clicando no ícone de lista nos cards</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {state.fila.map((item, idx) => (
                  <motion.li
                    key={`${item.url}-${idx}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-grab
                      ${dragging === idx ? 'opacity-40' : ''}
                      ${dragOver === idx ? 'bg-primary/20 border border-primary/40' : 'hover:bg-white/5'}
                    `}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
                    <img
                      src={item.thumb || 'https://picsum.photos/seed/q/36/36'}
                      alt={decodeMediaText(item.nome)}
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{decodeMediaText(item.nome)}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.tipo === 'yt' ? 'YouTube' : 'Local'}
                      </p>
                    </div>
                    <button
                      className="icon-btn"
                      aria-label={"Remover " + decodeMediaText(item.nome) + " da fila"}
                      onClick={() => removerDaFila(idx)}
                    >
                      <X size={13} />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
