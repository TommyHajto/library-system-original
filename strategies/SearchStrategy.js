// Strategy Pattern - Różne strategie wyszukiwania książek
const { pool } = require('../config/database');

// Interface dla strategii wyszukiwania
class SearchStrategy {
  async search(query) {
    throw new Error('Method search() must be implemented');
  }
}

// Strategia wyszukiwania po tytule
class TitleSearchStrategy extends SearchStrategy {
  async search(query) {
    const sql = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE LOWER(b.title) LIKE $1
      ORDER BY b.title
    `;
    const result = await pool.query(sql, [`%${query.toLowerCase()}%`]);
    return result.rows;
  }
}

// Strategia wyszukiwania po autorze
class AuthorSearchStrategy extends SearchStrategy {
  async search(query) {
    const sql = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE LOWER(b.author) LIKE $1
      ORDER BY b.author, b.title
    `;
    const result = await pool.query(sql, [`%${query.toLowerCase()}%`]);
    return result.rows;
  }
}

// Strategia wyszukiwania po ISBN
class ISBNSearchStrategy extends SearchStrategy {
  async search(query) {
    const sql = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE b.isbn = $1
    `;
    const result = await pool.query(sql, [query]);
    return result.rows;
  }
}

// Strategia wyszukiwania po kategorii
class CategorySearchStrategy extends SearchStrategy {
  async search(categoryId) {
    const sql = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE b.category_id = $1
      ORDER BY b.title
    `;
    const result = await pool.query(sql, [categoryId]);
    return result.rows;
  }
}

// Strategia uniwersalnego wyszukiwania (pełnotekstowe)
class FullTextSearchStrategy extends SearchStrategy {
  async search(query) {
    const sql = `
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE LOWER(b.title) LIKE $1 
         OR LOWER(b.author) LIKE $1 
         OR b.isbn LIKE $1
         OR LOWER(b.description) LIKE $1
      ORDER BY 
        CASE 
          WHEN LOWER(b.title) LIKE $1 THEN 1
          WHEN LOWER(b.author) LIKE $1 THEN 2
          WHEN b.isbn LIKE $1 THEN 3
          ELSE 4
        END,
        b.title
    `;
    const result = await pool.query(sql, [`%${query.toLowerCase()}%`]);
    return result.rows;
  }
}

// Context - używa strategii do wyszukiwania
class BookSearchContext {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  async executeSearch(query) {
    if (!this.strategy) {
      throw new Error('Search strategy not set');
    }
    return await this.strategy.search(query);
  }
}

// Factory dla strategii
class SearchStrategyFactory {
  static getStrategy(type) {
    switch(type) {
      case 'title':
        return new TitleSearchStrategy();
      case 'author':
        return new AuthorSearchStrategy();
      case 'isbn':
        return new ISBNSearchStrategy();
      case 'category':
        return new CategorySearchStrategy();
      case 'fulltext':
      default:
        return new FullTextSearchStrategy();
    }
  }
}

module.exports = {
  SearchStrategy,
  TitleSearchStrategy,
  AuthorSearchStrategy,
  ISBNSearchStrategy,
  CategorySearchStrategy,
  FullTextSearchStrategy,
  BookSearchContext,
  SearchStrategyFactory
};