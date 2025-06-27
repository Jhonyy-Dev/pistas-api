import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {currentYear} PISTAS CHIVERAS. Todos los derechos reservados.</p>
        <p className="disclaimer">
          Esta plataforma es solo para propósitos de streaming. No se permite la descarga no autorizada de contenido.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
