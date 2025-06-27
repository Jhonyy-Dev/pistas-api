const express = require('express');
const router = express.Router();
const tracksController = require('../controllers/tracks.controller');

// Obtener todas las pistas con paginación
router.get('/', tracksController.getTracks);

// Obtener una pista específica por ID
router.get('/:id', tracksController.getTrackById);

// Generar URL de streaming para una pista
router.get('/:id/stream', tracksController.getStreamUrl);

// Registrar reproducción de pista
router.post('/:id/play', tracksController.trackPlay);

module.exports = router;
