/**
 * Sistema de registro (logging) para el entorno de producción
 * Proporciona un registro mejorado con niveles de severidad, timestamps y formato consistente
 */

const isProd = process.env.NODE_ENV === 'production';

// Colores para consola en desarrollo
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const formatMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
  const logObject = {
    timestamp,
    level,
    message: formattedMessage,
    ...(data ? { data } : {})
  };

  // En producción, formato JSON para posible integración con herramientas de log
  if (isProd) {
    return JSON.stringify(logObject);
  }

  // En desarrollo, formato con colores para mejor legibilidad
  const color = level === 'error' ? colors.red : 
                level === 'warn' ? colors.yellow : 
                level === 'info' ? colors.green : 
                level === 'debug' ? colors.blue : colors.reset;

  return `${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset}: ${formattedMessage}${
    data ? `\n${JSON.stringify(data, null, 2)}` : ''
  }`;
};

const logger = {
  error: (message, data = null) => {
    console.error(formatMessage('error', message, data));
  },
  warn: (message, data = null) => {
    console.warn(formatMessage('warn', message, data));
  },
  info: (message, data = null) => {
    console.info(formatMessage('info', message, data));
  },
  debug: (message, data = null) => {
    // Solo mostrar logs de debug en desarrollo
    if (!isProd) {
      console.debug(formatMessage('debug', message, data));
    }
  }
};

module.exports = logger;
