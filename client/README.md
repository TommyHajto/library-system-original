# System Biblioteki 📚

System zarządzania biblioteką z wykorzystaniem metodyki Scrum i wzorców projektowych.

## 📋 Autorzy

- Joanna Krekora
- Gabriela Czajkowska
- Oliwia Turalska
- Łukasz Olesik
- Tomasz Rokoszyński
- Agnieszka Michałowska

## 🎯 Opis Projektu

System wspiera obsługę biblioteki, umożliwiając:
- Zarządzanie zbiorami książek
- Obsługę kont czytelników
- Proces wypożyczeń i zwrotów
- Rezerwacje książek online
- Automatyczne powiadomienia email

## 🏗️ Architektura

System wykorzystuje **architekturę trójwarstwową**:

1. **Warstwa prezentacji** - React (frontend)
   - Panel Bibliotekarza
   - Portal Czytelnika
   
2. **Warstwa logiki** - Express.js (backend API)
   
3. **Warstwa danych** - PostgreSQL

## 🎨 Wzorce Projektowe

Projekt implementuje następujące wzorce:

### Wzorce Architektoniczne
- **MVC (Model-View-Controller)** - Separacja logiki, prezentacji i danych
- **Warstwowa architektura** - Podział na frontend, backend, baza danych

### Wzorce Projektowe
1. **Repository Pattern** - Abstrakcja dostępu do danych
   - `BookRepository.js`
   - `UserRepository.js`
   - `LoanRepository.js`

2. **Factory Pattern** - Tworzenie różnych typów użytkowników
   - `UserFactory.js` (Reader, Librarian, Admin)

3. **Strategy Pattern** - Różne strategie wyszukiwania
   - `SearchStrategy.js` (TitleSearch, AuthorSearch, ISBNSearch, FullText)

4. **Observer Pattern (Pub/Sub)** - System powiadomień
   - `NotificationService.js`

5. **Singleton Pattern** - Połączenie z bazą danych
   - `config/database.js`

6. **Middleware Pattern** - Przetwarzanie żądań HTTP
   - `authenticateToken`, `checkRole`

## 🚀 Instalacja

### Wymagania
- Node.js v18+
- PostgreSQL v14+
- npm lub yarn

### Krok 1: Sklonuj repozytorium

```bash
git clone https://github.com/TommyHajto/library-system.git
cd library-system
```

### Krok 2: Zainstaluj zależności backendu

```bash
npm install
```

### Krok 3: Zainstaluj zależności frontendu

```bash
cd client
npm install
cd ..
```

### Krok 4: Konfiguracja bazy danych

1. Utwórz bazę danych PostgreSQL:
```sql
CREATE DATABASE library_db;
```

2. Zaimportuj schemat (plik w `database/schema.sql`):
```bash
psql -U postgres -d library_db -f database/schema.sql
```

### Krok 5: Konfiguracja zmiennych środowiskowych

1. Skopiuj plik przykładowy:
```bash
cp .env.example .env
```

2. Edytuj `.env` i uzupełnij dane:
```env
DB_PASSWORD=twoje_haslo_do_bazy
JWT_SECRET=bardzo-tajny-klucz-minimum-32-znaki
EMAIL_USER=twoj-email@gmail.com
EMAIL_PASS=haslo-aplikacji-gmail
```

### Krok 6: Uruchom aplikację

**Development mode:**
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

**Production mode:**
```bash
# Build frontendu
cd client
npm run build
cd ..

# Uruchom backend
npm start
```

## 🧪 Testowanie

### Uruchom wszystkie testy
```bash
npm test
```

### Uruchom testy z pokryciem kodu
```bash
npm test -- --coverage
```

### Uruchom testy w trybie watch
```bash
npm run test:watch
```

## 📡 API Endpoints

### Autoryzacja
- `POST /api/auth/register` - Rejestracja nowego użytkownika
- `POST /api/auth/login` - Logowanie

