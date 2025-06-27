const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Track = sequelize.define('Track', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  duration: {
    type: DataTypes.INTEGER, // Duración en segundos
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER, // Tamaño en bytes
    allowNull: true
  },
  b2FileId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  b2FileUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plays: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  indexes: [
    {
      name: 'tracks_title_idx',
      fields: ['title']
    }
  ]
});

module.exports = Track;
