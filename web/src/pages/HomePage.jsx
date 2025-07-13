import React, { useEffect, useState, useCallback } from 'react';
import './HomePage.css';
import '../components/pagination/Pagination.css';
import '../components/player/PlayerControls.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTracks, fetchTrackStreamUrl } from '../store/slices/tracksSlice';
import { setCurrentTrack, play, pause, togglePlay, audioElement } from '../store/slices/playerSlice';
import { FaStop, FaSpinner, FaSearch, FaChevronLeft, FaChevronRight, FaClock, FaFile, FaMusic, FaVolumeUp, FaVolumeDown, FaBackward, FaForward, FaPlay, FaPause } from 'react-icons/fa';
import pauseIcon from '../assets/Play/pause.png';
import playIcon from '../assets/Play/play.png';

const HomePage = () => {
  const dispatch = useDispatch();
  const { tracks, status, error, pagination, streamUrls } = useSelector(state => state.tracks);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  // Ya no necesitamos un elemento de audio local
  const [isLoading, setIsLoading] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Manejar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Manejar búsqueda
  const handleSearch = useCallback(() => {
    setCurrentPage(1); // Resetear a la primera página cuando se busca
    dispatch(fetchTracks({ 
      page: 1, 
      limit: itemsPerPage,
      search: searchTerm.trim() 
    }));
  }, [dispatch, searchTerm, itemsPerPage]);
  
  // Manejar eventos de paginación
  const handlePageChange = useCallback((newPage) => {
    // No permitir ir a páginas menores que 1
    if (newPage < 1) {
      return;
    }
    
    // Lógica de navegación según el tipo de búsqueda
    // Identificar términos comunes que probablemente tengan muchos resultados
    const commonTerms = ['mix', 'hora', 'loca', 'remix', 'cumbia', 'reggaeton', 'dj'];
    const isCommonSearch = searchTerm.trim() && 
      commonTerms.some(term => searchTerm.toLowerCase().includes(term));
    
    if (searchTerm.trim()) {
      if (isCommonSearch) {
        // Para términos comunes, permitir hasta 80 páginas igual que el catálogo completo
        if (newPage > 80) {
          return;
        }
        // Continuar, no verificar hasMore
      } else {
        // Para otros términos menos comunes, respetar hasMore
        if (newPage > currentPage && pagination?.hasMore === false) {
          return;
        }
      }
    } else {
      // Sin búsqueda, permitir hasta 80 páginas (~4000 canciones)
      if (newPage > 80) {
        return;
      }
    }
    setCurrentPage(newPage);
    dispatch(fetchTracks({ 
      page: newPage, 
      limit: itemsPerPage,
      search: searchTerm.trim() 
    }));
  }, [dispatch, itemsPerPage, searchTerm, currentPage, pagination]);

  // Cargar pistas al montar el componente
  useEffect(() => {
    // Mostrar mensaje en consola para depuración
    console.log('Cargando pistas desde la API...');
    dispatch(fetchTracks({ 
      page: currentPage, 
      limit: itemsPerPage,
      search: searchTerm.trim() 
    }));
  }, [dispatch]);

  // Obtener la referencia al estado global del reproductor
  const playerState = useSelector(state => state.player);
  
  // Sincronizar estado local cuando cambia el estado global
  useEffect(() => {
    // Actualizar el estado local del reproductor basado en el estado global
    if (playerState.currentTrack) {
      setCurrentPlaying(playerState.currentTrack.id);
      setIsPaused(!playerState.isPlaying);
    } else {
      setCurrentPlaying(null);
      setIsPaused(false);
    }
  }, [playerState.currentTrack, playerState.isPlaying]);

  // Función para reproducir/pausar una pista
  const togglePlay = useCallback(async (track) => {
    // Si ya está reproduciendo esta pista, alternar entre pause y play
    if (playerState.currentTrack && playerState.currentTrack.id === track.id) {
      dispatch(togglePlay());
      return;
    }
    
    try {
      // Obtener URL de streaming
      const actionResult = await dispatch(fetchTrackStreamUrl(track.id));
      
      // Extraer la URL del resultado de la acción
      let streamUrl = null;
      
      if (actionResult && actionResult.payload) {
        // Si el payload es un objeto con propiedad streamUrl
        if (actionResult.payload.streamUrl) {
          streamUrl = actionResult.payload.streamUrl;
        }
        // Si el payload es un objeto con propiedad url
        else if (actionResult.payload.url) {
          streamUrl = actionResult.payload.url;
        }
        // Si el payload mismo es la URL
        else if (typeof actionResult.payload === 'string' && actionResult.payload.includes('http')) {
          streamUrl = actionResult.payload;
        }
      }
      
      // Si no se encontró URL en el resultado, intentar desde el estado
      if (!streamUrl && streamUrls[track.id]) {
        streamUrl = streamUrls[track.id];
      }
      
      if (streamUrl) {
        // Crear track completo con URL
        const trackWithUrl = {
          ...track,
          streamUrl
        };
        
        // Usar el estado global de Redux para reproducir la canción
        setCurrentPlaying(track.id);
        setIsPaused(false);
        
        // Actualizar el estado de Redux para el reproductor fijo
        dispatch(setCurrentTrack(trackWithUrl));
        dispatch(play());
      } else {
        console.error('No se pudo obtener la URL de streaming');
      }
    } catch (err) {
      console.error('Error al reproducir:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, [track.id]: false }));
    }
  }, [audioElement, currentPlaying, isPaused, dispatch, streamUrls]);

  // Formatear duración en formato mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Función para detener la reproducción
  const handleStop = useCallback(() => {
    if (playerState.currentTrack) {
      // Usar el estado global para detener la reproducción
      dispatch(pause());
      // Resetear la pista actual
      dispatch(setCurrentTrack(null));
    }
  }, [playerState.currentTrack, dispatch]);

  return (
    <div style={{
      padding: '20px',
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      backgroundSize: 'cover',
      color: '#ffffff',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}> 
      {/* Círculos decorativos de fondo */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 70%)',
        top: '-100px',
        left: '-50px',
        filter: 'blur(30px)',
        zIndex: '0'
      }}></div>
      
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 70%)',
        bottom: '-150px',
        right: '-100px',
        filter: 'blur(40px)',
        zIndex: '0'
      }}></div>
      
      <div style={{
        position: 'absolute',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, rgba(14, 165, 233, 0.03) 70%)',
        top: '30%',
        right: '15%',
        filter: 'blur(35px)',
        zIndex: '0'
      }}></div>
      

      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '10px 15px'
      }}>
        <h1 style={{ 
          fontSize: windowWidth < 768 ? '2.5rem' : '3rem',
          fontWeight: '800',
          marginBottom: '16px',
          position: 'relative',
          background: 'linear-gradient(to right, #38bdf8, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 2px 10px rgba(56, 189, 248, 0.3)',
          letterSpacing: '-1px'
        }}>SOLO CHIVEROS PERÚ</h1>
        
        <p style={{ 
          fontSize: windowWidth < 768 ? '1.1rem' : '1.2rem',
          color: '#e2e8f0',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6',
          position: 'relative',
          opacity: '0.9'
        }}>Pistas 100% peruanas, las podrás reproducir en tu evento, cuando quieras y cuantas veces quieras</p>
      </div>

        <div style={{ 
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
          padding: window.innerWidth < 768 ? '20px' : '35px',
          borderRadius: '24px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
        {/* Barra de búsqueda */}
        <div style={{ 
          display: 'flex',
          flexDirection: windowWidth < 480 ? 'column' : 'row',
          marginBottom: '30px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '16px',
          padding: '8px',
          gap: '8px',
          alignItems: 'center',
          boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.15), 0 4px 15px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
            marginRight: windowWidth < 480 ? '0' : '10px',
            marginBottom: windowWidth < 480 ? '10px' : '0',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <FaSearch color="#94a3b8" size={16} style={{ marginRight: '12px' }} />
            <input 
              type="text"
              placeholder="Buscar pistas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                width: '100%',
                fontSize: '16px',
                outline: 'none',
                padding: '6px 0',
                fontFamily: '"Inter", "Segoe UI", sans-serif',
              }}
            />
          </div>
          <button 
            onClick={handleSearch}
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.9)',
              border: 'none',
              borderRadius: windowWidth < 480 ? '12px' : '12px',
              padding: windowWidth < 480 ? '12px 20px' : '16px 24px',
              marginLeft: windowWidth < 480 ? '0' : '-1px',
              marginTop: windowWidth < 480 ? '8px' : '0',
              width: windowWidth < 480 ? '100%' : 'auto',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.3px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(56, 189, 248, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.9)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.25)';
            }}
          >
            <span style={{ marginRight: '8px' }}>Buscar</span>
            <FaSearch />
          </button>
        </div>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#3c1e1e', borderRadius: '4px', marginTop: '15px' }}>
          <p>Error al cargar las pistas: {error}</p>
          <p>Mostrando pistas de ejemplo</p>
        </div>
      )}
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {tracks && tracks.length === 0 && !status === 'loading' && (
        <p>No hay pistas disponibles.</p>
      )}
      
      <div style={{ 
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '15px',
          marginBottom: '20px',
          padding: '5px 10px',
          flexWrap: 'wrap'
        }}>
          <h3 style={{
            fontSize: windowWidth < 480 ? '1.3rem' : '1.5rem',
            color: '#e2e8f0',
            fontWeight: '700',
            margin: windowWidth < 480 ? '10px 0' : '0',
            background: 'linear-gradient(45deg, #e2e8f0, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px'
          }}>Pistas disponibles</h3>
          
          {status === 'loading' && 
            <div style={{ 
              color: '#38bdf8', 
              display: 'flex', 
              alignItems: 'center',
              fontSize: windowWidth < 480 ? '0.95rem' : '1rem',
              fontWeight: '500',
              padding: '8px 16px',
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: '10px' }} />
              <span>Cargando pistas...</span>
            </div>
          }
        </div>

        {error && (
          <div style={{ padding: '15px', backgroundColor: '#3c1e1e', borderRadius: '4px', marginTop: '15px' }}>
            <p>Error al cargar las pistas: {error}</p>
            <p>Mostrando pistas de ejemplo</p>
          </div>
        )}
        
        {/* Lista de pistas */}
        <div style={{ margin: windowWidth < 640 ? ' auto' : '30px auto', width: '100%', maxWidth: '100%'}}>
          {/* Título eliminado para evitar duplicación */}
          {tracks && tracks.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%'
            }}>
              {tracks.map(track => (
                <div 
                  key={track.id} 
                  className={`track-card ${currentPlaying === track.id ? 'playing' : ''}`}
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '4px',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: '4px'
                  }}
                >
                  {currentPlaying === track.id && (
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      top: '0',
                      width: '3px',
                      height: '100%',
                      backgroundColor: '#38bdf8'
                    }}></div>
                  )}
                  
                  {/* Botón de play/pause (ahora a la izquierda) */}
                  <div style={{
                    marginRight: '15px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay(track);
                      }}
                      title={currentPlaying === track.id && !isPaused ? "Pausar" : "Reproducir"}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '0',
                        transition: 'transform 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <img 
                        src={currentPlaying === track.id && !isPaused ? pauseIcon : playIcon} 
                        alt={currentPlaying === track.id && !isPaused ? "Pausar" : "Reproducir"}
                        style={{ 
                          width: '30px', 
                          height: '30px',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </button>
                  </div>
                  
                  {/* Información de la pista */}
                  <div 
                    onClick={() => togglePlay(track)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      flex: 1
                    }}
                  >
                    {/* Título de la canción - adaptado para responsive */}
                    <div style={{ 
                      color: '#fff', 
                      fontSize: windowWidth < 640 ? '12px' : '14px',
                      marginBottom: '4px',
                      lineHeight: windowWidth < 640 ? '1.3' : '1.5',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: windowWidth < 400 ? 'nowrap' : 'normal'
                    }}>
                      {(track.name || track.filename || 'Sin título').replace(/^\s*-\s*/, '')}
                    </div>
                    
                    {/* Tamaño e información */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {track.size && (
                        <div style={{ 
                          color: '#94a3b8', 
                          fontSize: windowWidth < 640 ? '11px' : '13px', 
                          display: 'flex', 
                          alignItems: 'center' 
                        }}>
                          <span style={{ marginRight: windowWidth < 480 ? '3px' : '5px' }}>🎵</span>
                          {Math.round(track.size / (1024 * 1024) * 10) / 10} MB
                        </div>
                      )}
                      
                      {/* El texto "Reproduciendo" se ha eliminado de aquí */}
                    </div>
                  </div>
                  
                  {/* Control de stop y estado de reproducción (a la derecha) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginLeft: 'auto'
                  }}>
                    {/* Texto "Reproduciendo" en recuadro ovalado */}
                    {currentPlaying === track.id && (
                      <span style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: isPaused ? '#ff4444' : '#38bdf8',
                        fontSize: windowWidth < 640 ? '10px' : '12px',
                        fontWeight: '600',
                        padding: windowWidth < 480 ? '2px 8px' : '3px 10px',
                        borderRadius: '50px',
                        display: 'inline-block',
                        border: isPaused ? '1px solid #ff4444' : '1px solid #38bdf8',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}>
                        {isPaused ? "Pausado" : "Reproduciendo"}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStop();
                      }}
                      disabled={currentPlaying !== track.id}
                      title="Detener"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: currentPlaying === track.id ? 'pointer' : 'not-allowed',
                        opacity: currentPlaying === track.id ? 1 : 0.5,
                        padding: '0'
                      }}
                    >
                      <div
  style={{
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: currentPlaying === track.id ? '#4ade80' : '#94a3b8',
    animation: currentPlaying === track.id ? 'radarPulse 1.5s infinite' : 'none',
    boxShadow: currentPlaying === track.id ? '0 0 8px #4ade80' : 'none',
    opacity: currentPlaying === track.id ? 1 : 0.5
  }}
