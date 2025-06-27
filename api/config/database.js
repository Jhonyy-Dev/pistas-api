const { Sequelize } = require('sequelize');

// Crear instancia de Sequelize utilizando la URL de la base de datos desde .env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
  }
});

module.exports = sequelize;
