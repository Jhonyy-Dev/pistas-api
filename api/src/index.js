const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

// Importar rutas
const tracksRoutes = require('./routes/tracks.routes');

// Inicializar aplicación Express
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Parsear solicitudes JSON
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/tracks', tracksRoutes);

// Ruta inicial para verificar que la API está funcionando
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API de PISTAS CHIVERAS' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Ha ocurrido un error en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
