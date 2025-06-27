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
