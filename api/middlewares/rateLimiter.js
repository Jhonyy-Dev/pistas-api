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
