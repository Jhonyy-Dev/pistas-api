import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaPause, FaInfoCircle } from 'react-icons/fa';
import './TrackItem.css';

const TrackItem = ({ track, isActive, isPlaying, onPlay }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Ejecuta la acción de reproducción con feedback visual
  const handlePlay = (e) => {
    e.stopPropagation(); // Evitar que el evento se propague al contenedor
    
    // Mostrar indicador de carga brevemente
    if (!isActive) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000); // Mostrar loading por 1 segundo máximo
    }
    
    // Llamar a la función de reproducción proporcionada por el padre
    onPlay();
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
  
  // Determinar el icono a mostrar
  let playIcon;
  if (isLoading) {
    playIcon = '⏳'; // Mostrar indicador de carga
  } else if (isPlaying) {
    playIcon = <FaPause />; // Mostrar ícono de pausa si está reproduciendo
  } else {
    playIcon = <FaPlay />; // Mostrar ícono de reproducción por defecto
  }

  return (
    <div className={`track-item ${isActive ? 'active' : ''}`}>
      <div className={playButtonClass} onClick={handlePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
        {playIcon}
        {isActive && !isPlaying && !isLoading && <span className="status-text">Pausado</span>}
        {isActive && isPlaying && <span className="status-text">Reproduciendo</span>}
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
            <span className="track-plays">{track.plays} reproducciones</span>
          )}
        </div>
      </div>
      
      <div className="track-actions">
        <button 
          className="info-button" 
          onClick={handleViewDetails}
          aria-label="Ver detalles"
        >
          <FaInfoCircle />
        </button>
      </div>
    </div>
  );
};

export default TrackItem;
