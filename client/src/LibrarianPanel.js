import React, { useState, useEffect } from 'react';
import { Search, Book, Users, BookOpen, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

const LibrarianPanel = () => {
  const [activeTab, setActiveTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [token, setToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publicationYear: new Date().getFullYear(),
    categoryId: '',
    description: '',
    totalCopies: 1
  });

  const [newLoan, setNewLoan] = useState({
    userId: '',
    bookId: '',
    dueDate: ''
  });

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, activeTab]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'books') {
        const res = await fetch(`${API_URL}/books`, { headers });
        const data = await res.json();
        setBooks(data);
      } else if (activeTab === 'loans') {
        const res = await fetch(`${API_URL}/loans/active`, { headers });
        const data = await res.json();
        setLoans(data);
      }

      const catRes = await fetch(`${API_URL}/categories`);
      const catData = await catRes.json();
      setCategories(catData);
    } catch (error) {
      console.error('Błąd pobierania danych:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setCurrentUser(data.user);
      } else {
        alert('Błąd logowania');
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
    }
  };

  const handleAddBook = async () => {
    try {
      const res = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBook)
      });

      if (res.ok) {
        setShowAddBook(false);
        setNewBook({
          title: '',
          author: '',
          isbn: '',
          publisher: '',
          publicationYear: new Date().getFullYear(),
          categoryId: '',
          description: '',
          totalCopies: 1
        });
        fetchData();
        alert('Książka dodana pomyślnie');
      }
    } catch (error) {
      console.error('Błąd dodawania książki:', error);
    }
  };

  const handleUpdateBook = async () => {
    try {
      const res = await fetch(`${API_URL}/books/${editingBook.book_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingBook)
      });

      if (res.ok) {
        setEditingBook(null);
        fetchData();
        alert('Książka zaktualizowana');
      }
    } catch (error) {
      console.error('Błąd aktualizacji książki:', error);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę książkę?')) return;

    try {
      const res = await fetch(`${API_URL}/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchData();
        alert('Książka usunięta');
      }
    } catch (error) {
      console.error('Błąd usuwania książki:', error);
    }
  };

  const handleAddLoan = async () => {
    try {
      const res = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLoan)
      });

      if (res.ok) {
        setShowLoanForm(false);
        setNewLoan({ userId: '', bookId: '', dueDate: '' });
        fetchData();
        alert('Wypożyczenie zarejestrowane');
      } else {
        const error = await res.json();
        alert(error.error || 'Błąd rejestracji wypożyczenia');
      }
    } catch (error) {
      console.error('Błąd wypożyczenia:', error);
    }
  };

  const handleReturnBook = async (loanId) => {
    if (!window.confirm('Potwierdź zwrot książki')) return;

    try {
      const res = await fetch(`${API_URL}/loans/${loanId}/return`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchData();
        alert('Książka zwrócona');
      }
    } catch (error) {
      console.error('Błąd zwrotu:', error);
    }
  };

  const searchBooks = async () => {
    if (!searchQuery) {
      fetchData();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/books/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setBooks(data);
    } catch (error) {
      console.error('Błąd wyszukiwania:', error);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <BookOpen className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Panel Bibliotekarza</h1>
            <p className="text-gray-600 mt-2">System Zarządzania Biblioteką</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Zaloguj się
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-600 text-center">
            <p>Demo: bibliotekarz@biblioteka.pl</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Panel Bibliotekarza</h1>
                <p className="text-indigo-200 text-sm">System Zarządzania Biblioteką</p>
              </div>
            </div>
            <button
              onClick={() => setToken('')}
              className="bg-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-800 transition"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('books')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'books'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <Book className="w-5 h-5 inline mr-2" />
              Książki
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'loans'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Wypożyczenia
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {activeTab === 'books' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Zarządzanie Książkami</h2>
                <button
                  onClick={() => setShowAddBook(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Dodaj książkę
                </button>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Szukaj po tytule, autorze lub ISBN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchBooks()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={searchBooks}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Szukaj
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {books.map((book) => (
                <div key={book.book_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{book.title}</h3>
                      <p className="text-gray-600 mb-1"><strong>Autor:</strong> {book.author}</p>
                      <p className="text-gray-600 mb-1"><strong>ISBN:</strong> {book.isbn}</p>
                      <p className="text-gray-600 mb-1"><strong>Wydawnictwo:</strong> {book.publisher}</p>
                      <p className="text-gray-600 mb-1"><strong>Rok:</strong> {book.publication_year}</p>
                      <p className="text-gray-600 mb-1"><strong>Kategoria:</strong> {book.category_name}</p>
                      <div className="mt-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          book.available_copies > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Dostępne: {book.available_copies} / {book.total_copies}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingBook(book)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.book_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showAddBook && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                  <h3 className="text-2xl font-bold mb-4">Dodaj nową książkę</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tytuł</label>
                      <input
                        type="text"
                        value={newBook.title}
                        onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Autor</label>
                      <input
                        type="text"
                        value={newBook.author}
                        onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">ISBN</label>
                        <input
                          type="text"
                          value={newBook.isbn}
                          onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Rok wydania</label>
                        <input
                          type="number"
                          value={newBook.publicationYear}
                          onChange={(e) => setNewBook({ ...newBook, publicationYear: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Wydawnictwo</label>
                      <input
                        type="text"
                        value={newBook.publisher}
                        onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Kategoria</label>
                      <select
                        value={newBook.categoryId}
                        onChange={(e) => setNewBook({ ...newBook, categoryId: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="">Wybierz kategorię</option>
                        {categories.map((cat) => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Liczba egzemplarzy</label>
                      <input
                        type="number"
                        min="1"
                        value={newBook.totalCopies}
                        onChange={(e) => setNewBook({ ...newBook, totalCopies: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Opis</label>
                      <textarea
                        value={newBook.description}
                        onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        rows="3"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddBook}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                      >
                        Dodaj książkę
                      </button>
                      <button
                        onClick={() => setShowAddBook(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {editingBook && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                  <h3 className="text-2xl font-bold mb-4">Edytuj książkę</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tytuł</label>
                      <input
                        type="text"
                        value={editingBook.title}
                        onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Autor</label>
                      <input
                        type="text"
                        value={editingBook.author}
                        onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateBook}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                      >
                        Zapisz zmiany
                      </button>
                      <button
                        onClick={() => setEditingBook(null)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'loans' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Aktywne Wypożyczenia</h2>
                <button
                  onClick={() => setShowLoanForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus className="w-5 h-5 inline mr-2" />
                  Nowe wypożyczenie
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {loans.map((loan) => (
                <div key={loan.loan_id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{loan.title}</h3>
                      <p className="text-gray-600 mb-1"><strong>Autor:</strong> {loan.author}</p>
                      <p className="text-gray-600 mb-1"><strong>Czytelnik:</strong> {loan.first_name} {loan.last_name}</p>
                      <p className="text-gray-600 mb-1"><strong>Email:</strong> {loan.email}</p>
                      <p className="text-gray-600 mb-1"><strong>Data wypożyczenia:</strong> {new Date(loan.loan_date).toLocaleDateString('pl-PL')}</p>
                      <p className="text-gray-600 mb-1"><strong>Termin zwrotu:</strong> {new Date(loan.due_date).toLocaleDateString('pl-PL')}</p>
                    </div>
                    <button
                      onClick={() => handleReturnBook(loan.loan_id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Zwróć książkę
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {showLoanForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-2xl font-bold mb-4">Nowe wypożyczenie</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">ID Czytelnika</label>
                      <input
                        type="number"
                        value={newLoan.userId}
                        onChange={(e) => setNewLoan({ ...newLoan, userId: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ID Książki</label>
                      <input
                        type="number"
                        value={newLoan.bookId}
                        onChange={(e) => setNewLoan({ ...newLoan, bookId: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Termin zwrotu</label>
                      <input
                        type="date"
                        value={newLoan.dueDate}
                        onChange={(e) => setNewLoan({ ...newLoan, dueDate: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddLoan}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
                      >
                        Zarejestruj wypożyczenie
                      </button>
                      <button
                        onClick={() => setShowLoanForm(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianPanel;