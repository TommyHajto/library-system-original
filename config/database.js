// Singleton Pattern - Połączenie z bazą danych
const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'library_db',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT) || 5432,
      max: 20, // maksymalna liczba połączeń w puli
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('connect', () => {
      console.log('✓ Połączono z bazą danych PostgreSQL');
    });

    this.pool.on('error', (err) => {
      console.error('Nieoczekiwany błąd połączenia z bazą:', err);
      process.exit(-1);
    });

    Database.instance = this;
  }

  getPool() {
    return this.pool;
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Wykonano zapytanie', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Błąd zapytania do bazy:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    await this.pool.end();
    console.log('✓ Zamknięto połączenie z bazą danych');
  }
}

// Singleton instance
const database = new Database();

module.exports = {
  pool: database.getPool(),
  query: database.query.bind(database),
  getClient: database.getClient.bind(database),
  close: database.close.bind(database)
};