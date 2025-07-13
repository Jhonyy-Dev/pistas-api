import { createSlice } from '@reduxjs/toolkit';

// Crear un objeto Audio común para toda la aplicación
// Esto permitirá que la música siga reproduciéndose aunque el usuario cambie de página
const audioElement = typeof Audio !== 'undefined' ? new Audio() : null;

const initialState = {
  currentTrack: null,
  isPlaying: false,
  volume: 1, // 70% de volumen por defecto
  duration: 0,
  currentTime: 0,
  queue: [], // Cola de reproducción
  currentIndex: -1, // Índice de la canción actual en la cola
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentTrack: (state, action) => {
      const track = action.payload;
      state.currentTrack = track;
      
      // Si hay un elemento de audio y tenemos una URL
      if (audioElement && track) {
        // Actualizar la fuente del audio
        audioElement.src = track.streamUrl;
        audioElement.load();
      }
    },
    
    play: (state) => {
      state.isPlaying = true;
      
      if (audioElement && state.currentTrack) {
        audioElement.play();
      }
    },
    
    pause: (state) => {
      state.isPlaying = false;
      
      if (audioElement) {
        audioElement.pause();
      }
    },
    
    setVolume: (state, action) => {
      state.volume = action.payload;
      
      if (audioElement) {
        audioElement.volume = action.payload;
      }
    },
    
    setCurrentTime: (state, action) => {
      state.currentTime = action.payload;
      
      if (audioElement) {
        audioElement.currentTime = action.payload;
      }
    },
    
    updateProgress: (state, action) => {
      state.currentTime = action.payload.currentTime;
      state.duration = action.payload.duration;
    },
    
    setQueue: (state, action) => {
      state.queue = action.payload.tracks;
      state.currentIndex = action.payload.index || 0;
    },
    
    playNext: (state) => {
      if (state.currentIndex < state.queue.length - 1) {
        state.currentIndex += 1;
        state.currentTrack = state.queue[state.currentIndex];
        
        if (audioElement && state.currentTrack) {
          audioElement.src = state.currentTrack.streamUrl;
          audioElement.load();
          if (state.isPlaying) {
            audioElement.play();
          }
        }
      }
    },
    
    playPrevious: (state) => {
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
        state.currentTrack = state.queue[state.currentIndex];
        
        if (audioElement && state.currentTrack) {
          audioElement.src = state.currentTrack.streamUrl;
          audioElement.load();
          if (state.isPlaying) {
            audioElement.play();
          }
        }
      }
    },
    
    togglePlay: (state) => {
      state.isPlaying = !state.isPlaying;
      
      if (audioElement) {
        if (state.isPlaying) {
          audioElement.play();
        } else {
          audioElement.pause();
        }
      }
    }
  }
});

// Exportar el elemento Audio para poder añadir eventos
export { audioElement };

export const { 
  setCurrentTrack, 
  play, 
  pause, 
  setVolume, 
  setCurrentTime, 
  updateProgress,
  setQueue,
  playNext,
  playPrevious,
  togglePlay
} = playerSlice.actions;

export default playerSlice.reducer;