### Książki
- `GET /api/books` - Lista wszystkich książek
- `GET /api/books/:id` - Szczegóły książki
- `GET /api/books/search?query=...` - Wyszukiwanie książek
- `POST /api/books` - Dodaj książkę (librarian/admin)
- `PUT /api/books/:id` - Edytuj książkę (librarian/admin)
- `DELETE /api/books/:id` - Usuń książkę (admin)

### Wypożyczenia
- `GET /api/loans/active` - Aktywne wypożyczenia (librarian/admin)
- `GET /api/loans/user/:userId` - Historia wypożyczeń użytkownika
- `POST /api/loans` - Utwórz wypożyczenie (librarian/admin)
- `PUT /api/loans/:id/return` - Zwrot książki (librarian/admin)
- `POST /api/loans/:id/extend` - Przedłużenie terminu

### Rezerwacje
- `GET /api/reservations/user` - Rezerwacje użytkownika
- `POST /api/reservations` - Utwórz rezerwację

### Użytkownicy
- `GET /api/users/:id` - Dane użytkownika
- `PUT /api/users/:id` - Edycja danych użytkownika

### Kategorie
- `GET /api/categories` - Lista kategorii książek

## 👥 Role Użytkowników

### Reader (Czytelnik)
- Przeglądanie katalogu książek
- Rezerwowanie książek
- Podgląd historii wypożyczeń
- Edycja własnego profilu

### Librarian (Bibliotekarz)
- Wszystkie uprawnienia czytelnika
- Zarządzanie książkami (dodawanie, edycja)
- Rejestrowanie wypożyczeń i zwrotów
- Przeglądanie wszystkich wypożyczeń

### Admin (Administrator)
- Wszystkie uprawnienia bibliotekarza
- Usuwanie książek
- Zarządzanie użytkownikami
- Zmiana ról użytkowników
- Wysyłanie powiadomień

## 🔐 Bezpieczeństwo

- Hasła hashowane z użyciem **bcrypt** (10 rounds)
- Autoryzacja oparta na **JWT tokens** (ważność 24h)
- **CORS** dla bezpiecznej komunikacji frontend-backend
- Walidacja danych wejściowych
- Ochrona wrażliwych endpointów middleware'em autoryzacji

## 📊 Metodyka Scrum

Projekt został zrealizowany w 3 sprintach po 2 tygodnie:

### Sprint 1
- Projekt interfejsu użytkownika
- Struktura bazy danych
- Podstawowa architektura

### Sprint 2
- Implementacja rejestracji i logowania
- Zarządzanie książkami
- Panel bibliotekarza

### Sprint 3
- Obsługa wypożyczeń i zwrotów
- System rezerwacji
- Automatyczne powiadomienia email

## 🛠️ Technologie

### Backend
- Node.js v18+
- Express.js v4.18
- PostgreSQL v14+
- JWT (jsonwebtoken)
- bcrypt v5.1
- nodemailer v6.9
- node-schedule v2.1

### Frontend
- React v18+
- React Router v6
- Tailwind CSS v3
- Lucide React (ikony)

### Testing
- Jest v29
- Supertest v6

## 📝 Struktura Projektu

```
library-system/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── App.js
│   │   ├── LibrarianPanel.js
│   │   └── ReaderPortal.js
│   └── package.json
├── config/                 # Konfiguracja
│   └── database.js        # Singleton - połączenie DB
├── repositories/          # Repository Pattern
│   ├── BookRepository.js
│   ├── UserRepository.js
│   └── LoanRepository.js
├── factories/             # Factory Pattern
│   └── UserFactory.js
├── strategies/            # Strategy Pattern
│   └── SearchStrategy.js
├── observers/             # Observer Pattern
│   └── NotificationService.js
├── tests/                 # Testy
│   ├── auth.test.js
│   ├── books.test.js
│   └── loans.test.js
├── database/              # Skrypty SQL
│   └── schema.sql
├── server.js              # Główny plik serwera
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 📞 Kontakt

Zespół projektowy - Informatyka, Semestr 5

Prowadzący: Marcin Kacprowicz