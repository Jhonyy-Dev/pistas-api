import React from 'react';
import { useSelector } from 'react-redux';
import { FaMusic, FaPlay, FaClock } from 'react-icons/fa';
import './StatsDisplay.css';

const StatsDisplay = () => {
  const { tracks, pagination } = useSelector(state => state.tracks);
  
  // Calcular estadísticas
  const totalTracks = pagination?.totalItems || tracks.length;
  const totalPlays = tracks.reduce((sum, track) => sum + (track.plays || 0), 0);
  
  // Calcular tiempo total en segundos
  const totalDurationSeconds = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  
  // Formatear duración total
  const formatTotalDuration = () => {
    if (!totalDurationSeconds) return '0 minutos';
    
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }
  };
  
  return (
    <div className="stats-display">
      <div className="stat-card">
        <div className="stat-icon"><FaMusic /></div>
        <div className="stat-content">
          <div className="stat-value">{totalTracks}</div>
          <div className="stat-label">Pistas</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon"><FaPlay /></div>
        <div className="stat-content">
          <div className="stat-value">{totalPlays}</div>
          <div className="stat-label">Reproducciones</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon"><FaClock /></div>
        <div className="stat-content">
          <div className="stat-value">{formatTotalDuration()}</div>
          <div className="stat-label">Duración Total</div>
        </div>
      </div>
    </div>
  );
};

export default StatsDisplay;
