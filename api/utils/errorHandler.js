/**
 * Sistema centralizado de manejo de errores no capturados
 * Previene que la API se caiga por errores inesperados y facilita el diagnóstico
 */

const logger = require('./logger');

/**
 * Configura manejadores para diferentes tipos de errores no capturados
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.exitOnUncaught - Si debe terminar el proceso en errores no capturados
 */
function setupErrorHandlers(options = { exitOnUncaught: false }) {
  // Capturar excepciones no controladas
  process.on('uncaughtException', (error) => {
    logger.error('ERROR NO CAPTURADO', { error: error.message, stack: error.stack });
    
    if (options.exitOnUncaught) {
      logger.error('El servidor se cerrará debido a un error no capturado');
      // Dar tiempo para que los logs se escriban antes de cerrar
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });

  // Capturar rechazos de promesas no manejados
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('PROMESA RECHAZADA NO MANEJADA', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : 'No disponible'
    });
  });

  // Capturar señales de terminación para cierre limpio
  process.on('SIGTERM', gracefulShutdown('SIGTERM'));
  process.on('SIGINT', gracefulShutdown('SIGINT'));

  return {
    handleError(err, req, res, next) {
      // Si ya se ha enviado la cabecera, delega en el manejador de Express
      if (res.headersSent) {
        return next(err);
      }

      // Log del error
      logger.error(`Error en ruta ${req.method} ${req.path}`, {
        error: err.message,
        stack: err.stack,
        user: req.user ? req.user.id : 'no autenticado',
        body: req.body,
        params: req.params,
        query: req.query
      });

      // Determina si mostrar información detallada del error
      const isProd = process.env.NODE_ENV === 'production';
      
      // Envía respuesta de error al cliente
      res.status(err.statusCode || 500).json({
        error: true,
        code: err.code || 'SERVER_ERROR',
        message: isProd ? 'Error interno del servidor' : err.message,
        ...(isProd ? {} : { stack: err.stack }),
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Función para apagado controlado
function gracefulShutdown(signal) {
  return () => {
    logger.info(`Recibida señal ${signal}, iniciando apagado controlado`);
    
    // Aquí podrías cerrar conexiones de base de datos, limpiar recursos, etc.
    logger.info('Cerrando conexiones y recursos');
    
    // Railway espera que el contenedor se cierre rápidamente
    setTimeout(() => {
      logger.info('Apagado completado, cerrando proceso');
      process.exit(0);
    }, 500);
  };
}

module.exports = setupErrorHandlers;