/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : status !== 'loading' ? (
            <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: 'rgba(0, 0, 0, 0.3)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div>No hay pistas disponibles</div>
              
              {/* Botón para volver a la página anterior cuando no hay resultados */}
              <button
                onClick={() => {
                  const prevPage = Math.max(currentPage - 1, 1);
                  console.log(`Volviendo a página ${prevPage}`);
                  setCurrentPage(prevPage);
                  dispatch(fetchTracks({
                    page: prevPage,
                    limit: itemsPerPage,
                    search: searchTerm.trim()
                  }));
                }}
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.8)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 25px',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 20px rgba(56, 189, 248, 0.15)',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 25px rgba(56, 189, 248, 0.25)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(56, 189, 248, 0.15)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"></path>
                  <path d="M12 19l-7-7 7-7"></path>
                </svg>
                Volver a página anterior
              </button>
            </div>
          ) : null}
        </div>

        {/* Controles de paginación */}
        {tracks && tracks.length > 0 && (
          <div style={{ 
            marginTop: '40px',
            padding: windowWidth < 480 ? '10px 5px' : '20px 10px', 
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: windowWidth < 640 ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: windowWidth < 640 ? '16px' : '24px',
              width: '100%',
              maxWidth: '600px'
            }}>
              {/* Botón de página anterior */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                style={{
                  backgroundColor: currentPage <= 1 ? 'rgba(15, 23, 42, 0.3)' : 'rgba(56, 189, 248, 0.9)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: windowWidth < 640 ? '12px 18px' : '14px 22px',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: currentPage <= 1 ? 'none' : '0 8px 20px rgba(56, 189, 248, 0.15)',
                  opacity: currentPage <= 1 ? 0.6 : 1,
                  backdropFilter: 'blur(12px)',
                  width: windowWidth < 640 ? '100%' : 'auto',
                  minWidth: windowWidth < 640 ? '100%' : '120px'
                }}
                onMouseOver={(e) => {
                  if (currentPage > 1) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 1)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(56, 189, 248, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage > 1) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.9)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(56, 189, 248, 0.15)';
                  }
                }}
              >
                <FaChevronLeft color="white" />
                <span style={{ color: 'white', marginLeft: '10px', fontWeight: '600', fontSize: windowWidth < 640 ? '14px' : '15px' }}>Anterior</span>
              </button>

              {/* Información de página - Siempre mostrará "Página X de 80" */}
              <div style={{ 
                color: '#e2e8f0', 
                fontSize: windowWidth < 640 ? '15px' : '16px',
                fontWeight: '600',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                padding: windowWidth < 640 ? '14px 18px' : '16px 24px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: windowWidth < 640 ? '100%' : 'auto',
                minWidth: windowWidth < 640 ? '100%' : '180px',
                textAlign: 'center'
              }}>
                Página <span style={{ color: '#38bdf8', fontWeight: '700', margin: '0 5px' }}>{currentPage}</span> de <span style={{ color: '#38bdf8', fontWeight: '700', margin: '0 5px' }}>80</span>
              </div>

              {/* Botón de página siguiente - Siempre habilitado hasta página 80 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= 80}
                style={{
                  backgroundColor: currentPage >= 80 ? 'rgba(15, 23, 42, 0.3)' : 'rgba(56, 189, 248, 0.9)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: windowWidth < 640 ? '12px 18px' : '14px 22px',
                  cursor: currentPage >= 80 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: currentPage >= 80 ? 'none' : '0 8px 20px rgba(56, 189, 248, 0.15)',
                  opacity: currentPage >= 80 ? 0.6 : 1,
                  backdropFilter: 'blur(12px)',
                  width: windowWidth < 640 ? '100%' : 'auto',
                  minWidth: windowWidth < 640 ? '100%' : '120px'
                }}
                onMouseOver={(e) => {
                  if (currentPage < 80) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 1)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 25px rgba(56, 189, 248, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage < 80) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.9)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(56, 189, 248, 0.15)';
                  }
                }}
              >
                <span style={{ color: 'white', marginRight: '10px', fontWeight: '600', fontSize: windowWidth < 640 ? '14px' : '15px' }}>Siguiente</span>
                <FaChevronRight color="white" />
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulseLight {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes glowPulse {
          0% { box-shadow: 0 0 5px rgba(56, 189, 248, 0.2); }
          50% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.4); }
          100% { box-shadow: 0 0 5px rgba(56, 189, 248, 0.2); }
        }
        
        @keyframes radarPulse {
          0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
          100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
      `}</style>
      </div>
    </div>
  );
};

export default HomePage;
