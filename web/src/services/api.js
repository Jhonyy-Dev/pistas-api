import axios from 'axios';

// Crear una instancia de axios con la URL base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081',
  headers: {
    'Content-Type': 'application/json',
  },
  // Tiempo de espera para peticiones (10 segundos)
  timeout: 15000,
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejar errores comunes
    const { response } = error;
    
    if (!response) {
      console.error('Error de red o servidor no disponible - La aplicación funcionará en modo demo');
    } else {
      console.error(`Error ${response.status}: ${response.data?.message || 'Error desconocido'}`);
    }
    
    return Promise.reject(error);
  }
);

export default api;
