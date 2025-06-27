const B2 = require('backblaze-b2');

// Configuración de Backblaze B2
const b2 = new B2({
  applicationKeyId: process.env.B2_ACCESS_KEY,
  applicationKey: process.env.B2_SECRET_KEY
});

// Configuración del bucket
const bucketName = process.env.B2_BUCKET_NAME;
let bucketId = process.env.B2_BUCKET_ID;

/**
 * Inicializa la conexión con Backblaze B2
 * @returns {Promise<Object>} Instancia autorizada de B2
 */
const initializeB2 = async () => {
  try {
    await b2.authorize();
    console.log('Conexión con Backblaze B2 establecida correctamente');
    return b2;
  } catch (error) {
    console.error('Error al conectar con Backblaze B2:', error);
    throw error;
  }
};

/**
 * Obtiene el ID del bucket si no está establecido
 * @returns {Promise<String>} ID del bucket
 */
const getBucketId = async () => {
  if (bucketId) return bucketId;

  try {
    const b2Instance = await initializeB2();
    const response = await b2Instance.listBuckets();
    
    const bucket = response.data.buckets.find(
      b => b.bucketName === bucketName
    );
    
    if (!bucket) {
      throw new Error(`No se encontró el bucket con nombre: ${bucketName}`);
    }
    
    bucketId = bucket.bucketId;
    return bucketId;
  } catch (error) {
    console.error('Error al obtener el ID del bucket:', error);
    throw error;
  }
};

module.exports = {
  initializeB2,
  getBucketId,
  bucketName
};
