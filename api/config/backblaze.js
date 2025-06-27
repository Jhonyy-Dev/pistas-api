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
