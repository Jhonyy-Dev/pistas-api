import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaBars, FaTimes, FaHome, FaInfoCircle } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchTerm('');
      setMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <header className="glassmorphism-header">
      <div className="container">
        <div className="logo">
          <Link to="/">
            <h1>SOLO CHIVEROS PERÚ</h1>
          </Link>
        </div>
        
        <div className="mobile-menu-button" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>
        
        <nav className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="nav-links">
            <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaHome /> Inicio
            </Link>
            <Link to="/about" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaInfoCircle /> Acerca de
            </Link>
          </div>
          
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input 
              type="text" 
              placeholder="Buscar pistas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">
              <FaSearch />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
};

export default Header;
