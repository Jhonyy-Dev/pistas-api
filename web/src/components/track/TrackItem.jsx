import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaPlay, FaPause, FaInfoCircle } from 'react-icons/fa';
import { pause, play, togglePlay } from '../../store/slices/playerSlice';
import { audioElement } from '../../store/slices/playerSlice';
import './TrackItem.css';

const TrackItem = ({ track, isActive, isPlaying, onPlay }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  
  // Monitoreamos el estado real del reproductor desde Redux
  const playerState = useSelector(state => state.player);
  
  // Debug para verificar estado
  useEffect(() => {
    if (isActive) {
      console.log(`TrackItem ${track.title} - isActive: ${isActive}, Redux isPlaying: ${playerState.isPlaying}, Props isPlaying: ${isPlaying}`);
    }
  }, [isActive, playerState.isPlaying, isPlaying, track.title]);
  
  // Función para manejar el clic en el botón de reproducir/pausar
  const handlePlayPauseClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log(`Click en botón de track ${track.title} - isActive: ${isActive}, isPlaying: ${isPlaying}`);
    
    if (!isActive) {
      // Si no es la pista activa, iniciar nueva reproducción
      console.log('Iniciando nueva pista');
      setIsLoading(true);
      onPlay(); // Esta función viene de props y cambia la pista actual
      setTimeout(() => setIsLoading(false), 1000);
    } else {
      // Si es la pista activa, alternar entre reproducir y pausar
      if (isPlaying) {
        console.log('PAUSANDO REPRODUCCIÓN ACTIVA');
        dispatch(pause());
        if (audioElement) audioElement.pause();
      } else {
        console.log('REANUDANDO REPRODUCCIÓN');
        dispatch(play());
        if (audioElement) audioElement.play();
      }
    }
  };
  
  const handleViewDetails = (e) => {
    e.stopPropagation(); // Evitar que el evento se propague al contenedor
    navigate(`/tracks/${track.id}`);
  };
  
  // Formatear duración en minutos:segundos
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Formatear tamaño del archivo en MB
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };
  
  // Determinar el estilo del botón de reproducción
  const playButtonClass = `track-play-button ${isActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`;
  
  // Determinar el icono para el botón principal dependiendo del estado
  let playIcon;
  if (isLoading) {
    playIcon = '⏳'; // Mostrar indicador de carga
  } else if (isActive && isPlaying) {
    playIcon = <FaPause />; // Mostrar ícono de pausa si está activa y reproduciendo
  } else {
    playIcon = <FaPlay />; // Mostrar ícono de reproducción en otros casos
  }

  return (
    <div className={`track-item ${isActive ? 'active' : ''}`}>
      <div className="track-controls" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {/* Botón unificado de reproducir/pausar */}
        <button 
          className={playButtonClass}
          onClick={handlePlayPauseClick}
          aria-label={isActive && isPlaying ? "Pausar" : "Reproducir"}
          style={{
            cursor: 'pointer',
            zIndex: 999,
            position: 'relative',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isActive && isPlaying ? '#ff4444' : '#38bdf8',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            fontSize: '16px',
            outline: 'none',
            transition: 'background-color 0.3s ease',
            boxShadow: isActive ? '0 0 10px rgba(0, 0, 0, 0.5)' : 'none'
          }}
          data-testid={isActive && isPlaying ? "pause-button" : "play-button"}
        >
          {isActive && isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        
        {/* Quitamos el botón adicional de pausa y usamos solo el botón principal que ahora tiene ambas funcionalidades */}
        
        {isActive && (
          <span 
            className="status-text" 
            style={{
              color: isPlaying ? '#38bdf8' : '#ff4444',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: isPlaying ? '1px solid #38bdf8' : '1px solid #ff4444',
              borderRadius: '50px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'inline-block',
              marginLeft: '45px',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            {isPlaying ? "Reproduciendo" : "Pausado"}
          </span>
        )}
      </div>
      
      <div className="track-info" onClick={() => navigate(`/tracks/${track.id}`)}>
        <div className="track-title">
          {track.title || track.fileName}
          {isActive && <span className="active-indicator"></span>}
        </div>
        <div className="track-meta">
          {track.duration && (
            <span className="track-duration">{formatDuration(track.duration)}</span>
          )}
          {track.fileSize && (
            <span className="track-size">{formatFileSize(track.fileSize)}</span>
          )}
          {track.plays > 0 && (
            <span className="track-plays">⭐ {track.plays}</span>
          )}
          <button
            className="info-button"
            onClick={handleViewDetails}
            aria-label="Ver detalles"
          >
            <FaInfoCircle />
          </button>
        </div>
      </div>
      
      <div className="track-actions">
      </div>
    </div>
  );
};

export default TrackItem;
