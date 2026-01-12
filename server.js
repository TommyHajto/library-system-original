// server.js - Backend API dla systemu biblioteki z wzorcami projektowymi
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Singleton Pattern - Database
const { pool } = require('./config/database');

// Repository Pattern
const BookRepository = require('./repositories/BookRepository');
const UserRepository = require('./repositories/UserRepository');
const LoanRepository = require('./repositories/LoanRepository');

// Factory Pattern
const { UserFactory } = require('./factories/UserFactory');

// Strategy Pattern
const { BookSearchContext, SearchStrategyFactory } = require('./strategies/SearchStrategy');

// Observer Pattern
const NotificationService = require('./observers/NotificationService');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

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

// F1: Rejestracja użytkownika - używa Factory Pattern
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, address } = req.body;

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email już istnieje' });
    }

    // Factory Pattern - tworzenie użytkownika
    const userData = await UserFactory.createUser(
      { email, firstName, lastName, phone, address, role: 'reader' },
      password
    );

    // Repository Pattern - zapis do bazy
    const user = await UserRepository.create(userData);

    res.status(201).json({
      message: 'Użytkownik zarejestrowany',
      user: user
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

    const user = await UserRepository.findByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Factory Pattern - tworzenie instancji odpowiedniego typu użytkownika
    const userInstance = UserFactory.createUserInstance(user);

    res.json({
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        permissions: userInstance.getPermissions()
      }
    });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== KSIĄŻKI - używa Repository i Strategy Pattern ==========

// F3: Wyszukiwanie książek - Strategy Pattern
app.get('/api/books/search', async (req, res) => {
  try {
    const { query, category, author, searchType = 'fulltext' } = req.query;
    
    if (searchType && query) {
      // Strategy Pattern - wybór strategii wyszukiwania
      const strategy = SearchStrategyFactory.getStrategy(searchType);
      const context = new BookSearchContext(strategy);
      const results = await context.executeSearch(query);
      return res.json(results);
    }

    // Fallback do repository pattern dla złożonych wyszukiwań
    const results = await BookRepository.search({ query, category, author });
    res.json(results);
  } catch (error) {
    console.error('Błąd wyszukiwania:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz wszystkie książki - Repository Pattern
app.get('/api/books', async (req, res) => {
  try {
    const books = await BookRepository.findAll();
    res.json(books);
  } catch (error) {
    console.error('Błąd pobierania książek:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz szczegóły książki - Repository Pattern
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await BookRepository.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Książka nie znaleziona' });
    }
    res.json(book);
  } catch (error) {
    console.error('Błąd pobierania książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Dodaj książkę - Repository Pattern
app.post('/api/books', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  try {
    const book = await BookRepository.create(req.body);
    res.status(201).json(book);
  } catch (error) {
    console.error('Błąd dodawania książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Edytuj książkę - Repository Pattern
app.put('/api/books/:id', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  try {
    const book = await BookRepository.update(req.params.id, req.body);
    res.json(book);
  } catch (error) {
    console.error('Błąd edycji książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Usuń książkę - Repository Pattern
app.delete('/api/books/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    await BookRepository.delete(req.params.id);
    res.json({ message: 'Książka usunięta' });
  } catch (error) {
    console.error('Błąd usuwania książki:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ========== WYPOŻYCZENIA - używa Repository i Observer Pattern ==========

// F4: Wypożycz książkę
app.post('/api/loans', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { userId, bookId, dueDate } = req.body;

    // Sprawdź dostępność
    const availableCopies = await BookRepository.checkAvailability(bookId);
    if (availableCopies < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Książka niedostępna' });
    }

    // Utwórz wypożyczenie
    const loan = await LoanRepository.create({
      userId,
      bookId,
      librarianId: req.user.userId,
      dueDate
    });

    // Zmniejsz dostępność
    await BookRepository.updateAvailability(bookId, -1);

    await client.query('COMMIT');

    // Observer Pattern - wyślij powiadomienie
    const user = await UserRepository.findById(userId);
    const book = await BookRepository.findById(bookId);
    
    await NotificationService.sendLoanConfirmation({
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      title: book.title,
      loanDate: loan.loan_date,
      dueDate: loan.due_date
    });

    res.status(201).json(loan);
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

    const loan = await LoanRepository.findById(req.params.id);
    if (!loan) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wypożyczenie nie znalezione' });
    }

    // Aktualizuj wypożyczenie
    await LoanRepository.markAsReturned(req.params.id);

    // Zwiększ dostępność
    await BookRepository.updateAvailability(loan.book_id, 1);

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

// F10: Historia wypożyczeń - Repository Pattern
app.get('/api/loans/user/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.user.userId !== parseInt(req.params.userId) && !['librarian', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    const loans = await LoanRepository.findByUserId(req.params.userId);
    res.json(loans);
  } catch (error) {
    console.error('Błąd pobierania historii:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Wszystkie aktywne wypożyczenia
app.get('/api/loans/active', authenticateToken, checkRole('librarian', 'admin'), async (req, res) => {
  try {
    const loans = await LoanRepository.findActive();
    res.json(loans);
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
    expiryDate.setDate(expiryDate.getDate() + 7);

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
    const loan = await LoanRepository.findById(req.params.id);
    
    if (!loan || loan.user_id !== req.user.userId) {
      return res.status(404).json({ error: 'Wypożyczenie nie znalezione' });
    }

    if (loan.extended) {
      return res.status(400).json({ error: 'Wypożyczenie już przedłużone' });
    }

    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + 14);

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

// ========== UŻYTKOWNICY - Repository Pattern ==========

// F6: Edycja danych użytkownika
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.userId !== parseInt(req.params.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    const user = await UserRepository.update(req.params.id, req.body);
    res.json(user);
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

    const user = await UserRepository.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    res.json(user);
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

// F8: Funkcja wysyłania powiadomień email - Observer Pattern
async function sendDueReminders() {
  try {
    const loans = await LoanRepository.findDueSoon(1);

    for (const loan of loans) {
      await NotificationService.sendDueReminder({
        userId: loan.user_id,
        email: loan.email,
        firstName: loan.first_name,
        title: loan.title,
        dueDate: loan.due_date
      });
    }

    console.log(`Wysłano ${loans.length} powiadomień`);
  } catch (error) {
    console.error('Błąd wysyłania powiadomień:', error);
  }
}

// Endpoint do ręcznego wyzwolenia powiadomień
app.post('/api/notifications/send-reminders', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    await sendDueReminders();
    res.json({ message: 'Powiadomienia wysłane' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd wysyłania powiadomień' });
  }
});

// Uruchomienie serwera
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Serwer uruchomiony na porcie ${PORT}`);
    
    // Harmonogram wysyłania powiadomień (codziennie o 9:00)
    const schedule = require('node-schedule');
    schedule.scheduleJob('0 9 * * *', sendDueReminders);
    console.log('✓ Harmonogram powiadomień aktywny');
  });
}

module.exports = app; // Export dla testów