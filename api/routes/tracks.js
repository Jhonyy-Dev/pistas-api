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
      
      // Determinar la URL base adecuada basada en el entorno
      let baseUrl;
      
      if (process.env.NODE_ENV === 'production') {
        // En producción, usamos la URL de Railway
        // NOTA: Obtener del hostname de la solicitud si API_URL no está configurado
        const railwayUrl = process.env.API_URL || 
                          `https://${req.headers.host || 'pistas-api-nuevo.up.railway.app'}`;
        
        console.log(`URL base en producción (Railway): ${railwayUrl}`);
        baseUrl = railwayUrl;
      } else {
        // En desarrollo, usamos localhost
        baseUrl = `http://localhost:${process.env.PORT || 8081}`;
        console.log(`URL base en desarrollo (local): ${baseUrl}`);
      }
      
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

// ENDPOINT DE STREAMING DIRECTO - SOLUCIÓN CON PROXY COMPLETO Y LOGS DETALLADOS
router.get('/direct-stream/:id', async (req, res) => {
  try {
    console.log('========== INICIO DE SOLICITUD DE STREAMING ==========');
    console.log(`Fecha/Hora: ${new Date().toISOString()}`);
    console.log(`IP Cliente: ${req.ip}`);
    console.log(`User-Agent: ${req.headers['user-agent']}`);
    console.log(`Headers completos: ${JSON.stringify(req.headers, null, 2)}`);
    
    const trackId = req.params.id;
    console.log(`ID de pista solicitada: ${trackId}`);
    
    const track = await Track.findByPk(trackId);
    
    if (!track) {
      console.log(`ERROR: Pista con ID ${trackId} no encontrada en la base de datos`);
      return res.status(404).send('Pista no encontrada');
    }
    
    console.log(`TRACK ENCONTRADO: ${track.title} | Filename: ${track.filename} | ID: ${trackId}`);
    
    // SOLUCIÓN DEFINITIVA CON PROXY COMPLETO: La API actúa como intermediaria
    try {
      // Depurar credenciales y configuración completa
      console.log('CONFIGURACIÓN COMPLETA:');
      console.log(`- Bucket: ${BUCKET_NAME}`);
      console.log(`- Endpoint: ${process.env.B2_ENDPOINT || 'NO DEFINIDO'}`);
      console.log(`- Access Key (parcial): ${process.env.B2_ACCESS_KEY ? '***' + process.env.B2_ACCESS_KEY.substring(process.env.B2_ACCESS_KEY.length - 4) : 'NO DEFINIDO'}`);
      console.log(`- Secret Key: ${process.env.B2_SECRET_KEY ? '***OCULTA***' : 'NO DEFINIDA'}`); 
      console.log(`- Entorno: ${process.env.NODE_ENV}`);
      console.log(`- API URL: ${process.env.API_URL}`);
      console.log('- Modo: Proxy streaming directo mediante pipe');

      // Probar a decodificar el nombre de archivo
      const decodedFileName = decodeURIComponent(track.filename);
      console.log(`- Archivo original: ${track.filename}`);
      console.log(`- Archivo decodificado: ${decodedFileName}`);
      console.log(`- URL en BD: ${track.b2FileUrl || 'No hay URL en BD'}`);

      // Configurar parámetros para obtener el archivo de B2
      const params = {
        Bucket: BUCKET_NAME,
        Key: decodedFileName
      };
      
      console.log(`SOLICITANDO ARCHIVO: Bucket=${BUCKET_NAME}, Key=${decodedFileName}`);
      
      // Importante: Establecer las cabeceras correctas para el streaming
      console.log('CONFIGURANDO CABECERAS HTTP PARA STREAMING:');
      
      // Definir y registrar todas las cabeceras para máxima compatibilidad
      const headers = {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        
        // Cabeceras CORS completas
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        
        // Políticas Cross-Origin permisivas
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none', // Cambiado de require-corp a unsafe-none
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        
        // Desactivar CSP para este endpoint específico
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"
      };
      
      // Aplicar todas las cabeceras
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
        console.log(`- Cabecera: ${key} = ${value}`);
      });
      
      console.log('INICIANDO STREAM DESDE B2 AL CLIENTE...');
      
      // Obtener el archivo como stream y enviarlo directamente al cliente
      // Esto evita problemas de CORS/HTTPS porque el contenido viene del mismo origen
      try {
        const fileStream = s3.getObject(params).createReadStream();
        console.log('Stream creado correctamente');
        
        // Registrar eventos del stream para debugging
        let bytesStreamed = 0;
        
        fileStream.on('data', (chunk) => {
          bytesStreamed += chunk.length;
          if (bytesStreamed % (512 * 1024) === 0) { // Log cada 512KB
            console.log(`Streaming en progreso: ${(bytesStreamed/1024/1024).toFixed(2)}MB transferidos`);
          }
        });
        
        // Manejar errores del stream
        fileStream.on('error', (err) => {
          console.error(`ERROR EN STREAM: ${err.message}`);
          console.error(JSON.stringify(err, null, 2));
          if (!res.headersSent) {
            res.status(500).send(`Error al obtener el archivo de audio: ${err.message}`);
          }
        });
        
        // Log al finalizar el stream
        fileStream.on('end', () => {
          console.log(`STREAM COMPLETADO: Total ${(bytesStreamed/1024/1024).toFixed(2)}MB transferidos`);
          console.log('========== FIN DE STREAMING ==========');
        });
        
        // Stream directo al cliente (pipe)
        console.log('Conectando stream al cliente mediante pipe...');
        fileStream.pipe(res);
        
        // No hacer return ya que el pipe maneja la respuesta
      } catch (streamError) {
        console.error(`ERROR AL CREAR STREAM: ${streamError.message}`);
        console.error(JSON.stringify(streamError, null, 2));
        return res.status(500).send(`Error al iniciar streaming: ${streamError.message}`);
      }
    } catch (error) {
      console.error('ERROR EN PROCESO DE STREAMING:');
      console.error(`- Mensaje: ${error.message}`);
      console.error(`- Stack: ${error.stack}`);
      console.error(JSON.stringify(error, null, 2));
      return res.status(500).send(`Error en streaming: ${error.message}`);
    }
  } catch (error) {
    console.error('Error en endpoint direct-stream:', error);
    return res.status(500).send('Error interno del servidor');
  }
});

module.exports = router;
