import React from 'react';
import './AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      <h1>Acerca de PISTAS CHIVERAS</h1>
      
      <div className="about-section">
        <h2>Nuestra Plataforma</h2>
        <p>
          PISTAS CHIVERAS es una plataforma de streaming de música MP3 diseñada para ofrecer una experiencia 
          de escucha ininterrumpida y de alta calidad. Nuestra misión es proporcionar acceso a una amplia biblioteca 
          de pistas musicales.
        </p>
      </div>
      
      <div className="about-section">
        <h2>Características</h2>
        <ul className="features-list">
          <li>
            <strong>Reproductor robusto</strong>
            <p>El reproductor de música permite continuar escuchando aunque cambies de página o minimices la ventana.</p>
          </li>
          <li>
            <strong>Búsqueda avanzada</strong>
            <p>Encuentra rápidamente cualquier pista utilizando nuestro motor de búsqueda.</p>
          </li>
          <li>
            <strong>Navegación intuitiva</strong>
            <p>Interfaz sencilla y amigable que facilita la experiencia de usuario.</p>
          </li>
          <li>
            <strong>Almacenamiento seguro</strong>
            <p>Todas las pistas se almacenan en Backblaze B2 para garantizar su disponibilidad y seguridad.</p>
          </li>
        </ul>
      </div>
      
      <div className="about-section">
        <h2>Tecnologías Utilizadas</h2>
        <p>
          Nuestra plataforma está construida utilizando tecnologías modernas como React, Node.js, Express y 
          Backblaze B2 para el almacenamiento de archivos.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
