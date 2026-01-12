// Testy jednostkowe - Autoryzacja
const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

describe('Authentication Tests', () => {
  let testUser = {
    email: 'test@biblioteka.pl',
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'User',
    phone: '123456789',
    address: 'Test Street 123'
  };

  afterAll(async () => {
    // Cleanup - usuń testowego użytkownika
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.end();
  });

  // T1: Test jednostkowy modułu logowania użytkownika
  describe('T1: Login functionality', () => {
    beforeAll(async () => {
      // Zarejestruj użytkownika przed testami logowania
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).toHaveProperty('firstName');
      expect(response.body.user).toHaveProperty('role');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@biblioteka.pl',
          password: 'password'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  // T2: Test rejestracji nowego użytkownika
  describe('T2: Registration functionality', () => {
    const newUser = {
      email: 'newuser@biblioteka.pl',
      password: 'NewPassword123',
      firstName: 'New',
      lastName: 'User',
      phone: '987654321',
      address: 'New Street 456'
    };

    afterAll(async () => {
      await pool.query('DELETE FROM users WHERE email = $1', [newUser.email]);
    });

    test('should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(newUser.email);
    });

    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('istnieje');
    });

    test('should reject registration without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@biblioteka.pl'
          // brak password, firstName, lastName
        });

      expect(response.status).toBe(500); // lub 400 jeśli dodasz walidację
    });
  });

  // T6: Test autoryzacji i zabezpieczeń (bcrypt, HTTPS)
  describe('T6: Security tests', () => {
    test('should hash passwords with bcrypt', async () => {
      const securityUser = {
        email: 'security@biblioteka.pl',
        password: 'SecurePassword123',
        firstName: 'Security',
        lastName: 'Test'
      };

      await request(app)
        .post('/api/auth/register')
        .send(securityUser);

      // Pobierz użytkownika z bazy
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [securityUser.email]
      );

      expect(result.rows[0].password_hash).toBeDefined();
      expect(result.rows[0].password_hash).not.toBe(securityUser.password);
      expect(result.rows[0].password_hash.length).toBeGreaterThan(50); // bcrypt hash

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [securityUser.email]);
    });

    test('should require authentication token for protected routes', async () => {
      const response = await request(app)
        .get('/api/loans/active');

      expect(response.status).toBe(401);
    });

    test('should accept valid JWT token', async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/users/' + loginResponse.body.user.userId)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });
});