import type { AppState, MediaItem, Playlist } from '../types';

const STORAGE_KEY = 'mystream_state_v2';

const defaultState: AppState = {
  biblioteca: [],
  favoritos: [],
  historico: [],
  playlists: [],
  fila: [],
  configuracoes: {
    volume: 1,
    shuffle: false,
    repeat: 'none',
    modoAudio: false,
  },
};

export function carregarEstado(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return { ...defaultState };
  }
}

export function salvarEstado(state: AppState): void {
  try {
    const toSave: AppState = {
      ...state,
      fila: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Erro ao salvar estado:', e);
  }
}

export function adicionarAoHistorico(state: AppState, item: MediaItem): AppState {
  const historico = state.historico.filter(h => h.url !== item.url);
  historico.push(item);
  if (historico.length > 50) historico.shift();
  return { ...state, historico };
}

export function toggleFavorito(state: AppState, item: MediaItem): AppState {
  const existe = state.favoritos.find(f => f.url === item.url);
  const favoritos = existe
    ? state.favoritos.filter(f => f.url !== item.url)
    : [...state.favoritos, item];
  return { ...state, favoritos };
}

export function criarPlaylist(state: AppState, nome: string): AppState {
  const nova: Playlist = {
    id: crypto.randomUUID(),
    nome,
    musicas: [],
    criadaEm: Date.now(),
  };
  return { ...state, playlists: [...state.playlists, nova] };
}

export function adicionarMusicaAPlaylist(state: AppState, playlistId: string, item: MediaItem): AppState {
  const playlists = state.playlists.map(pl => {
    if (pl.id !== playlistId) return pl;
    const jaExiste = pl.musicas.find(m => m.url === item.url);
    if (jaExiste) return pl;
    return { ...pl, musicas: [...pl.musicas, item] };
  });
  return { ...state, playlists };
}

export function removerMusicaDaPlaylist(state: AppState, playlistId: string, url: string): AppState {
  const playlists = state.playlists.map(pl => {
    if (pl.id !== playlistId) return pl;
    return { ...pl, musicas: pl.musicas.filter(m => m.url !== url) };
  });
  return { ...state, playlists };
}

export function deletarPlaylist(state: AppState, playlistId: string): AppState {
  return { ...state, playlists: state.playlists.filter(p => p.id !== playlistId) };
}

export function renomearPlaylist(state: AppState, playlistId: string, novoNome: string): AppState {
  const playlists = state.playlists.map(pl =>
    pl.id === playlistId ? { ...pl, nome: novoNome } : pl
  );
  return { ...state, playlists };
}
