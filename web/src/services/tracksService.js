import api from './api';

export const tracksService = {
  // Obtener lista de pistas con paginación y búsqueda opcional
  async getTracks(page = 1, limit = 10, search = '') {
    const params = { page, limit };
    if (search) {
      params.search = search;
    }
    
    const response = await api.get('/api/tracks', { params });
    return response.data;
  },
  
  // Obtener una pista específica por ID
  async getTrack(id) {
    const response = await api.get(`/api/tracks/${id}`);
    return response.data;
  },
  
  // Obtener URL de streaming para una pista
  async getTrackStreamUrl(id) {
    try {
      // Llamamos directamente al endpoint de streaming - no necesitamos pasar fileName
      const response = await api.get(`/api/tracks/${id}/stream`);
      
      console.log('Respuesta de streaming completa:', response);
      
      // Verificamos que tengamos datos y la estructura correcta
      if (!response || !response.data) {
        console.error('Respuesta vacía del servidor');
        throw new Error('No se recibió respuesta del servidor');
      }
      
      // En nuestra API modificada, la respuesta es {data: {streamUrl: string}}
      if (response.data.data && response.data.data.streamUrl) {
        console.log('URL de streaming encontrada:', response.data.data.streamUrl);
        return {
          streamUrl: response.data.data.streamUrl
        };
      } 
      // Para compatibilidad, también probamos con la estructura directa
      else if (response.data && response.data.streamUrl) {
        console.log('URL de streaming encontrada (formato alternativo):', response.data.streamUrl);
        return {
          streamUrl: response.data.streamUrl
        };
      } else {
        console.error('Estructura de respuesta inesperada:', response.data);
        throw new Error('Formato de respuesta inválido');
      }
    } catch (error) {
      console.error('Error al obtener URL de streaming:', error);
      throw error;
    }
  },
  
  // Marcar una pista como reproducida
  async markAsPlayed(id) {
    const response = await api.post(`/api/tracks/${id}/play`);
    return response.data;
  },
  
  // Sincronizar pistas con Backblaze B2 (sólo para administrador)
  async syncTracks() {
    const response = await api.post('/api/tracks/sync');
    return response.data;
  }
};
