-- Usuń tabele jeśli istnieją
DROP TABLE IF EXISTS email_notifications CASCADE;
DROP TABLE IF EXISTS extension_requests CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tabela użytkowników
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(20) DEFAULT 'reader' CHECK (role IN ('reader', 'librarian', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela kategorii
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Tabela książek
CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(255),
    publication_year INTEGER,
    category_id INTEGER REFERENCES categories(category_id),
    description TEXT,
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela wypożyczeń
CREATE TABLE loans (
    loan_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
    librarian_id INTEGER REFERENCES users(user_id),
    loan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    return_date TIMESTAMP,
    extended BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue'))
);

-- Tabela rezerwacji
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(book_id) ON DELETE CASCADE,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled'))
);

-- Tabela wniosków o przedłużenie
CREATE TABLE extension_requests (
    request_id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(loan_id) ON DELETE CASCADE,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    new_due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Tabela powiadomień email
CREATE TABLE email_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    loan_id INTEGER REFERENCES loans(loan_id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

-- Dane przykładowe - kategorie
INSERT INTO categories (name, description) VALUES 
('Fantastyka', 'Książki fantasy i science fiction'),
('Kryminał', 'Powieści kryminalne i thrillery'),
('Romans', 'Literatura romantyczna'),
('Literatura faktu', 'Biografie, historia, publicystyka'),
('Nauka', 'Książki naukowe i popularnonaukowe');

-- Dane przykładowe - użytkownicy
-- Hasło dla wszystkich: password123
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES 
('admin@biblioteka.pl', '$2b$10$YourHashedPasswordHere', 'Admin', 'Biblioteki', 'admin'),
('bibliotekarz@biblioteka.pl', '$2b$10$YourHashedPasswordHere', 'Jan', 'Kowalski', 'librarian'),
('czytelnik@biblioteka.pl', '$2b$10$YourHashedPasswordHere', 'Anna', 'Nowak', 'reader');

-- Indeksy dla wydajności
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_loans_user ON loans(user_id);
CREATE INDEX idx_loans_book ON loans(book_id);
CREATE INDEX idx_loans_status ON loans(status);