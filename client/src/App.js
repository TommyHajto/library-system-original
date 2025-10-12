import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LibrarianPanel from './LibrarianPanel';
import ReaderPortal from './ReaderPortal';

function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">System Biblioteki</h1>
        <div className="space-x-4">
          <Link to="/librarian" className="bg-indigo-600 text-white px-6 py-3 rounded-lg">
            Panel Bibliotekarza
          </Link>
          <Link to="/reader" className="bg-purple-600 text-white px-6 py-3 rounded-lg">
            Portal Czytelnika
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/librarian" element={<LibrarianPanel />} />
        <Route path="/reader" element={<ReaderPortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;