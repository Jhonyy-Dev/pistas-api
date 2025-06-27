const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const db = require('./db.service');
dotenv.config();

// Deshabilitar verificación de SSL para fines de prueba si es necesario
// AWS.config.update({ httpOptions: { agent: new (require('https').Agent)({ rejectUnauthorized: false }) } });

class TracksService {
  // Variable estática para controlar si ya se ha inicializado
  static initialized = false;
  
  constructor() {
    // Asegurar que el endpoint comience con https://
    let endpoint = process.env.B2_ENDPOINT || '';
    if (endpoint && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = `https://${endpoint}`;
      console.log(`Endpoint actualizado con https://: ${endpoint}`);
    }
    
    // Validar variables de entorno críticas
    if (!process.env.B2_ACCESS_KEY || !process.env.B2_SECRET_KEY) {
      console.error('CREDENCIALES B2 NO DISPONIBLES');
    }
    
    // Configuración optimizada para Backblaze B2
    const config = {
      endpoint: endpoint,
      accessKeyId: process.env.B2_ACCESS_KEY,
      secretAccessKey: process.env.B2_SECRET_KEY,
      s3ForcePathStyle: true, // Necesario para Backblaze B2
      signatureVersion: 'v4',
      httpOptions: { timeout: 10000 } // 10 segundos de timeout
    };
    
    // Agregar región solo si está definida
    if (process.env.B2_REGION) {
      config.region = process.env.B2_REGION;
    }
    
    // Crear cliente S3
    this.s3 = new AWS.S3(config);
    this.bucketName = process.env.B2_BUCKET_NAME;
  }
  
