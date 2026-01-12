// Testy jednostkowe i funkcjonalne - Książki
const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

describe('Books Tests', () => {
  let librarianToken;
  let librarianId;
  let testBookId;

  beforeAll(async () => {
    // Stwórz bibliotekarza do testów
    const librarianData = {
      email: 'librarian-test@biblioteka.pl',
      password: 'LibrarianPass123',
      firstName: 'Test',
      lastName: 'Librarian'
    };

    await request(app)
      .post('/api/auth/register')
      .send(librarianData);

    // Zmień rolę na librarian
    await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2',
      ['librarian', librarianData.email]
    );

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: librarianData.email,
        password: librarianData.password
      });

    librarianToken = loginResponse.body.token;
    librarianId = loginResponse.body.user.userId;
  });

  afterAll(async () => {
    // Cleanup
    if (testBookId) {
      await pool.query('DELETE FROM books WHERE book_id = $1', [testBookId]);
    }
    await pool.query('DELETE FROM users WHERE email = $1', ['librarian-test@biblioteka.pl']);
    await pool.end();
  });

  // T3: Test wyszukiwania książek
  describe('T3: Search books functionality', () => {
    test('should search books by title', async () => {
      const response = await request(app)
        .get('/api/books/search?query=test');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should search books by author', async () => {
      const response = await request(app)
        .get('/api/books/search?author=tolkien');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return empty array for non-existent book', async () => {
      const response = await request(app)
        .get('/api/books/search?query=nonexistentbook12345xyz');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should get all books without search query', async () => {
      const response = await request(app)
        .get('/api/books');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Book Management - Librarian only', () => {
    test('should add new book as librarian', async () => {
      const newBook = {
        title: 'Test Book Title',
        author: 'Test Author',
        isbn: '978-0-123456-78-9',
        publisher: 'Test Publisher',
        publicationYear: 2024,
        categoryId: 1,
        description: 'Test description',
        totalCopies: 3
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(newBook);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('book_id');
      expect(response.body.title).toBe(newBook.title);
      
      testBookId = response.body.book_id;
    });

    test('should update book as librarian', async () => {
      const updatedBook = {
        title: 'Updated Test Book',
        author: 'Updated Author',
        isbn: '978-0-123456-78-9',
        publisher: 'Updated Publisher',
        publicationYear: 2024,
        categoryId: 1,
        description: 'Updated description',
        totalCopies: 5
      };

      const response = await request(app)
        .put(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(updatedBook);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updatedBook.title);
      expect(response.body.total_copies).toBe(5);
    });

    test('should reject book operations without authentication', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({
          title: 'Unauthorized Book',
          author: 'Test'
        });

      expect(response.status).toBe(401);
    });
  });
});