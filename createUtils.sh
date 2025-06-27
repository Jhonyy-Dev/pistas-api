#!/bin/bash

# Crear directorios necesarios
mkdir -p /app/utils
mkdir -p /app/api/utils
mkdir -p /app/middlewares
mkdir -p /app/api/middlewares
mkdir -p /app/api/models
mkdir -p /app/api/config
mkdir -p /app/api/routes
mkdir -p /app/models
mkdir -p /app/config
mkdir -p /app/routes
mkdir -p /app/middlewares

# Crear el archivo validateEnv.js
cat > /app/api/utils/validateEnv.js << 'EOL'
/**
 * Validación de variables de entorno necesarias para la ejecución en producción
 * Este archivo se ejecuta al inicio para verificar que todas las variables críticas estén configuradas
 */

function validateEnv() {
  const requiredVars = [
    "DATABASE_URL",
    "PORT", 
    "NODE_ENV",
    "CORS_ORIGIN",
    "B2_APPLICATION_KEY",
    "B2_BUCKET_NAME",
    "B2_ENDPOINT",
    "B2_REGION"
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Error: Faltan las siguientes variables de entorno: ${missingVars.join(", ")}`);
    process.exit(1);
  }
  
  console.log("✅ Todas las variables de entorno requeridas están presentes");
  
  // Validaciones adicionales específicas
  if (process.env.NODE_ENV === "production") {
    if (!process.env.CORS_ORIGIN.startsWith("https://") && process.env.CORS_ORIGIN !== "*") {
      console.warn("⚠️ Advertencia: En producción, CORS_ORIGIN debería usar HTTPS para mayor seguridad");
    }
  }
}

module.exports = validateEnv;
EOL

# Crear el archivo logger.js sin dependencias externas
cat > /app/api/utils/logger.js << 'EOL'
/**
 * Logger simple que usa console.log para evitar dependencias externas
 */
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta);
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta);
    }
  }
};

module.exports = logger;
EOL

# Crear el archivo errorHandler.js en /app/api/utils/
cat > /app/api/utils/errorHandler.js << 'EOL'
/**
 * Configura manejadores de errores globales para la aplicación
 */

const logger = require('./logger');

function setupErrorHandlers(options = {}) {
  const { exitOnUncaught = true } = options;

  // Manejar errores no capturados en promesas
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesa rechazada no manejada:', {
      reason,
      stack: reason.stack || 'No stack trace disponible',
      promise
    });
    // No terminar el proceso para que la aplicación pueda continuar
  });

  // Manejar excepciones no capturadas
  process.on('uncaughtException', (error) => {
    logger.error('Excepción no capturada:', {
      error: error.message,
      stack: error.stack || 'No stack trace disponible'
    });

    if (exitOnUncaught) {
      logger.error('Cerrando la aplicación por error crítico');
      // Dar tiempo para registrar el error antes de salir
      setTimeout(() => process.exit(1), 1000);
    }
  });

  // Middleware para manejar errores en Express
  return function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    
    logger.error(`Error en ruta ${req.method} ${req.path}:`, {
      error: err.message,
      stack: err.stack || 'No stack trace disponible',
      statusCode
    });

    res.status(statusCode).json({
      error: true,
      message: process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : err.message
    });
  };
}

module.exports = setupErrorHandlers;
EOL

# Crear el archivo rateLimiter.js
cat > /app/api/middlewares/rateLimiter.js << 'EOL'
/**
 * Middleware de Rate Limiting para proteger la API contra abusos
 * Limita el número de solicitudes que un cliente puede hacer en un período de tiempo específico
 */

const logger = require('../utils/logger');

// Implementación simple de almacenamiento en memoria
// En producción real se recomendaría usar Redis u otro almacenamiento distribuido
const ipRequestsMap = new Map();
const WINDOW_SIZE_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS_PER_WINDOW = {
  development: 1000,
  test: 1000,
  production: 300
};
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Limpieza cada 5 minutos

// Limpiar entradas antiguas periódicamente para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of ipRequestsMap.entries()) {
    // Eliminar solicitudes antiguas que están fuera de la ventana de tiempo
    const validRequests = requests.filter(timestamp => now - timestamp < WINDOW_SIZE_MS);
    if (validRequests.length === 0) {
      ipRequestsMap.delete(ip);
    } else {
      ipRequestsMap.set(ip, validRequests);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Middleware de rate limiting
function rateLimiter(req, res, next) {
  const environment = process.env.NODE_ENV || 'development';
  
  // No aplicar rate limiting en desarrollo si así se desea
  if (environment !== 'production' && process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Obtener las solicitudes previas o inicializar una nueva lista
  const requests = ipRequestsMap.get(ip) || [];
  
  // Filtrar solicitudes dentro de la ventana actual
  const recentRequests = requests.filter(timestamp => now - timestamp < WINDOW_SIZE_MS);
  
  // Verificar si se excede el límite
  const maxRequests = MAX_REQUESTS_PER_WINDOW[environment] || MAX_REQUESTS_PER_WINDOW.production;
  if (recentRequests.length >= maxRequests) {
    logger.warn(`Rate limit excedido para IP: ${ip}`, { 
      requests: recentRequests.length,
      limit: maxRequests,
      windowSize: `${WINDOW_SIZE_MS/1000/60} minutos`
    });
    
    return res.status(429).json({
      error: true,
      message: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.',
      retryAfter: Math.ceil(WINDOW_SIZE_MS / 1000) // En segundos
    });
  }
  
  // Registrar esta solicitud y actualizar el mapa
  recentRequests.push(now);
  ipRequestsMap.set(ip, recentRequests);
  
  next();
}

module.exports = rateLimiter;
EOL

# Crear el archivo securityHeaders.js
cat > /app/api/middlewares/securityHeaders.js << 'EOL'
/**
 * Middleware para configurar cabeceras de seguridad HTTP
 * Añade protecciones recomendadas para aplicaciones en producción
 */

function securityHeaders(req, res, next) {
  // Evitar que el navegador detecte automáticamente MIME types
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Ayuda a proteger contra ataques XSS al filtrar responsabilidades
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Impedir que la página aparezca en un iframe (protege contra clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Forzar conexiones HTTPS por al menos 1 año (31536000 segundos) en producción
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Deshabilitar la característica DNS prefetching (opcional)
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Establecer política de referrer para mejorar la privacidad
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Eliminar la cabecera X-Powered-By (que revela Node.js)
  res.removeHeader('X-Powered-By');
  
  next();
}

module.exports = securityHeaders;
EOL

# Crear el archivo requestLogger.js
cat > /app/api/middlewares/requestLogger.js << 'EOL'
/**
 * Middleware para registrar detalles de cada petición
 * Util para monitorear y depurar la aplicación en producción
 */

const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = process.hrtime();
  
  // Registrar la petición recibida
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer || '',
    query: req.query
  });
  
  // Una vez que se envía la respuesta
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = (seconds * 1000 + nanoseconds / 1000000).toFixed(2); // ms
    
    // Sólo registrar peticiones lentas o errores en producción
    const isProd = process.env.NODE_ENV === 'production';
    const isSlowRequest = duration > 1000; // más de 1 segundo
    const isError = res.statusCode >= 400;
    
    if (!isProd || isSlowRequest || isError) {
      const logMethod = isError ? 'error' : (isSlowRequest ? 'warn' : 'debug');
      
      logger[logMethod](`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
        statusCode: res.statusCode,
        responseTime: `${duration}ms`,
        contentLength: res.get('Content-Length') || 0
      });
    }
  });
  
  next();
}

