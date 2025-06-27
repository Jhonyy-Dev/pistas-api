/**
 * Middleware para configurar cabeceras de seguridad HTTP
 * Añade protecciones recomendadas para aplicaciones en producción
 */

function securityHeaders(req, res, next) {
  // Evitar que el navegador detecte automáticamente MIME types
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Ayuda a proteger contra ataques XSS al filtrar responsabilidades
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Permitir que la API sea embebida en iframes desde el frontend
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // IMPORTANTE: Configuraciones para permitir contenido mixto (HTTP en HTTPS)
  // Estas cabeceras son cruciales para permitir que el reproductor funcione
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none'); // Permite cargar recursos sin CORP
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none'); // Evita problemas de aislamiento
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Permite recursos cross-origin
  
  // Configuraciones específicas para streaming de audio
  if (req.path && (req.path.includes('/stream') || req.path.includes('/direct-stream'))) {
    // Para rutas de streaming, configuramos cabeceras adicionales
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permitir acceso desde cualquier origen
    
    // No forzamos HTTPS para las rutas de streaming
  } else if (process.env.NODE_ENV === 'production') {
    // Para otras rutas, mantenemos la seguridad en producción
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Establecer política de referrer para mejorar la privacidad pero permitir contenido cross-origin
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  
  // Eliminar la cabecera X-Powered-By (que revela Node.js)
  res.removeHeader('X-Powered-By');
  
  next();
}

module.exports = securityHeaders;
