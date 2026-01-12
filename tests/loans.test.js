// Testy funkcjonalne - Wypożyczenia i zwroty
const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

describe('Loans Tests', () => {
  let readerToken, librarianToken;
  let readerId, librarianId;
  let testBookId, testLoanId;

  beforeAll(async () => {
    // Stwórz czytelnika
    const readerData = {
      email: 'reader-loans@biblioteka.pl',
      password: 'ReaderPass123',
      firstName: 'Test',
      lastName: 'Reader'
    };
    await request(app).post('/api/auth/register').send(readerData);
    
    const readerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: readerData.email, password: readerData.password });
    
    readerToken = readerLogin.body.token;
    readerId = readerLogin.body.user.userId;

    // Stwórz bibliotekarza
    const librarianData = {
      email: 'librarian-loans@biblioteka.pl',
      password: 'LibrarianPass123',
      firstName: 'Test',
      lastName: 'Librarian'
    };
    await request(app).post('/api/auth/register').send(librarianData);
    
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', 
      ['librarian', librarianData.email]);
    
    const librarianLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: librarianData.email, password: librarianData.password });
    
    librarianToken = librarianLogin.body.token;
    librarianId = librarianLogin.body.user.userId;

    // Dodaj testową książkę
    const bookResponse = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        title: 'Loan Test Book',
        author: 'Test Author',
        isbn: '978-0-999999-99-9',
        publisher: 'Test Publisher',
        publicationYear: 2024,
        categoryId: 1,
        description: 'For loan testing',
        totalCopies: 2
      });
    
    testBookId = bookResponse.body.book_id;
  });

  afterAll(async () => {
    // Cleanup
    if (testLoanId) {
      await pool.query('DELETE FROM loans WHERE loan_id = $1', [testLoanId]);
    }
    if (testBookId) {
      await pool.query('DELETE FROM books WHERE book_id = $1', [testBookId]);
    }
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', 
      ['reader-loans@biblioteka.pl', 'librarian-loans@biblioteka.pl']);
    await pool.end();
  });

  // T4: Test wypożyczania i zwrotu książek
  describe('T4: Loan and return functionality', () => {
    test('should create loan as librarian', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const response = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          userId: readerId,
          bookId: testBookId,
          dueDate: dueDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('loan_id');
      expect(response.body.user_id).toBe(readerId);
      expect(response.body.book_id).toBe(testBookId);
      
      testLoanId = response.body.loan_id;
    });

    test('should get active loans', async () => {
      const response = await request(app)
        .get('/api/loans/active')
        .set('Authorization', `Bearer ${librarianToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return book', async () => {
      const response = await request(app)
        .put(`/api/loans/${testLoanId}/return`)
        .set('Authorization', `Bearer ${librarianToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject loan without authentication', async () => {
      const response = await request(app)
        .post('/api/loans')
        .send({
          userId: readerId,
          bookId: testBookId,
          dueDate: '2024-12-31'
        });

      expect(response.status).toBe(401);
    });

    test('should reject loan for unavailable book', async () => {
      // Najpierw wypożycz wszystkie egzemplarze
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      
      // Wypożycz pierwszy egzemplarz
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          userId: readerId,
          bookId: testBookId,
          dueDate: dueDate.toISOString().split('T')[0]
        });

      // Wypożycz drugi egzemplarz
      await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          userId: readerId,
          bookId: testBookId,
          dueDate: dueDate.toISOString().split('T')[0]
        });

      // Próba wypożyczenia trzeciego (niedostępnego)
      const response = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          userId: readerId,
          bookId: testBookId,
          dueDate: dueDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('niedostępna');
    });
  });

  // T5: Test rezerwacji książki i historii wypożyczeń
  describe('T5: Reservation and history functionality', () => {
    test('should create book reservation', async () => {
      const response = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${readerToken}`)
        .send({ bookId: testBookId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('reservation_id');
    });

    test('should get user loan history', async () => {
      const response = await request(app)
        .get(`/api/loans/user/${readerId}`)
        .set('Authorization', `Bearer ${readerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get user reservations', async () => {
      const response = await request(app)
        .get('/api/reservations/user')
        .set('Authorization', `Bearer ${readerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});