module.exports = requestLogger;
EOL

# Crear el archivo database.js
cat > /app/api/config/database.js << 'EOL'
const { Sequelize } = require('sequelize');

// Crear instancia de Sequelize utilizando la URL de la base de datos desde .env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
  }
});

module.exports = sequelize;
EOL

# Crear el archivo config/backblaze.js
cat > /app/api/config/backblaze.js << 'EOL'
const AWS = require('aws-sdk');

// Definir el nombre del bucket
const BUCKET_NAME = process.env.B2_BUCKET_NAME || 'pistas';

// Extraer credenciales correctas del B2_APPLICATION_KEY si existe
let accessKeyId, secretAccessKey;
if (process.env.B2_APPLICATION_KEY && process.env.B2_APPLICATION_KEY.includes(':')) {
  // Si tenemos el formato completo "keyID:applicationKey"
  const parts = process.env.B2_APPLICATION_KEY.split(':');
  accessKeyId = parts[0];
  secretAccessKey = parts[1];
  console.log('Usando credenciales desde B2_APPLICATION_KEY');
} else {
  // Si no, usar las claves individuales
  accessKeyId = process.env.B2_ACCESS_KEY;
  secretAccessKey = process.env.B2_SECRET_KEY;
  console.log('Usando credenciales desde B2_ACCESS_KEY y B2_SECRET_KEY');
}

