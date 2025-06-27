#!/bin/bash

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

# Mostrar los archivos creados
echo "Archivos creados:"
ls -la /app/api/utils/
cat /app/api/utils/validateEnv.js | head -5
cat /app/api/utils/logger.js | head -5
