require('dotenv').config();
const validateEnv = require('./utils/validateEnv');
const logger = require('./utils/logger');
const rateLimiter = require('./middlewares/rateLimiter');
const compression = require('compression');
const securityHeaders = require('./middlewares/securityHeaders');
const requestLogger = require('./middlewares/requestLogger');
const setupErrorHandlers = require('./utils/errorHandler');

// Validar variables de entorno al iniciar
validateEnv();

// Configurar manejadores de errores globales
const errorHandler = setupErrorHandlers({ 
  exitOnUncaught: process.env.NODE_ENV === 'production' 
});
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const tracksRoutes = require('./routes/tracks');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
// Registrar detalles de cada petición
app.use(requestLogger);
// Compresión para mejorar rendimiento en producción
app.use(compression());
// Aplicar cabeceras de seguridad
app.use(securityHeaders);
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Aplicar rate limiting en producción
if (process.env.NODE_ENV === 'production') {
  logger.info('Rate limiting activado para protección en producción');
  app.use(rateLimiter);
}

// Ruta principal - Health check
app.get('/', (req, res) => {
  res.json({
    message: 'API de PISTAS_CHIVERAS funcionando correctamente',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/health', healthRoutes);
app.use('/api/tracks', tracksRoutes);

// Manejo de errores centralizado usando nuestro manejador avanzado
app.use(errorHandler.handleError);

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida con éxito.');

    // Sincronizar modelos (en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
      console.log('Modelos sincronizados con la base de datos.');
    }

    app.listen(PORT, () => {
      logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
      logger.info(`Ambiente: ${process.env.NODE_ENV}`);
      logger.info(`Origen CORS permitido: ${process.env.CORS_ORIGIN}`);
    });
  } catch (error) {
    logger.error('No se pudo iniciar el servidor:', { error });
    process.exit(1);
  }
};

startServer();
