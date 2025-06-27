#!/bin/bash

# Crear directorios necesarios en ambas ubicaciones
mkdir -p /app/api/utils
mkdir -p /app/api/middlewares
mkdir -p /app/utils
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

# Duplicar todos los archivos en la raíz del proyecto
echo "Duplicando archivos en la raíz del proyecto..."
cp /app/api/utils/validateEnv.js /app/utils/
cp /app/api/utils/logger.js /app/utils/
cp /app/api/utils/errorHandler.js /app/utils/ 2>/dev/null || true
cp /app/api/middlewares/rateLimiter.js /app/middlewares/
cp /app/api/middlewares/securityHeaders.js /app/middlewares/
cp /app/api/middlewares/requestLogger.js /app/middlewares/

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
