import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';
import TrackDetailPage from './pages/TrackDetailPage';
import './App.css';

function App() {
  return (
    <div className="app" style={{ 
        backgroundColor: '#1212120',
        color: 'white',
        minHeight: '0vh',
    }}>
      <header style={{ 
        marginBottom: '0px',
        textAlign: 'center' 
      }}>
        <h1></h1>
        <nav style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '0px',
          marginTop: '0px' 
        }}>
        </nav>
      </header>
      
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tracks/:id" element={<TrackDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      
      <footer style={{ 
        marginTop: '50px',
        textAlign: 'center',
        padding: '20px 0',
        borderTop: '1px solid rgba(255,255,255,0.1)' 
      }}>
        <p>&copy; {new Date().getFullYear()} PISTAS CHIVERAS. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
