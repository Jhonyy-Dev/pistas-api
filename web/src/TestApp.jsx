import React from 'react';

function TestApp() {
  return (
    <div style={{ 
      margin: '0', 
      padding: '0',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#121212',
      color: '#ffffff'
    }}>
      <h1 style={{ marginBottom: '20px' }}>PISTAS CHIVERAS</h1>
      <p>Aplicación de prueba para verificar el renderizado básico</p>
      <div style={{
        marginTop: '20px',
        padding: '20px',
        background: '#1e1e1e',
        borderRadius: '5px',
        width: '80%',
        maxWidth: '400px'
      }}>
        <p>Si puedes ver este mensaje, React está funcionando correctamente.</p>
        <button 
          style={{
            background: '#6200ee',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Botón de prueba
        </button>
      </div>
    </div>
  );
}

export default TestApp;
