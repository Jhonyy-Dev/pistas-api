import React from 'react';
import { useSelector } from 'react-redux';
import { FaPlay, FaPause, FaClock, FaFileAudio, FaPlayCircle } from 'react-icons/fa';
import './TrackDetails.css';

const TrackDetails = ({ track, onPlay }) => {
  const { currentTrack, isPlaying } = useSelector(state => state.player);
  const isActive = currentTrack?.id === track.id;
  
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

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className={`track-details ${isActive ? 'active' : ''}`}>
      <div className="track-details-header">
        <div className="track-title-container">
          <h3>{track.title || 'Pista sin título'}</h3>
          <div className="track-actions">
            <button 
              className="play-button"
              onClick={onPlay}
            >
              {isActive && isPlaying ? <FaPause /> : <FaPlay />}
              {isActive && isPlaying ? 'Pausar' : 'Reproducir'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="track-details-body">
        <div className="track-detail-item">
          <div className="detail-label">
            <FaClock /> Duración
          </div>
          <div className="detail-value">
            {formatDuration(track.duration)}
          </div>
        </div>
        
        <div className="track-detail-item">
          <div className="detail-label">
            <FaFileAudio /> Tamaño
          </div>
          <div className="detail-value">
            {formatFileSize(track.fileSize)}
          </div>
        </div>
        
        <div className="track-detail-item">
          <div className="detail-label">
            <FaPlayCircle /> Reproducciones
          </div>
          <div className="detail-value">
            {track.plays || 0}
          </div>
        </div>
        
        {track.createdAt && (
          <div className="track-detail-item">
            <div className="detail-label">
              Añadido el
            </div>
            <div className="detail-value">
              {formatDate(track.createdAt)}
            </div>
          </div>
        )}
        
        {track.filename && (
          <div className="track-detail-item">
            <div className="detail-label">
              Nombre de archivo
            </div>
            <div className="detail-value filename">
              {track.filename}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackDetails;