  /**
   * Verifica la conexión con Backblaze B2
   */
  async init() {
    try {
      // Verificar si todas las variables de entorno están presentes
      if (!process.env.B2_ACCESS_KEY || !process.env.B2_SECRET_KEY || !process.env.B2_BUCKET_NAME || !process.env.B2_ENDPOINT || !process.env.B2_REGION) {
        console.error('CONFIGURACIÓN INCOMPLETA: Falta alguna variable de entorno para B2.');
        console.error(`B2_ACCESS_KEY: ${process.env.B2_ACCESS_KEY ? 'Presente' : 'Ausente'}`);
        console.error(`B2_SECRET_KEY: ${process.env.B2_SECRET_KEY ? 'Presente' : 'Ausente'}`);
        console.error(`B2_BUCKET_NAME: ${process.env.B2_BUCKET_NAME ? 'Presente' : 'Ausente'}`);
        console.error(`B2_ENDPOINT: ${process.env.B2_ENDPOINT ? 'Presente' : 'Ausente'}`);
        console.error(`B2_REGION: ${process.env.B2_REGION ? 'Presente' : 'Ausente'}`);
        throw new Error('Configuración de Backblaze B2 incompleta');
      }
    
      // Obtener el endpoint actual configurado en el cliente S3
      const currentEndpoint = this.s3.endpoint.href || 'no disponible';
      
      // Mostrar configuración para depuración (sin mostrar claves completas)
      const accessKeyPreview = process.env.B2_ACCESS_KEY ? 
        `${process.env.B2_ACCESS_KEY.substring(0, 4)}...${process.env.B2_ACCESS_KEY.substring(process.env.B2_ACCESS_KEY.length - 4)}` : 'no definido';
      const secretKeyPreview = process.env.B2_SECRET_KEY ? 
        `${process.env.B2_SECRET_KEY.substring(0, 4)}...` : 'no definido';
      
      console.log(`Configuración B2 para conexión:`);
      console.log(`- Endpoint en .env: ${process.env.B2_ENDPOINT}`);
      console.log(`- Endpoint usado: ${currentEndpoint}`);
      console.log(`- Bucket: ${this.bucketName}`);
      console.log(`- Region: ${process.env.B2_REGION}`);
      console.log(`- AccessKey: ${accessKeyPreview}`);
      console.log(`- SecretKey: ${secretKeyPreview}`);
      
      // Verificar si podemos acceder al bucket para confirmar que la conexión funciona
      console.log('Intentando verificar acceso al bucket...');
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log('ÉXITO: Conexión con Backblaze B2 establecida correctamente');
    } catch (error) {
      console.error('ERROR DE CONEXIÓN: No se pudo conectar con Backblaze B2');
      
      if (error.code === 'NoSuchBucket') {
        console.error(`ERROR: El bucket '${this.bucketName}' no existe en tu cuenta de B2.`);
        console.error('SOLUCIÓN: Verifica el nombre exacto del bucket en tu dashboard de Backblaze.');
      } else if (error.code === 'InvalidAccessKeyId') {
        console.error('ERROR: ID de clave de acceso inválida.');
        console.error('SOLUCIÓN: Verifica que tu B2_ACCESS_KEY sea correcta en el archivo .env');
      } else if (error.code === 'SignatureDoesNotMatch') {
        console.error('ERROR: La firma no coincide. Clave secreta incorrecta.');
        console.error('SOLUCIÓN: Verifica que tu B2_SECRET_KEY sea correcta en el archivo .env');
      } else if (error.code === 'NetworkingError') {
        console.error(`ERROR: Problema de red al conectar con ${process.env.B2_ENDPOINT}`);
        console.error('SOLUCIÓN: Verifica tu conexión a internet y que el endpoint sea correcto');
      } else if (error.code === 'Forbidden') {
        console.error('ERROR: Acceso denegado (403 Forbidden).');
        console.error('SOLUCIONES:');
        console.error('1. Verifica que las credenciales (ApplicationKey y ApplicationID) sean correctas');
        console.error('2. Asegúrate de que tu clave tenga permisos para el bucket especificado');
        console.error('3. Si creaste recientemente las credenciales, puede haber un retraso de propagación');
      }
      
      console.error('Error completo:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de archivos (pistas) del bucket de Backblaze B2 o de la base de datos MySQL
   * @param {Object} options Opciones de paginación y búsqueda
   * @param {Number} options.page - Número de página (empezando en 1)
   * @param {Number} options.limit - Número de elementos por página
   * @param {String} options.search - Término opcional de búsqueda
   * @returns {Promise<Array>} Lista de archivos
   */
  async getTracks(options = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    console.log(`Solicitud recibida: page=${page}, limit=${limit}, search=${search}`);
    
    try {
      // Verificar conexión con Backblaze B2 solo la primera vez
      if (!TracksService.initialized) {
        await this.init();
        TracksService.initialized = true;
      }
      
      // Si hay término de búsqueda, usamos la base de datos (búsqueda avanzada)
      if (search && search.trim().length > 0) {
        console.log('Realizando búsqueda avanzada en la base de datos MySQL');
        
        const searchTerm = search.trim();
        const offset = (page - 1) * limit;
        
        // Preparar términos de búsqueda para SQL LIKE y MATCH AGAINST
        const likePattern = `%${searchTerm.replace(/ /g, '%')}%`;
        const matchTerms = searchTerm.split(' ').filter(term => term.length > 2).join('* ');
        const matchExpression = matchTerms ? `${matchTerms}*` : searchTerm;
        
        // Consulta SQL optimizada con búsqueda de texto completo y LIKE como respaldo
        // Nota: MATCH AGAINST con IN BOOLEAN MODE permite búsqueda parcial con comodines
        let query = `
          SELECT SQL_CALC_FOUND_ROWS 
            id, file_id as fileId, file_name as fileName, name, 
            size, duration, type, upload_timestamp as uploadTimestamp, plays
          FROM tracks 
          WHERE 1=1 
        `;
        
        const params = [];
        
        // Solo agregamos condiciones de búsqueda si tenemos un término válido
        if (searchTerm.length > 0) {
          // Primero priorizamos coincidencias exactas
          if (searchTerm.length >= 3) {
            query += `
              AND (
                MATCH(file_name) AGAINST(? IN BOOLEAN MODE) OR 
                MATCH(name) AGAINST(? IN BOOLEAN MODE) OR
                file_name LIKE ? OR
                name LIKE ?
              )
            `;
            params.push(matchExpression, matchExpression, likePattern, likePattern);
          } else {
            // Para términos muy cortos, usamos solo LIKE
            query += ` AND (file_name LIKE ? OR name LIKE ?) `;
            params.push(likePattern, likePattern);
          }
        }
        
        // Ordenamiento: priorizamos coincidencias exactas en el nombre
        query += `
          ORDER BY 
            CASE 
              WHEN file_name = ? THEN 0
              WHEN file_name LIKE ? THEN 1
              ELSE 2 
            END,
            plays DESC,
            upload_timestamp DESC
        `;
        params.push(searchTerm, `%${searchTerm}%`);
        
        // Agregar paginación
        query += ` LIMIT ? OFFSET ? `;
        params.push(limit, offset);
        
        // Ejecutar la consulta
        const tracks = await db.query(query, params);
        
        // Obtener el total de registros para la paginación
        const [totalResult] = await db.query('SELECT FOUND_ROWS() as total');
        const total = totalResult.total || 0;
        
        // Mapear resultados al formato esperado por el frontend
        const formattedTracks = tracks.map(track => ({
          id: track.fileId,
          name: track.name,
          fileName: track.fileName,
          size: parseInt(track.size) || 0,
          type: track.type || 'audio/mpeg',
          uploadTimestamp: track.uploadTimestamp || Date.now(),
          duration: parseInt(track.duration) || 0,
          plays: parseInt(track.plays) || 0
        }));
        
        return {
          tracks: formattedTracks,
          nextFileName: null, // No aplica en búsqueda de base de datos
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            currentCount: tracks.length,
            totalItems: total,
            itemsPerPage: limit,
            hasMore: offset + tracks.length < total
          }
        };
      }
      
      // Si no hay término de búsqueda o la base de datos falla, usamos el método original de Backblaze
      console.log('Usando listado de archivos desde Backblaze B2');
      
      const listParams = {
        Bucket: this.bucketName,
        MaxKeys: limit,
        Prefix: search // Opcional: filtrar por prefijo
      };

      // Implementar paginación simple
      if (page > 1) {
        // Para la paginación en S3, necesitamos cargar la página anterior para obtener la última clave
        try {
          const prevListParams = {
            Bucket: this.bucketName,
            MaxKeys: (page - 1) * limit,
            Prefix: search
          };
          
          const prevResponse = await this.s3.listObjectsV2(prevListParams).promise();
          if (prevResponse.Contents && prevResponse.Contents.length > 0) {
            // Usar el último elemento como punto de partida
            listParams.StartAfter = prevResponse.Contents[prevResponse.Contents.length - 1].Key;
          }
        } catch (error) {
          console.error('Error al obtener la página anterior para paginación:', error);
          // En caso de error, continuamos sin StartAfter
        }
      }

      const response = await this.s3.listObjectsV2(listParams).promise();
      
      // Transformar los datos para el formato requerido por el frontend
      const tracks = response.Contents.map(file => {
        return {
          id: encodeURIComponent(file.Key), // Usamos Key como ID
          name: this.getFileNameWithoutExtension(file.Key),
          fileName: file.Key,
          size: file.Size,
          // En S3/B2 con AWS SDK no recibimos el tipo de contenido en listObjects
          // así que lo inferimos por la extensión
          type: file.Key.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream',
          uploadTimestamp: file.LastModified.getTime(),
          // Estimamos duración basada en el tamaño del archivo
          // MP3 a 128kbps: ~1 MB por minuto
          duration: Math.floor(file.Size / (128 * 1024) * 60),
          plays: 0 // Este dato podría venir de una base de datos
        };
      });

      // Filtrar solo archivos MP3
      const mp3Tracks = tracks.filter(track => 
        track.fileName.toLowerCase().endsWith('.mp3')
      );
      
      // Mejorar el formato de retorno para la paginación
      return {
        tracks: mp3Tracks,
        nextFileName: response.IsTruncated ? response.Contents[response.Contents.length - 1].Key : null,
        pagination: {
          currentPage: page,
          // Calculamos el número total de páginas en función de si hay una búsqueda o no
          totalPages: search 
            ? Math.max(page, response.IsTruncated ? page + 1 : page) 
            : 80, // Si no hay búsqueda, asumimos 80 páginas (4000 canciones)
          currentCount: mp3Tracks.length,
          // Si no hay búsqueda, asumimos 4000 canciones en total
          totalItems: search 
            ? (response.IsTruncated ? (page * limit) + 1000 : (page - 1) * limit + mp3Tracks.length)
            : 4000, 
          itemsPerPage: limit,
          // Siempre permitir navegar a la siguiente página si no estamos buscando
          // o si todavía hay más resultados según el API
          hasMore: !search || response.IsTruncated || page < 80
        }
      };
    } catch (error) {
      console.error('Error obteniendo pistas:', error);
      throw error;
    }
  }

  /**
   * Obtiene información detallada de una pista
   * @param {String} fileId ID (Key) del archivo en S3/B2 (URL encoded)
   * @returns {Promise<Object>} Información de la pista
   */
  async getTrackById(fileId) {
    try {
      // Verificar conexión solo si aún no se ha hecho
      if (!TracksService.initialized) {
        await this.init();
        TracksService.initialized = true;
      }
      
      // Decodificar el fileId para obtener el Key original
      const fileName = decodeURIComponent(fileId);
      
      // Obtener la información del archivo
      const response = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: fileName
      }).promise();
      
      // Obtener también el tamaño usando el objeto completo
      const sizeResponse = await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        Prefix: fileName,
        MaxKeys: 1
      }).promise();
      
