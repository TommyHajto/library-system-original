import React, { useState, useEffect } from 'react';
import { Book, User, Clock, Calendar, BookmarkPlus, Search, LogOut, Edit2 } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

const ReaderPortal = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [books, setBooks] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [token, setToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '', address: ''
  });
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', phone: '', address: ''
  });

  useEffect(() => {
    if (token) fetchData();
  }, [token, activeTab]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (activeTab === 'catalog') {
        const res = await fetch(`${API_URL}/books`);
        setBooks(await res.json());
      } else if (activeTab === 'myLoans') {
        const res = await fetch(`${API_URL}/loans/user/${currentUser.userId}`, { headers });
        setMyLoans(await res.json());
      } else if (activeTab === 'reservations') {
        const res = await fetch(`${API_URL}/reservations/user`, { headers });
        setMyReservations(await res.json());
      } else if (activeTab === 'profile') {
        const res = await fetch(`${API_URL}/users/${currentUser.userId}`, { headers });
        const data = await res.json();
        setUserProfile(data);
        setProfileForm({
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone || '',
          address: data.address || ''
        });
      }
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

  const handleRegister = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      if (res.ok) {
        alert('Konto utworzone! Możesz się teraz zalogować.');
        setShowRegister(false);
        setRegisterForm({ email: '', password: '', firstName: '', lastName: '', phone: '', address: '' });
      } else {
        const error = await res.json();
        alert(error.error || 'Błąd rejestracji');
      }
    } catch (error) {
      console.error('Błąd rejestracji:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${currentUser.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        setEditProfile(false);
        fetchData();
        alert('Profil zaktualizowany');
      }
    } catch (error) {
      console.error('Błąd aktualizacji profilu:', error);
    }
  };

  const handleReserveBook = async (bookId) => {
    try {
      const res = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookId })
      });
      if (res.ok) {
        alert('Książka zarezerwowana pomyślnie!');
      } else {
        const error = await res.json();
        alert(error.error || 'Błąd rezerwacji');
      }
    } catch (error) {
      console.error('Błąd rezerwacji:', error);
    }
  };

  const handleExtendLoan = async (loanId) => {
    try {
      const res = await fetch(`${API_URL}/loans/${loanId}/extend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Wniosek o przedłużenie wypożyczenia został złożony');
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Błąd przedłużenia');
      }
    } catch (error) {
      console.error('Błąd przedłużenia:', error);
    }
  };

  const searchBooks = async () => {
    if (!searchQuery) {
      fetchData();
      return;
    }
    try {
      const res = await fetch(`${API_URL}/books/search?query=${encodeURIComponent(searchQuery)}`);
      setBooks(await res.json());
    } catch (error) {
      console.error('Błąd wyszukiwania:', error);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Book className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Portal Czytelnika</h1>
            <p className="text-gray-600 mt-2">Biblioteka Online</p>
          </div>
          {!showRegister ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
                <input type="password" value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"/>
              </div>
              <button onClick={handleLogin}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
                Zaloguj się
              </button>
              <button onClick={() => setShowRegister(true)}
                className="w-full bg-white text-purple-600 py-2 rounded-lg border-2 border-purple-600 hover:bg-purple-50 transition">
                Załóż konto
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Rejestracja nowego konta</h2>
              <input type="email" placeholder="Email" value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"/>
              <input type="password" placeholder="Hasło" value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"/>
              <input type="text" placeholder="Imię" value={registerForm.firstName}
                onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"/>
              <input type="text" placeholder="Nazwisko" value={registerForm.lastName}
                onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"/>
              <input type="tel" placeholder="Telefon" value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"/>
              <textarea placeholder="Adres" value={registerForm.address}
                onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg" rows="2"/>
              <button onClick={handleRegister}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
                Zarejestruj się
              </button>
              <button onClick={() => setShowRegister(false)}
                className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">
                Powrót do logowania
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Book className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Portal Czytelnika</h1>
                <p className="text-purple-200 text-sm">Witaj, {currentUser?.firstName}!</p>
              </div>
            </div>
            <button onClick={() => setToken('')}
              className="bg-purple-700 px-4 py-2 rounded-lg hover:bg-purple-800 transition flex items-center">
              <LogOut className="w-5 h-5 mr-2" />Wyloguj
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'catalog', icon: Search, label: 'Katalog' },
              { id: 'myLoans', icon: Clock, label: 'Moje wypożyczenia' },
              { id: 'reservations', icon: BookmarkPlus, label: 'Rezerwacje' },
              { id: 'profile', icon: User, label: 'Profil' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                  activeTab === tab.id ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:text-purple-600'
                }`}>
                <tab.icon className="w-5 h-5 inline mr-2" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {activeTab === 'catalog' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Katalog Książek</h2>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input type="text" placeholder="Szukaj książek..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchBooks()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"/>
                </div>
                <button onClick={searchBooks}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
                  Szukaj
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <div key={book.book_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{book.title}</h3>
                  <p className="text-gray-600 mb-1 text-sm"><strong>Autor:</strong> {book.author}</p>
                  <p className="text-gray-600 mb-1 text-sm"><strong>Kategoria:</strong> {book.category_name}</p>
                  <p className="text-gray-600 mb-3 text-sm"><strong>Rok:</strong> {book.publication_year}</p>
                  <div className="mb-3">
                    {book.available_copies > 0 ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Dostępna ({book.available_copies} egz.)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Niedostępna
                      </span>
                    )}
                  </div>
                  {book.available_copies === 0 && (
                    <button onClick={() => handleReserveBook(book.book_id)}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center">
                      <BookmarkPlus className="w-4 h-4 mr-2" />Zarezerwuj
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'myLoans' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Historia Wypożyczeń</h2>
            </div>
            <div className="grid gap-4">
              {myLoans.map((loan) => (
                <div key={loan.loan_id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{loan.title}</h3>
                      <p className="text-gray-600 mb-1"><strong>Autor:</strong> {loan.author}</p>
                      <p className="text-gray-600 mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        <strong>Wypożyczono:</strong> {new Date(loan.loan_date).toLocaleDateString('pl-PL')}
                      </p>
                      <p className="text-gray-600 mb-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        <strong>Termin zwrotu:</strong> {new Date(loan.due_date).toLocaleDateString('pl-PL')}
                      </p>
                      {loan.return_date && (
                        <p className="text-gray-600 mb-1">
                          <strong>Zwrócono:</strong> {new Date(loan.return_date).toLocaleDateString('pl-PL')}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          loan.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          loan.status === 'returned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {loan.status === 'active' ? 'Aktywne' :
                           loan.status === 'returned' ? 'Zwrócone' : 'Przeterminowane'}
                        </span>
                      </div>
                    </div>
                    {loan.status === 'active' && !loan.extended && (
                      <button onClick={() => handleExtendLoan(loan.loan_id)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
                        Przedłuż
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Moje Rezerwacje</h2>
            </div>
            <div className="grid gap-4">
              {myReservations.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                  <BookmarkPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nie masz aktywnych rezerwacji</p>
                </div>
              ) : (
                myReservations.map((reservation) => (
                  <div key={reservation.reservation_id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{reservation.title}</h3>
                    <p className="text-gray-600 mb-1"><strong>Autor:</strong> {reservation.author}</p>
                    <p className="text-gray-600 mb-1">
                      <strong>Data rezerwacji:</strong> {new Date(reservation.reservation_date).toLocaleDateString('pl-PL')}
                    </p>
                    <p className="text-gray-600 mb-1">
                      <strong>Ważna do:</strong> {new Date(reservation.expiry_date).toLocaleDateString('pl-PL')}
                    </p>
                    <div className="mt-2">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Oczekuje
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && userProfile && (
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Mój Profil</h2>
                <button onClick={() => setEditProfile(!editProfile)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center">
                  <Edit2 className="w-4 h-4 mr-2" />{editProfile ? 'Anuluj' : 'Edytuj'}
                </button>
              </div>
              {!editProfile ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                      <p className="text-gray-900 text-lg">{userProfile.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                      <p className="text-gray-900 text-lg">{userProfile.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900 text-lg">{userProfile.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                      <p className="text-gray-900 text-lg">{userProfile.phone || 'Nie podano'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                    <p className="text-gray-900 text-lg">{userProfile.address || 'Nie podano'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Konto utworzone</label>
                    <p className="text-gray-900 text-lg">{new Date(userProfile.created_at).toLocaleDateString('pl-PL')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Imię" value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"/>
                    <input type="text" placeholder="Nazwisko" value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"/>
                  </div>
                  <input type="tel" placeholder="Telefon" value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"/>
                  <textarea placeholder="Adres" value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg" rows="3"/>
                  <button onClick={handleUpdateProfile}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
                    Zapisz zmiany
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReaderPortal;