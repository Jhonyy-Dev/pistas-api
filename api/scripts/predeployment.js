/**
 * Script predeployment para verificar que todo esté configurado correctamente
 * Ejecutar antes de desplegar a Railway
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Iniciando verificaciones pre-deployment...');

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'B2_BUCKET_NAME',
  'B2_ENDPOINT',
  'B2_REGION'
];

// Variables con alternativas (cualquiera de las opciones es válida)
const alternativeVars = {
  'B2_CREDENCIALES': ['B2_APPLICATION_KEY', 'B2_ACCESS_KEY']
};

// Verificar variables requeridas
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Verificar variables alternativas
const missingAltVars = Object.entries(alternativeVars).filter(([group, vars]) => {
  return !vars.some(varName => process.env[varName]);
}).map(([group]) => group);

// Comprobar si hay variables faltantes (obligatorias o alternativas)
let hasError = false;

if (missingVars.length > 0) {
  console.error('❌ Error: Faltan variables de entorno requeridas:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  hasError = true;
}

if (missingAltVars.length > 0) {
  console.error('❌ Error: Faltan variables de entorno alternativas:');
  missingAltVars.forEach(group => {
    const options = alternativeVars[group].join(' o ');
    console.error(`   - Se requiere al menos una de estas opciones: ${options}`);
  });
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

console.log('✅ Variables de entorno verificadas');

// Verificar archivos de configuración
const requiredFiles = [
  '../config/database.js',
  '../config/backblaze.js',
  '../middlewares/rateLimiter.js',
  '../middlewares/securityHeaders.js',
  '../middlewares/requestLogger.js',
  '../utils/logger.js',
  '../utils/errorHandler.js',
  '../utils/validateEnv.js',
  '../routes/health.js',
  '../routes/tracks.js',
  '../index.js'
];

const missingFiles = requiredFiles.filter(file => {
  try {
    fs.accessSync(path.join(__dirname, file));
    return false;
  } catch (error) {
    return true;
  }
});

if (missingFiles.length > 0) {
  console.error('❌ Error: Faltan archivos de configuración requeridos:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

console.log('✅ Archivos de configuración verificados');

// Verificar configuración de Railway
const railwayConfigPath = path.join(__dirname, '../railway.toml');

try {
  const railwayConfig = fs.readFileSync(railwayConfigPath, 'utf8');
  
  // Verificar configuraciones críticas
  if (!railwayConfig.includes('healthcheckPath')) {
    console.error('⚠️ Advertencia: Falta configuración healthcheckPath en railway.toml');
  } else {
    console.log('✅ Configuración de healthcheck verificada');
  }
  
  if (!railwayConfig.includes('NODE_ENV = "production"')) {
    console.error('⚠️ Advertencia: NODE_ENV no está configurado como "production" en railway.toml');
  } else {
    console.log('✅ NODE_ENV configurado correctamente para producción');
  }
} catch (error) {
  console.error('❌ Error: No se pudo leer la configuración de Railway');
  process.exit(1);
}

// Verificar dependencias críticas en package.json
try {
  const packageJson = require('../package.json');
  
  const criticalDeps = ['compression', 'cors', 'express', 'dotenv'];
  const missingDeps = criticalDeps.filter(dep => !Object.keys(packageJson.dependencies).includes(dep));
  
  if (missingDeps.length > 0) {
    console.error('❌ Error: Faltan dependencias críticas en package.json:');
    missingDeps.forEach(dep => console.error(`   - ${dep}`));
    process.exit(1);
  }
  
  console.log('✅ Dependencias críticas verificadas');
} catch (error) {
  console.error('❌ Error: No se pudo leer package.json', error);
  process.exit(1);
}

console.log('\n✨ ¡Todas las verificaciones pre-deployment completadas con éxito! ✨');
console.log('La API está lista para ser desplegada en Railway.');
