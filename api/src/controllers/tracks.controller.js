const tracksService = require('../services/tracks.service');

// Controladores para la gestión de pistas musicales
class TracksController {
  /**
   * Obtiene todas las pistas disponibles
   * @param {Request} req - Objeto de solicitud Express
   * @param {Response} res - Objeto de respuesta Express
   */
  async getTracks(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      
      console.log(`Solicitud recibida: page=${page}, limit=${limit}, search=${search}`);
      
      // Mostrar parámetros de ambiente para depuración
      console.log(`Usando B2_BUCKET_NAME: ${process.env.B2_BUCKET_NAME}`);
      console.log(`Usando B2_ENDPOINT: ${process.env.B2_ENDPOINT}`);
      
      // Usar los parámetros tal como los espera el servicio
      const result = await tracksService.getTracks({ 
        page,
        limit,
        search
      });
      
      // Filtrar si hay término de búsqueda
      let filteredTracks = result.tracks;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredTracks = result.tracks.filter(track =>
          track.name.toLowerCase().includes(searchLower) || 
          track.fileName.toLowerCase().includes(searchLower)
        );
      }
      
      // Aplicar paginación manualmente si es necesario
      const startIndex = 0; // Ya aplicamos paginación en el servicio con startAfter
      const endIndex = limit;
      const paginatedTracks = filteredTracks.slice(startIndex, endIndex);
      
      res.json({
        tracks: paginatedTracks,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: filteredTracks.length,
          hasMore: result.pagination.hasMore && filteredTracks.length > limit,
          nextFileName: result.nextFileName
        }
      });
    } catch (error) {
      console.error('Error al obtener pistas de música', error);
      res.status(500).json({ 
        message: 'Error al obtener pistas de música', 
        error: error.message 
      });
    }
  }

  /**
   * Obtiene una pista específica por su ID
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async getTrackById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'ID de pista es requerido' });
      }
      
      const track = await tracksService.getTrackById(id);
      
      if (!track) {
        return res.status(404).json({ message: 'Pista no encontrada' });
      }
      
      res.status(200).json(track);
    } catch (error) {
      console.error(`Error en getTrackById controller para ID ${req.params.id}:`, error);
      
      // Manejar específicamente el error de archivo no encontrado
      if (error.message === 'Archivo no encontrado') {
        return res.status(404).json({ message: 'Pista no encontrada' });
      }
      
      res.status(500).json({
        message: 'Error al obtener la pista',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del servidor'
      });
    }
  }

  /**
   * Genera una URL firmada para streaming de la pista
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async getStreamUrl(req, res) {
    try {
      const { id } = req.params;
      const { fileName } = req.query;
      
      if (!id || !fileName) {
        return res.status(400).json({ 
          message: 'ID de pista y nombre de archivo son requeridos' 
        });
      }
      
      const streamUrl = await tracksService.getStreamUrl(id, fileName);
      
      res.status(200).json({ streamUrl });
    } catch (error) {
      console.error(`Error en getStreamUrl controller para ID ${req.params.id}:`, error);
      res.status(500).json({
        message: 'Error al generar URL de streaming',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del servidor'
      });
    }
  }

  /**
   * Registra una reproducción de una pista
   * @param {Object} req Request object
   * @param {Object} res Response object
   */
  async trackPlay(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: 'ID de pista es requerido' });
      }
      
      // Aquí se podría implementar una lógica para registrar la reproducción en una base de datos
      // Por ahora, simplemente devolvemos un mensaje de éxito
      
      res.status(200).json({ 
        message: 'Reproducción registrada correctamente',
        trackId: id
      });
    } catch (error) {
      console.error(`Error en trackPlay controller para ID ${req.params.id}:`, error);
      res.status(500).json({
        message: 'Error al registrar reproducción',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del servidor'
      });
    }
  }
}

module.exports = new TracksController();
