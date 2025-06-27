/**
 * Middleware para configurar cabeceras de seguridad HTTP
 * Añade protecciones recomendadas para aplicaciones en producción
 */

function securityHeaders(req, res, next) {
  // Evitar que el navegador detecte automáticamente MIME types
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Ayuda a proteger contra ataques XSS al filtrar responsabilidades
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Impedir que la página aparezca en un iframe (protege contra clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Forzar conexiones HTTPS por al menos 1 año (31536000 segundos) en producción
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Deshabilitar la característica DNS prefetching (opcional)
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Establecer política de referrer para mejorar la privacidad
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Eliminar la cabecera X-Powered-By (que revela Node.js)
  res.removeHeader('X-Powered-By');
  
  next();
}

module.exports = securityHeaders;
