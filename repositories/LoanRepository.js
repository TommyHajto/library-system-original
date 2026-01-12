// Repository Pattern - Abstrakcja dostępu do danych wypożyczeń
const { pool } = require('../config/database');

class LoanRepository {
  async findAll() {
    const query = `
      SELECT l.*, b.title, b.author, u.first_name, u.last_name, u.email
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      JOIN users u ON l.user_id = u.user_id
      ORDER BY l.loan_date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async findActive() {
    const query = `
      SELECT l.*, b.title, b.author, b.isbn, u.first_name, u.last_name, u.email
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      JOIN users u ON l.user_id = u.user_id
      WHERE l.status = 'active'
      ORDER BY l.due_date
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async findById(loanId) {
    const query = `
      SELECT l.*, b.title, b.author, u.first_name, u.last_name, u.email
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      JOIN users u ON l.user_id = u.user_id
      WHERE l.loan_id = $1
    `;
    const result = await pool.query(query, [loanId]);
    return result.rows[0] || null;
  }

  async findByUserId(userId) {
    const query = `
      SELECT l.*, b.title, b.author, b.isbn 
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      WHERE l.user_id = $1
      ORDER BY l.loan_date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async create(loanData) {
    const { userId, bookId, librarianId, dueDate } = loanData;
    
    const query = `
      INSERT INTO loans (user_id, book_id, librarian_id, due_date) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, bookId, librarianId, dueDate]);
    return result.rows[0];
  }

  async markAsReturned(loanId) {
    const query = `
      UPDATE loans 
      SET return_date = CURRENT_TIMESTAMP, status = 'returned' 
      WHERE loan_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [loanId]);
    return result.rows[0];
  }

  async extend(loanId, newDueDate) {
    const query = `
      UPDATE loans 
      SET due_date = $1, extended = true 
      WHERE loan_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [newDueDate, loanId]);
    return result.rows[0];
  }

  async findDueSoon(days = 1) {
    const query = `
      SELECT l.*, u.email, u.first_name, b.title 
      FROM loans l
      JOIN users u ON l.user_id = u.user_id
      JOIN books b ON l.book_id = b.book_id
      WHERE l.status = 'active' 
        AND DATE(l.due_date) = CURRENT_DATE + $1
    `;
    const result = await pool.query(query, [days]);
    return result.rows;
  }

  async findOverdue() {
    const query = `
      SELECT l.*, u.email, u.first_name, b.title 
      FROM loans l
      JOIN users u ON l.user_id = u.user_id
      JOIN books b ON l.book_id = b.book_id
      WHERE l.status = 'active' 
        AND l.due_date < CURRENT_DATE
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = new LoanRepository();