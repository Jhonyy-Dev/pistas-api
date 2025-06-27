const express = require('express');
const router = express.Router();
const { s3, BUCKET_NAME } = require('../config/backblaze');
const { Track } = require('../models');
const { Op } = require('sequelize');

// Obtener listado de pistas (paginado)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let where = {};
    
    // Buscar por título si se proporciona un término de búsqueda
    if (req.query.search) {
      where.title = { [Op.like]: `%${req.query.search}%` };
    }
    
    // Obtener pistas con paginación
    const tracks = await Track.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    const totalPages = Math.ceil(tracks.count / limit);
    
    res.json({
      data: tracks.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: tracks.count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
});

// Obtener una pista específica por ID
router.get('/:id', async (req, res, next) => {
  try {
    const track = await Track.findByPk(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: true, message: 'Pista no encontrada' });
    }
    
    res.json({ data: track });
  } catch (error) {
    next(error);
  }
});

// Marcar una pista como reproducida (incrementar contador)
router.post('/:id/play', async (req, res) => {
  try {
    const track = await Track.findByPk(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: 'Track no encontrado' });
    }
    
    // Incrementar contador de reproducciones
    await track.increment('play_count');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementando play_count:', error);
    res.status(500).json({ error: 'Error al procesar la reproducción' });
  }
});

// Obtener URL temporal para streaming de una pista
router.get('/:id/stream', async (req, res, next) => {
  try {
    const track = await Track.findByPk(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: true, message: 'Pista no encontrada' });
    }
    
    // Método simplificado: devolver la URL directa a nuestra API proxy-stream
    try {
      // Construir una URL directa a nuestro endpoint de proxy de audio
      // Esta URL evita problemas CORS porque es servida por nuestro propio servidor
      const baseUrl = process.env.API_URL || `https://localhost:${process.env.PORT || 8081}`;
      const directStreamUrl = `${baseUrl}/api/tracks/direct-stream/${track.id}`;
      
      console.log(`URL de streaming directa generada: ${directStreamUrl}`);
      
      // Devolver solo la URL - simple y efectivo
      res.json({
        data: {
          streamUrl: directStreamUrl
        }
      });
    } catch (genError) {
      console.error('Error al generar URL de streaming:', genError);
      res.status(500).json({ error: true, message: 'Error al generar URL de streaming', details: genError.message });
    }
  } catch (error) {
    next(error);
  }
});

// Listar archivos de Backblaze B2 y sincronizar con base de datos
router.post('/sync', async (req, res, next) => {
  try {
    // Listar objetos en el bucket de B2
    const { Contents } = await s3.listObjects({ Bucket: BUCKET_NAME }).promise();
    
    // Solo procesar archivos MP3
    const mp3Files = Contents.filter(file => file.Key.toLowerCase().endsWith('.mp3'));
    
    for (const file of mp3Files) {
      // Verificar si ya existe en la base de datos
      const existingTrack = await Track.findOne({ where: { filename: file.Key } });
      
      if (!existingTrack) {
        // Generar URL de acceso público
        const url = `${process.env.B2_ENDPOINT}/${BUCKET_NAME}/${file.Key}`;
        
        // Extraer título del nombre del archivo
        const title = file.Key.replace(/\.mp3$/i, '').replace(/_/g, ' ');
        
        // Crear nuevo registro en la base de datos
        await Track.create({
          title,
          filename: file.Key,
          b2FileId: file.ETag,
          b2FileUrl: url,
          fileSize: file.Size
        });
      }
    }
    
    res.json({ message: 'Sincronización completada', filesProcessed: mp3Files.length });
  } catch (error) {
    next(error);
  }
});

// ENDPOINT DE STREAMING DIRECTO - SOLUCIÓN DEFINITIVA
router.get('/direct-stream/:id', async (req, res) => {
  try {
    const trackId = req.params.id;
    const track = await Track.findByPk(trackId);
    
    if (!track) {
      return res.status(404).send('Pista no encontrada');
    }
    
    console.log(`Streaming directo para: ${track.filename} (ID: ${trackId})`);
    
    // SOLUCIÓN DEFINITIVA SIMPLIFICADA: Redireccionar directamente a la URL firmada
    try {
      // Depurar credenciales y configuración
      console.log('Configuración de B2:');
      console.log(`- Bucket: ${BUCKET_NAME}`);
      console.log(`- Endpoint: ${process.env.B2_ENDPOINT || 'NO DEFINIDO'}`);

      // Probar a decodificar el nombre de archivo
      const decodedFileName = decodeURIComponent(track.filename);
      console.log(`- Nombre archivo original: ${track.filename}`);
      console.log(`- Nombre archivo decodificado: ${decodedFileName}`);

      // Generar URL firmada - sin proxy intermedio
      const url = s3.getSignedUrl('getObject', {
        Bucket: BUCKET_NAME,
        Key: decodedFileName,
        Expires: 3600, // 1 hora
        ResponseContentType: 'audio/mpeg', // Forzar tipo de contenido correcto
        ResponseContentDisposition: 'inline' // Forzar reproducción en lugar de descarga
      });
      
      console.log('URL firmada generada:', url.substring(0, 100) + '...');
      
      // Redirigir directamente a la URL firmada - esto evita problemas de proxy
      return res.redirect(url);
    } catch (error) {
      console.error('Error al generar URL firmada:', error);
      return res.status(500).send('Error al generar URL de streaming');
    }
  } catch (error) {
    console.error('Error en endpoint direct-stream:', error);
    return res.status(500).send('Error interno del servidor');
  }
});

module.exports = router;
