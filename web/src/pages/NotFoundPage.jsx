import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Página No Encontrada</h2>
        <p>Lo sentimos, la página que estás buscando no existe.</p>
        <Link to="/" className="back-button">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
