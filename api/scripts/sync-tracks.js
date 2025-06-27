const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

// Obtener la URL de la base de datos desde .env
const DATABASE_URL = process.env.DATABASE_URL;
console.log('Usando URL de conexión a base de datos:', DATABASE_URL);

// Procesar DATABASE_URL para configuración de conexión
let dbConfig;

if (DATABASE_URL) {
  // Si tenemos una URL completa, extraer las partes
  try {
    // Formato esperado: mysql://username:password@hostname:port/database
    const matches = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.*)/i);
    
    if (matches && matches.length >= 6) {
      const [, user, password, host, port, database] = matches;
      
      dbConfig = {
        host,
        user,
        password,
        database,
        port: port || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };
      
      console.log(`Configuración de BD extraida: host=${host}, database=${database}, user=${user}`);
    } else {
      throw new Error('Formato de DATABASE_URL incorrecto');
    }
  } catch (error) {
    console.error('Error procesando DATABASE_URL:', error.message);
    process.exit(1);
  }
} else {
  // Configuración alternativa si no hay DATABASE_URL
  dbConfig = {
    host: process.env.DB_HOST || 'srv1847.hstgr.io',
    user: 'u487652187_usuario',
    password: 'Yokarique123',
    database: process.env.DB_NAME || 'u487652187_web_pistas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

// Configuración de Backblaze B2
const s3Config = {
  endpoint: process.env.B2_ENDPOINT,
  accessKeyId: process.env.B2_ACCESS_KEY,
  secretAccessKey: process.env.B2_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: process.env.B2_REGION
};

const bucketName = process.env.B2_BUCKET_NAME;
let dbConnection;
let s3Client;

// Función para obtener el nombre sin extensión
function getFileNameWithoutExtension(fileName) {
  if (!fileName) return '';
  
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName;
  
  return fileName.substring(0, lastDotIndex);
}

// Función para actualizar el estado de sincronización
async function updateSyncStatus(status, totalFiles = 0) {
  try {
    await dbConnection.execute(
      'UPDATE sync_status SET status = ?, last_sync = NOW(), total_files = ? WHERE id = 1',
      [status, totalFiles]
    );
    console.log(`Estado de sincronización actualizado a: ${status}`);
  } catch (error) {
    console.error('Error actualizando estado de sincronización:', error);
  }
}

// Función principal de sincronización
async function syncTracks() {
  console.log('Iniciando sincronización de pistas con Backblaze B2...');
  
  try {
    // Conectar a la base de datos
    dbConnection = await mysql.createConnection(dbConfig);
    console.log('Conexión a MySQL establecida');
    
    // Actualizar estado
    await updateSyncStatus('running');
    
    // Inicializar cliente S3
    s3Client = new AWS.S3(s3Config);
    
    // Listar todos los archivos de Backblaze B2
    console.log(`Obteniendo archivos del bucket: ${bucketName}`);
    
    const allFiles = [];
    let continuationToken = null;
    let page = 0;
    const maxFiles = 100000; // Límite de seguridad
    
    // Listar archivos con paginación
    do {
      page++;
      console.log(`Obteniendo página ${page} de archivos...`);
      
      const listParams = {
        Bucket: bucketName,
        MaxKeys: 1000
      };
      
      if (continuationToken) {
        listParams.ContinuationToken = continuationToken;
      }
      
      const response = await s3Client.listObjectsV2(listParams).promise();
      
      // Filtrar solo archivos MP3
      const mp3Files = response.Contents.filter(file => 
        file.Key.toLowerCase().endsWith('.mp3')
      );
      
      allFiles.push(...mp3Files);
      continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
      
      console.log(`Encontrados ${mp3Files.length} archivos MP3 en esta página`);
      
    } while (continuationToken && allFiles.length < maxFiles);
    
    console.log(`Total de archivos MP3 encontrados: ${allFiles.length}`);
    
    // Insertar o actualizar archivos en la base de datos
    let processed = 0;
    const batchSize = 1000; // Procesar 1000 archivos a la vez para mayor velocidad
    
    // Procesar en lotes para no sobrecargar la base de datos
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        try {
          const encodedKey = encodeURIComponent(file.Key);
          const fileName = file.Key;
          const name = getFileNameWithoutExtension(fileName);
          const size = file.Size;
          const uploadTimestamp = new Date(file.LastModified).getTime();
          const duration = Math.floor(size / (128 * 1024) * 60); // Estimación basada en 128kbps
          
          // Generar URL para el archivo
          const b2FileUrl = `https://${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}/${encodeURIComponent(fileName)}`;
          
          // Insertar o actualizar en la base de datos utilizando los nombres de columnas correctos
          await dbConnection.execute(
            `INSERT INTO Tracks 
            (b2FileId, filename, title, fileSize, duration, b2FileUrl, plays, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW()) 
            ON DUPLICATE KEY UPDATE 
            filename = VALUES(filename),
            title = VALUES(title),
            fileSize = VALUES(fileSize),
            duration = VALUES(duration),
            b2FileUrl = VALUES(b2FileUrl),
            updatedAt = NOW()`,
            [
              encodedKey,  // b2FileId
              fileName,    // filename
              name,        // title
              size,        // fileSize
              duration,    // duration
              b2FileUrl     // b2FileUrl
            ]
          );
          
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`Procesados ${processed} de ${allFiles.length} archivos...`);
          }
        } catch (error) {
          console.error(`Error procesando archivo ${file.Key}:`, error);
        }
      }));
    }
    
    // Actualizar estado final
    await updateSyncStatus('completed', allFiles.length);
    console.log(`Sincronización completada. ${processed} archivos procesados.`);
  } catch (error) {
    console.error('Error en la sincronización:', error);
    if (dbConnection) {
      await updateSyncStatus('failed');
    }
  } finally {
    // Cerrar conexión
    if (dbConnection) {
      await dbConnection.end();
      console.log('Conexión a MySQL cerrada');
    }
  }
}

// Ejecutar sincronización
syncTracks().catch(console.error);
