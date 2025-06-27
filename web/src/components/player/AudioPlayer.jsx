import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  audioElement,
  updateProgress, 
  playNext, 
  playPrevious, 
  togglePlay,
  setVolume
} from '../../store/slices/playerSlice';
import './AudioPlayer.css';

// Importa los iconos necesarios
import { 
  FaPlay, 
  FaPause, 
  FaStepBackward, 
  FaStepForward, 
  FaVolumeUp, 
  FaVolumeMute 
} from 'react-icons/fa';

const AudioPlayer = () => {
  const dispatch = useDispatch();
  const { currentTrack, isPlaying, volume, currentTime, duration, queue, currentIndex } = useSelector(state => state.player);
  
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const progressBarRef = useRef(null);
  
  // Actualizar la barra de progreso cada segundo
  useEffect(() => {
    if (audioElement) {
      // Evento para actualizar el progreso
      const handleTimeUpdate = () => {
        dispatch(updateProgress({ 
          currentTime: audioElement.currentTime, 
          duration: audioElement.duration || 0 
        }));
      };
      
      // Evento para pasar a la siguiente pista cuando termina la actual
      const handleEnded = () => {
        dispatch(playNext());
      };
      
      // Añadir event listeners al elemento de audio
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('ended', handleEnded);
      
      // Establecer el volumen inicial
      audioElement.volume = volume;
      
      return () => {
        // Limpiar event listeners
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        audioElement.removeEventListener('ended', handleEnded);
      };
    }
  }, [dispatch, volume]);
  
  // Formatear tiempo en mm:ss
  const formatTime = (time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '0:00';
  };
  
  // Manejar cambios en la barra de progreso
  const handleProgressChange = (e) => {
    const newTime = e.target.value;
    if (audioElement) {
      audioElement.currentTime = newTime;
      dispatch(updateProgress({ 
        currentTime: newTime, 
        duration: duration 
      }));
    }
  };
  
  // Manejar cambios en el volumen
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    dispatch(setVolume(newVolume));
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };
  
  // Alternar entre silencio y volumen
  const handleMuteToggle = () => {
    if (isMuted) {
      // Restaurar volumen anterior
      dispatch(setVolume(previousVolume > 0 ? previousVolume : 0.5));
      setIsMuted(false);
    } else {
      // Guardar volumen actual y silenciar
      setPreviousVolume(volume);
      dispatch(setVolume(0));
      setIsMuted(true);
    }
  };
  
  // Si no hay pista actual, no mostrar el reproductor
  if (!currentTrack) {
    return null;
  }
  
  return (
    <div className="audio-player">
      <div className="track-info">
        <p className="track-title">{currentTrack.title}</p>
        {queue.length > 0 && (
          <p className="queue-info">
            {currentIndex + 1} / {queue.length}
          </p>
        )}
      </div>
      
      <div className="player-controls">
        <button 
          className="control-button"
          onClick={() => dispatch(playPrevious())}
          disabled={currentIndex <= 0}
          aria-label="Anterior canción"
        >
          <FaStepBackward />
        </button>
        
        <button 
          className="control-button play-button"
          onClick={() => dispatch(togglePlay())}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        
        <button 
          className="control-button"
          onClick={() => dispatch(playNext())}
          disabled={currentIndex >= queue.length - 1}
          aria-label="Siguiente canción"
        >
          <FaStepForward />
        </button>
      </div>
      
      <div className="progress-container">
        <span className="time">{formatTime(currentTime)}</span>
        <input
          type="range"
          className="progress-bar"
          ref={progressBarRef}
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          aria-label="Progreso de reproducción"
        />
        <span className="time">{formatTime(duration)}</span>
      </div>
      
      <div className="volume-container">
        <button 
          className="volume-button"
          onClick={handleMuteToggle}
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
        >
          {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Control de volumen"
        />
      </div>
    </div>
  );
};

export default AudioPlayer;
