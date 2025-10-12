// server.js - Backend API dla systemu biblioteki
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Konfiguracja PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'library_db',
  password: '',
  port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Konfiguracja email (nodemailer)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware autoryzacji
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware sprawdzania roli
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }
    next();
  };
};

// ========== AUTORYZACJA (F1, F2) ==========

// F1: Rejestracja użytkownika
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, address } = req.body;

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email już istnieje' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, address) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, first_name, last_name, role`,
      [email, hashedPassword, firstName, lastName, phone, address]
    );

    res.status(201).json({
      message: 'Użytkownik zarejestrowany',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// F2: Logowanie
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== KSIĄŻKI ==========

// F3: Wyszukiwanie książek
app.get('/api/books/search', async (req, res) => {
  try {
    const { query, category, author } = req.query;
    
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
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd wyszukiwania:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz wszystkie książki
app.get('/api/books', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      ORDER BY b.title
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania książek:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz szczegóły książki
app.get('/api/books/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, c.name as category_name 
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      WHERE b.book_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Książka nie znaleziona' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd pobierania książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Dodaj książkę (tylko bibliotekarz/admin)
app.post('/api/books', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  try {
    const { title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies } = req.body;

    const result = await pool.query(
      `INSERT INTO books (title, author, isbn, publisher, publication_year, category_id, description, total_copies, available_copies) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
      [title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Błąd dodawania książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Edytuj książkę (tylko bibliotekarz/admin)
app.put('/api/books/:id', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  try {
    const { title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies } = req.body;

    const result = await pool.query(
      `UPDATE books SET title = $1, author = $2, isbn = $3, publisher = $4, 
       publication_year = $5, category_id = $6, description = $7, total_copies = $8
       WHERE book_id = $9 RETURNING *`,
      [title, author, isbn, publisher, publicationYear, categoryId, description, totalCopies, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd edycji książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Usuń książkę (tylko admin)
app.delete('/api/books/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM books WHERE book_id = $1', [req.params.id]);
    res.json({ message: 'Książka usunięta' });
  } catch (error) {
    console.error('Błąd usuwania książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== WYPOŻYCZENIA ==========

// F4: Wypożycz książkę (tylko bibliotekarz)
app.post('/api/loans', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { userId, bookId, dueDate } = req.body;

    // Sprawdź dostępność
    const book = await client.query(
      'SELECT available_copies FROM books WHERE book_id = $1',
      [bookId]
    );

    if (book.rows[0].available_copies < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Książka niedostępna' });
    }

    // Utwórz wypożyczenie
    const loan = await client.query(
      `INSERT INTO loans (user_id, book_id, librarian_id, due_date) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, bookId, req.user.userId, dueDate]
    );

    // Zmniejsz dostępność
    await client.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE book_id = $1',
      [bookId]
    );

    await client.query('COMMIT');
    res.status(201).json(loan.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Błąd wypożyczenia:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  } finally {
    client.release();
  }
});

// F5: Zwrot książki
app.put('/api/loans/:id/return', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const loan = await client.query(
      'SELECT * FROM loans WHERE loan_id = $1',
      [req.params.id]
    );

    if (loan.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wypożyczenie nie znalezione' });
    }

    // Aktualizuj wypożyczenie
    await client.query(
      `UPDATE loans SET return_date = CURRENT_TIMESTAMP, status = 'returned' 
       WHERE loan_id = $1`,
      [req.params.id]
    );

    // Zwiększ dostępność
    await client.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE book_id = $1',
      [loan.rows[0].book_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Książka zwrócona' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Błąd zwrotu:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  } finally {
    client.release();
  }
});

// F10: Historia wypożyczeń użytkownika
app.get('/api/loans/user/:userId', authenticateToken, async (req, res) => {
  try {
    // Użytkownik może zobaczyć tylko swoją historię
    if (req.user.userId !== parseInt(req.params.userId) && !['librarian', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    const result = await pool.query(`
      SELECT l.*, b.title, b.author, b.isbn 
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      WHERE l.user_id = $1
      ORDER BY l.loan_date DESC
    `, [req.params.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania historii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Wszystkie aktywne wypożyczenia (bibliotekarz)
app.get('/api/loans/active', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, b.title, b.author, u.first_name, u.last_name, u.email
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      JOIN users u ON l.user_id = u.user_id
      WHERE l.status = 'active'
      ORDER BY l.due_date
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania wypożyczeń:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== REZERWACJE ==========

// F9: Rezerwacja książki
app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.body;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Rezerwacja na 7 dni

    const result = await pool.query(
      `INSERT INTO reservations (user_id, book_id, expiry_date) 
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.userId, bookId, expiryDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Błąd rezerwacji:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Rezerwacje użytkownika
app.get('/api/reservations/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, b.title, b.author 
      FROM reservations r
      JOIN books b ON r.book_id = b.book_id
      WHERE r.user_id = $1 AND r.status = 'pending'
      ORDER BY r.reservation_date DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania rezerwacji:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// F7: Przedłużenie terminu zwrotu
app.post('/api/loans/:id/extend', authenticateToken, async (req, res) => {
  try {
    const loan = await pool.query(
      'SELECT * FROM loans WHERE loan_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Wypożyczenie nie znalezione' });
    }

    if (loan.rows[0].extended) {
      return res.status(400).json({ error: 'Wypożyczenie już przedłużone' });
    }

    const newDueDate = new Date(loan.rows[0].due_date);
    newDueDate.setDate(newDueDate.getDate() + 14); // Przedłużenie o 14 dni

    await pool.query(
      `INSERT INTO extension_requests (loan_id, new_due_date) 
       VALUES ($1, $2)`,
      [req.params.id, newDueDate]
    );

    res.json({ message: 'Wniosek o przedłużenie złożony' });
  } catch (error) {
    console.error('Błąd przedłużenia:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== UŻYTKOWNICY ==========

// F6: Edycja danych użytkownika
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.userId !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    const { firstName, lastName, phone, address } = req.body;

    const result = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3, address = $4 
       WHERE user_id = $5 RETURNING user_id, email, first_name, last_name, phone, address, role`,
      [firstName, lastName, phone, address, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd edycji użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz dane użytkownika
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.userId !== parseInt(req.params.id) && !['librarian', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name, phone, address, role, created_at FROM users WHERE user_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd pobierania użytkownika:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== KATEGORIE ==========

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Błąd pobierania kategorii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// F8: Funkcja wysyłania powiadomień email (wywoływana przez cron)
async function sendDueReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const loans = await pool.query(`
      SELECT l.*, u.email, u.first_name, b.title 
      FROM loans l
      JOIN users u ON l.user_id = u.user_id
      JOIN books b ON l.book_id = b.book_id
      WHERE l.status = 'active' AND DATE(l.due_date) = DATE($1)
    `, [tomorrow]);

    for (const loan of loans.rows) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: loan.email,
        subject: 'Przypomnienie o zbliżającym się terminie zwrotu',
        html: `
          <p>Witaj ${loan.first_name},</p>
          <p>Przypominamy, że termin zwrotu książki <strong>${loan.title}</strong> upływa jutro.</p>
          <p>Data zwrotu: ${new Date(loan.due_date).toLocaleDateString('pl-PL')}</p>
          <p>Prosimy o terminowy zwrot lub przedłużenie wypożyczenia.</p>
        `
      };

      await transporter.sendMail(mailOptions);
      
      await pool.query(
        `INSERT INTO email_notifications (user_id, loan_id, type, subject, body, sent_at, status) 
         VALUES ($1, $2, 'due_reminder', $3, $4, CURRENT_TIMESTAMP, 'sent')`,
        [loan.user_id, loan.loan_id, mailOptions.subject, mailOptions.html]
      );
    }

    console.log(`Wysłano ${loans.rows.length} powiadomień`);
  } catch (error) {
    console.error('Błąd wysyłania powiadomień:', error);
  }
}

// Endpoint do ręcznego wyzwolenia powiadomień (do testów)
app.post('/api/notifications/send-reminders', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    await sendDueReminders();
    res.json({ message: 'Powiadomienia wysłane' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd wysyłania powiadomień' });
  }
});

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Serwer uruchomiony na porcie ${PORT}`);
  
  // Harmonogram wysyłania powiadomień (codziennie o 9:00)
  const schedule = require('node-schedule');
  schedule.scheduleJob('0 9 * * *', sendDueReminders);
});