// Repository Pattern - Abstrakcja dostępu do danych książek
const { pool } = require('../config/database');

class BookRepository {
  async findAll() {
    const query = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      ORDER BY b.title
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async findById(bookId) {
    const query = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE b.book_id = $1
    `;
    const result = await pool.query(query, [bookId]);
    return result.rows[0] || null;
  }

  async search(searchParams) {
    const { query, category, author } = searchParams;
    
    let sql = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (query) {
      sql += ` AND (LOWER(b.title) LIKE $${paramIndex} OR LOWER(b.author) LIKE $${paramIndex} OR b.isbn LIKE $${paramIndex})`;
      params.push(`%${query.toLowerCase()}%`);
      paramIndex++;
    }

    if (category) {
      sql += ` AND b.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (author) {
      sql += ` AND LOWER(b.author) LIKE $${paramIndex}`;
      params.push(`%${author.toLowerCase()}%`);
      paramIndex++;
    }

    sql += ' ORDER BY b.title';

    const result = await pool.query(sql, params);
    return result.rows;
  }

  async create(bookData) {
    const { title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies } = bookData;
    
    const query = `
      INSERT INTO books (title, author, isbn, publisher, publication_year, category_id, description, total_copies, available_copies) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) 
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies
    ]);
    
    return result.rows[0];
  }

  async update(bookId, bookData) {
    const { title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies } = bookData;
    
    const query = `
      UPDATE books 
      SET title = $1, author = $2, isbn = $3, publisher = $4, 
          publication_year = $5, category_id = $6, description = $7, total_copies = $8
      WHERE book_id = $9 
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies, bookId
    ]);
    
    return result.rows[0];
  }

  async delete(bookId) {
    const query = 'DELETE FROM books WHERE book_id = $1';
    await pool.query(query, [bookId]);
    return true;
  }

  async updateAvailability(bookId, change) {
    const query = `
      UPDATE books 
      SET available_copies = available_copies + $1 
      WHERE book_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [change, bookId]);
    return result.rows[0];
  }

  async checkAvailability(bookId) {
    const query = 'SELECT available_copies FROM books WHERE book_id = $1';
    const result = await pool.query(query, [bookId]);
    return result.rows[0]?.available_copies || 0;
  }
}

module.exports = new BookRepository();