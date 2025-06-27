const sequelize = require('../config/database');
const Track = require('./track');

// Exportar modelos y conexión
module.exports = {
  sequelize,
  Track
};
