import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tracksService } from '../../services/tracksService';

// Datos de ejemplo para desarrollo (cuando el backend no está disponible)
const demoTracks = [
  {
    id: '1',
    title: 'Demo Track 1',
    filename: 'demo-track-1.mp3',
    duration: 180,
    fileSize: 4500000,
    plays: 125,
    createdAt: '2025-06-01T10:00:00.000Z'
  },
  {
    id: '2',
    title: 'Demo Track 2',
    filename: 'demo-track-2.mp3',
    duration: 240,
    fileSize: 5800000,
    plays: 85,
    createdAt: '2025-06-02T11:00:00.000Z'
  },
  {
    id: '3',
    title: 'Demo Track 3',
    filename: 'demo-track-3.mp3',
    duration: 195,
    fileSize: 4200000,
    plays: 210,
    createdAt: '2025-06-03T12:00:00.000Z'
  }
];

// Thunks
export const fetchTracks = createAsyncThunk(
  'tracks/fetchTracks',
  async ({ page = 1, limit = 20, search = '' }, { rejectWithValue }) => {
    try {
      console.log(`Solicitando pistas: página=${page}, límite=${limit}, búsqueda=${search}`);
      const response = await tracksService.getTracks(page, limit, search);
      console.log('Respuesta recibida del API:', response);
      return response;
    } catch (error) {
      console.error('Error en fetchTracks:', error);
      return rejectWithValue(error.message || 'Error al obtener pistas');
    }
  }
);

export const fetchTrackStreamUrl = createAsyncThunk(
  'tracks/fetchStreamUrl',
  async (trackId, { rejectWithValue }) => {
    try {
      // Llamar al servicio para obtener la URL de streaming
      const response = await tracksService.getTrackStreamUrl(trackId);
      
      // Verificar estructura de la respuesta para diferentes formatos posibles
      let streamUrl;
      
      // Caso 1: response.data.data.streamUrl (anidado dos niveles)
      if (response && response.data && response.data.streamUrl) {
        streamUrl = response.data.streamUrl;
      } 
      // Caso 2: response.streamUrl (directo)
      else if (response && response.streamUrl) {
        streamUrl = response.streamUrl;
      } 
      // Ningún caso coincide
      else {
        console.error('Formato de respuesta desconocido:', response);
        return rejectWithValue('Formato de respuesta de streaming desconocido');
      }
      
      console.log('URL de streaming extraída:', streamUrl);
      return { trackId, streamUrl };
    } catch (error) {
      console.error('Error obteniendo URL de streaming:', error);
      return rejectWithValue(error.message || 'Error al obtener la URL de streaming');
    }
  }
);

// Slice
const initialState = {
  tracks: [], // Inicialmente vacío para forzar carga desde API
  status: 'idle', // Inicialmente en idle para forzar carga
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  streamUrls: {} // Inicialmente vacío para forzar carga desde API
};

const tracksSlice = createSlice({
  name: 'tracks',
  initialState,
  reducers: {
    clearTracks: (state) => {
      state.tracks = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Manejo de fetchTracks
      .addCase(fetchTracks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTracks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // La API devuelve un objeto con la propiedad data que contiene las pistas
        state.tracks = action.payload.data || [];
        state.pagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10
        };
        console.log('Tracks obtenidos:', state.tracks.length);
      })
      .addCase(fetchTracks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Error al cargar las pistas';
      })
      
      // Manejo de fetchTrackStreamUrl
      .addCase(fetchTrackStreamUrl.pending, (state, action) => {
        // Opcional: Marcar que se está cargando
      })
      .addCase(fetchTrackStreamUrl.fulfilled, (state, action) => {
        // Guardar URL de streaming en caché
        state.streamUrls[action.payload.trackId] = action.payload.streamUrl;
      })
      .addCase(fetchTrackStreamUrl.rejected, (state, action) => {
        // Manejar error, quizás usando una URL de fallback
        console.error('Error al obtener URL de streaming', action.error);
      });
  }
});

export const { clearTracks } = tracksSlice.actions;
export default tracksSlice.reducer;