// Verificar que tenemos lo necesario
if (!accessKeyId || !secretAccessKey) {
  console.error('ERROR: No se pudieron determinar las credenciales de B2');
}

if (!process.env.B2_ENDPOINT) {
  console.error('ERROR: Falta el endpoint de B2');
}

// Mostrar información de configuración (ocultando datos sensibles)
console.log('Configuración de Backblaze B2:');
console.log(`- Bucket: ${BUCKET_NAME}`);
console.log(`- Endpoint: ${process.env.B2_ENDPOINT}`);
console.log(`- Region: ${process.env.B2_REGION || 'us-east-005'}`);
console.log(`- Access Key: ${accessKeyId ? '****' + accessKeyId.slice(-4) : 'No definido'}`);

// Configuración mejorada para B2
const s3 = new AWS.S3({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  endpoint: process.env.B2_ENDPOINT,
  s3ForcePathStyle: true, // Requerido para B2
  signatureVersion: 'v4',
  region: process.env.B2_REGION || 'us-east-005', // B2 usa 'us-east-005' por defecto
  // Timeouts más largos
  httpOptions: {
    timeout: 30000, // 30 segundos
    connectTimeout: 10000 // 10 segundos para conexión
  }
});

// Función para generar URL pública
const getPublicUrl = (key) => {
  return `https://${process.env.B2_ENDPOINT}/${BUCKET_NAME}/${encodeURIComponent(key)}`;
};

// Función para probar la conexión al bucket
const testConnection = () => {
  return new Promise((resolve, reject) => {
    s3.listObjects({ Bucket: BUCKET_NAME, MaxKeys: 1 }, (err, data) => {
      if (err) {
        console.error('Error al conectar con Backblaze B2:', err);
        reject(err);
      } else {
        console.log('Conexión a Backblaze B2 exitosa');
        resolve(data);
      }
    });
  });
};

// Ejecutar prueba de conexión inmediatamente
testConnection().catch(err => {
  console.error('No se pudo conectar con el bucket. Verifica tus credenciales y configuración');
});

module.exports = {
  s3,
  BUCKET_NAME,
  getPublicUrl,
  testConnection
};
EOL

# Crear el archivo track.js
cat > /app/api/models/track.js << 'EOL'
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Track = sequelize.define('Track', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  duration: {
    type: DataTypes.INTEGER, // Duración en segundos
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER, // Tamaño en bytes
    allowNull: true
  },
  b2FileId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  b2FileUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plays: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  indexes: [
    {
      name: 'tracks_title_idx',
      fields: ['title']
    }
  ]
});

module.exports = Track;
EOL

