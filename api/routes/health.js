const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint para Railway
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'API Solo Chiveros operativa',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    trackStats: {
      totalTracks: 4000,
      pageSize: 50,
      totalPages: 80
    }
  });
});

module.exports = router;
