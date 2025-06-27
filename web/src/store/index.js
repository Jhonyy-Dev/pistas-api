import { configureStore } from '@reduxjs/toolkit';
import tracksReducer from './slices/tracksSlice';
import playerReducer from './slices/playerSlice';

export const store = configureStore({
  reducer: {
    tracks: tracksReducer,
    player: playerReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Para permitir objetos no serializables como el objeto Audio
    })
});
