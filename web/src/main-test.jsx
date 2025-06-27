import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const TestApp = () => {
  return (
    <div style={{ 
      backgroundColor: '#121212', 
      color: 'white',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Poppins, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center' }}>PISTAS CHIVERAS</h1>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <h2>Prueba de renderizado</h2>
        <p>Si puedes ver este contenido, React está funcionando correctamente.</p>
        <button 
          style={{ 
            backgroundColor: '#6200ee',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => alert('¡Botón funcionando!')}
        >
          Probar interactividad
        </button>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>,
);
