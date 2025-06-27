const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

class DatabaseService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'srv1847.hstgr.io',
      user: process.env.DB_USER || 'u487652187_root1',
      password: process.env.DB_PASSWORD || 'Jhonatanchiroque1@',
      database: process.env.DB_NAME || 'u487652187_web_pistas',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log('Servicio de base de datos MySQL inicializado');
  }
  
  async query(sql, params) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Error ejecutando consulta SQL:', error);
      throw error;
    }
  }
  
  async incrementPlays(fileId) {
    try {
      await this.query(
        'UPDATE tracks SET plays = plays + 1 WHERE file_id = ?',
        [fileId]
      );
      return true;
    } catch (error) {
      console.error(`Error al incrementar reproducciones de la pista ${fileId}:`, error);
      return false;
    }
  }
}

module.exports = new DatabaseService();
