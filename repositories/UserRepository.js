// Repository Pattern - Abstrakcja dostępu do danych użytkowników
const { pool } = require('../config/database');

class UserRepository {
  async findAll() {
    const query = `
      SELECT user_id, email, first_name, last_name, phone, address, role, is_active, created_at 
      FROM users 
      ORDER BY last_name, first_name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async findById(userId) {
    const query = `
      SELECT user_id, email, first_name, last_name, phone, address, role, is_active, created_at 
      FROM users 
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async create(userData) {
    const { email, passwordHash, firstName, lastName, phone, address, role = 'reader' } = userData;
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, address, role) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING user_id, email, first_name, last_name, phone, address, role, created_at
    `;
    
    const result = await pool.query(query, [
      email, passwordHash, firstName, lastName, phone, address, role
    ]);
    
    return result.rows[0];
  }

  async update(userId, userData) {
    const { firstName, lastName, phone, address } = userData;
    
    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, address = $4 
      WHERE user_id = $5 
      RETURNING user_id, email, first_name, last_name, phone, address, role, created_at
    `;
    
    const result = await pool.query(query, [
      firstName, lastName, phone, address, userId
    ]);
    
    return result.rows[0];
  }

  async updateRole(userId, role) {
    const query = 'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING *';
    const result = await pool.query(query, [role, userId]);
    return result.rows[0];
  }

  async deactivate(userId) {
    const query = 'UPDATE users SET is_active = false WHERE user_id = $1';
    await pool.query(query, [userId]);
    return true;
  }

  async activate(userId) {
    const query = 'UPDATE users SET is_active = true WHERE user_id = $1';
    await pool.query(query, [userId]);
    return true;
  }
}

module.exports = new UserRepository();