      if (!response || sizeResponse.Contents.length === 0) {
        throw new Error('Archivo no encontrado');
      }
      
      // Obtener el tamaño del archivo
      const size = sizeResponse.Contents[0].Size;
      
      // Transformar a formato de pista
      const track = {
        id: fileId,
        name: this.getFileNameWithoutExtension(fileName),
        fileName: fileName,
        size: size,
        type: response.ContentType || 'audio/mpeg', // Si no se especifica, asumimos MP3
        uploadTimestamp: response.LastModified.getTime(),
        duration: Math.floor(size / (128 * 1024) * 60),
        plays: 0 // Este dato podría venir de una base de datos
      };
      
      return track;
    } catch (error) {
      console.error(`Error obteniendo la pista con ID ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Genera una URL firmada para descargar un archivo
   * @param {String} fileId ID (Key) del archivo en formato URL encoded
   * @param {String} fileName Nombre del archivo
   * @returns {Promise<String>} URL firmada para descarga
   */
  async getStreamUrl(fileId, fileName) {
    // Incrementar contador de reproducciones si existe la base de datos
    try {
      await db.incrementPlays(fileId);
    } catch (error) {
      console.log('No se pudo actualizar el contador de reproducciones:', error.message);
      // Continuamos aunque falle la actualización del contador
    }
    try {
      // Verificar conexión solo si aún no se ha hecho
      if (!TracksService.initialized) {
        await this.init();
        TracksService.initialized = true;
      }
      
      console.log(`Solicitud de URL para fileId: ${fileId}, fileName: ${fileName}`);
      
      // Decodificar el fileId para obtener el Key original si es necesario
      let key = '';
      try {
        key = decodeURIComponent(fileId);
      } catch (e) {
        console.error(`Error decodificando fileId ${fileId}:`, e);
        key = fileId; // Usar el ID sin decodificar si hay error
      }
      
      console.log(`Key a buscar en bucket: ${key}`);
      
      // Verificar que el archivo exista antes de generar la URL
      try {
        const headResponse = await this.s3.headObject({
          Bucket: this.bucketName,
          Key: key
        }).promise();
        
        console.log(`Archivo encontrado en bucket. ContentType: ${headResponse.ContentType}`);
      } catch (error) {
        console.error(`Error: El archivo ${key} no existe en el bucket:`, error);
        // Intentar buscar el archivo por nombre aproximado si el fileId no funciona
        try {
          // Listar archivos en el bucket para buscar coincidencias
          const listResponse = await this.s3.listObjectsV2({
            Bucket: this.bucketName,
            Prefix: fileName ? fileName.split(' ')[0] : '', // Buscar por la primera palabra del nombre
            MaxKeys: 10
          }).promise();
          
          if (listResponse.Contents && listResponse.Contents.length > 0) {
            // Encontrar el archivo que mejor coincida con el nombre proporcionado
            const bestMatch = listResponse.Contents.find(item => 
              item.Key.toLowerCase().includes((fileName || '').toLowerCase())
            ) || listResponse.Contents[0];
            
            key = bestMatch.Key;
            console.log(`Encontrada coincidencia alternativa: ${key}`);
          } else {
            throw new Error(`No se encontró ningún archivo que coincida con ${fileName || key}`);
          }
        } catch (listError) {
          console.error('Error buscando alternativas:', listError);
          throw new Error(`El archivo ${fileName || key} no está disponible`);  
        }
      }
      
      // Generar URL firmada con configuración optimizada para streaming de audio
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: 3600, // Tiempo en segundos (1 hora)
        ResponseContentType: 'audio/mpeg', // Asegurar que se devuelva como audio
        ResponseContentDisposition: `inline; filename="${fileName || key}"` // Forzar descarga como archivo
      };
      
      console.log('Generando URL firmada con parámetros:', JSON.stringify(params));
      const signedUrl = await this.s3.getSignedUrlPromise('getObject', params);
      
      console.log(`URL firmada generada: ${signedUrl.substring(0, 100)}...`);
      return signedUrl;
    } catch (error) {
      console.error(`Error generando URL de streaming para el archivo ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Extrae el nombre del archivo sin la extensión
   * @param {String} fileName Nombre completo del archivo
   * @returns {String} Nombre sin extensión
   */
  getFileNameWithoutExtension(fileName) {
    if (!fileName) return '';
    
    // Eliminar la extensión
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName;
    
    return fileName.substring(0, lastDotIndex);
  }
}

module.exports = new TracksService();
