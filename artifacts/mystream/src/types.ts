export type MediaType = 'yt' | 'audio' | 'video';

export interface MediaItem {
  storagePath?: string;
  url: string;
  nome: string;
  thumb: string;
  tipo: MediaType;
  artista?: string;
  duracao?: number;
}

export interface Playlist {
  id: string;
  nome: string;
  musicas: MediaItem[];
  thumb?: string;
  criadaEm: number;
}

export interface AppState {
  biblioteca: MediaItem[];
  favoritos: MediaItem[];
  historico: MediaItem[];
  playlists: Playlist[];
  fila: MediaItem[];
  configuracoes: {
    volume: number;
    shuffle: boolean;
    repeat: 'none' | 'one' | 'all';
    modoAudio: boolean;
  };
}

export interface SearchResult extends MediaItem {}