# Crear el archivo models/index.js
cat > /app/api/models/index.js << 'EOL'
const sequelize = require('../config/database');
const Track = require('./track');

// Exportar modelos y conexión
module.exports = {
  sequelize,
  Track
};
EOL

# Crear archivo routes/health.js
cat > /app/api/routes/health.js << 'EOL'
const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint para Railway
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'API Solo Chiveros operativa',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    trackStats: {
      totalTracks: 4000,
      pageSize: 50,
      totalPages: 80
    }
  });
});

module.exports = router;
EOL

# Crear archivo routes/tracks.js
cat > /app/api/routes/tracks.js << 'EOL'
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
    await track.increment('plays');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementando plays:', error);
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
      let baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 8081}`;
      
      // Asegurar que baseUrl no termina con barra para evitar doble barra en la URL final
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
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
      console.log(`- Ambiente: ${process.env.NODE_ENV || 'development'}`);

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
      
      // Verificar si la URL generada tiene https en producción
      let finalUrl = url;
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Forzar HTTPS en producción si la URL es HTTP
      if (isProduction && finalUrl.startsWith('http:')) {
        finalUrl = finalUrl.replace('http:', 'https:');
        console.log('URL convertida a HTTPS para ambiente de producción');
      }
      
      console.log(`URL firmada final: ${finalUrl.substring(0, 100)}...`);
      
      // Redirigir directamente a la URL firmada - esto evita problemas de proxy
      return res.redirect(finalUrl);
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
EOL

# Duplicar todos los archivos en la raíz del proyecto
echo "Duplicando archivos en la raíz del proyecto..."
cp /app/api/utils/validateEnv.js /app/utils/
cp /app/api/utils/logger.js /app/utils/
cp /app/api/utils/errorHandler.js /app/utils/ 2>/dev/null || true
cp /app/api/middlewares/rateLimiter.js /app/middlewares/
cp /app/api/middlewares/securityHeaders.js /app/middlewares/
cp /app/api/middlewares/requestLogger.js /app/middlewares/
cp /app/api/config/database.js /app/config/ 2>/dev/null || true
cp /app/api/config/backblaze.js /app/config/ 2>/dev/null || true
cp -R /app/api/models/* /app/models/ 2>/dev/null || true
cp -R /app/api/routes/* /app/routes/ 2>/dev/null || true

# Crear archivo errorHandler.js directamente en la raíz si no existe
cat > /app/utils/errorHandler.js << 'EOL'
/**
 * Configura manejadores de errores globales para la aplicación
 */

const logger = require('./logger');

function setupErrorHandlers(options = {}) {
  const { exitOnUncaught = true } = options;

  // Manejar errores no capturados en promesas
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesa rechazada no manejada:', {
      reason,
      stack: reason.stack || 'No stack trace disponible',
      promise
    });
    // No terminar el proceso para que la aplicación pueda continuar
  });

  // Manejar excepciones no capturadas
  process.on('uncaughtException', (error) => {
    logger.error('Excepción no capturada:', {
      error: error.message,
      stack: error.stack || 'No stack trace disponible'
    });

    if (exitOnUncaught) {
      logger.error('Cerrando la aplicación por error crítico');
      // Dar tiempo para registrar el error antes de salir
      setTimeout(() => process.exit(1), 1000);
    }
  });

  // Middleware para manejar errores en Express
  return function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    
    logger.error(`Error en ruta ${req.method} ${req.path}:`, {
      error: err.message,
      stack: err.stack || 'No stack trace disponible',
      statusCode
    });

    res.status(statusCode).json({
      error: true,
      message: process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : err.message
    });
  };
}

module.exports = setupErrorHandlers;
EOL

# Mostrar los archivos creados
echo "Archivos creados:"
ls -la /app/utils/
ls -la /app/middlewares/
cat /app/utils/validateEnv.js | head -5
cat /app/utils/logger.js | head -5
