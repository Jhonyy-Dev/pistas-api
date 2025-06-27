/**
 * Validación de variables de entorno necesarias para la ejecución en producción
 * Este archivo se ejecuta al inicio para verificar que todas las variables críticas estén configuradas
 */

function validateEnv() {
  const requiredVars = [
    'DATABASE_URL',
    'PORT',
    'NODE_ENV',
    'CORS_ORIGIN',
    'B2_APPLICATION_KEY',
    'B2_BUCKET_NAME',
    'B2_ENDPOINT',
    'B2_REGION'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Error: Faltan las siguientes variables de entorno: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ Todas las variables de entorno requeridas están presentes');
  
  // Validaciones adicionales específicas
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CORS_ORIGIN.startsWith('https://')) {
      console.warn('⚠️ Advertencia: En producción, CORS_ORIGIN debería usar HTTPS para mayor seguridad');
    }
  }
}

module.exports = validateEnv;
