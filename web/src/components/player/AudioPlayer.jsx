import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  audioElement,
  updateProgress, 
  playNext, 
  playPrevious, 
  togglePlay,
  setVolume,
  setCurrentTime
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
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const progressBarRef = useRef(null);
  const progressContainerRef = useRef(null);
  const audioRef = useRef(null);
  
  // Actualizar la barra de progreso cada segundo
  useEffect(() => {
    if (audioElement) {
      // Evento para actualizar el progreso
      const handleTimeUpdate = () => {
        const currentTime = audioElement.currentTime;
        dispatch(updateProgress({ 
          currentTime: currentTime, 
          duration: audioElement.duration || 0 
        }));
        
        // Actualizar la variable CSS para el gradiente de la barra de progreso
        if (progressBarRef.current && audioElement.duration > 0) {
          const progressPercent = (currentTime / audioElement.duration) * 100;
          progressBarRef.current.style.setProperty('--progress-percent', `${progressPercent}%`);
          
          // Actualizar también el ancho del elemento visual de progreso (importante para móviles)
          const progressBarFilledElements = document.querySelectorAll('.progress-bar-filled');
          progressBarFilledElements.forEach(element => {
            element.style.width = `${progressPercent}%`;
          });
          
          // Actualizar la posición del handle (importante para móviles)
          const progressHandleElements = document.querySelectorAll('.progress-handle');
          progressHandleElements.forEach(element => {
            element.style.left = `${progressPercent}%`;
          });
        }
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
    // Verifica explícitamente por Infinity, NaN o valores no válidos
    if (time !== undefined && time !== null && isFinite(time) && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    // Si el audio está cargando pero aún no tiene duración definida
    if (currentTrack && isPlaying && !duration) {
      return 'Cargando...';
    }
    // Valor por defecto
    return '0:00';
  };
  
  // Asegurar que el tiempo se actualice regularmente incluso en dispositivos móviles
  useEffect(() => {
    let timer;
    if (isPlaying && audioElement) {
      timer = setInterval(() => {
        const current = audioElement.currentTime;
        // Forzar actualización del tiempo y barra de progreso cada 500ms
        if (current !== currentTime) {
          dispatch(updateProgress({
            currentTime: current,
            duration: audioElement.duration || 0
          }));
        }
      }, 500);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, dispatch, currentTime, audioElement]);
  
  // Detectar si es un dispositivo móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        window.innerWidth <= 768
      );
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Manejar cambio manual en la barra de progreso (desde input range)
  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    updateAudioTime(newTime);
  };
  
  // Manejar eventos touch en la barra de progreso
  const handleProgressTouchStart = (e) => {
    setIsDraggingProgress(true);
    handleProgressTouch(e);
  };
  
  const handleProgressTouchMove = (e) => {
    if (isDraggingProgress) {
      handleProgressTouch(e);
    }
  };
  
  const handleProgressTouchEnd = () => {
    setIsDraggingProgress(false);
  };
  
  // Función para manejar los eventos touch y actualizar el tiempo
  const handleProgressTouch = (e) => {
    if (!progressContainerRef.current || !duration) return;
    
    e.preventDefault(); // Prevenir scroll
    
    // Obtener la posición horizontal del toque
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = progressContainerRef.current.getBoundingClientRect();
    const position = touch.clientX - rect.left;
    const containerWidth = rect.width;
    
    // Calcular la proporción y el nuevo tiempo
    const percentage = Math.min(Math.max(position / containerWidth, 0), 1);
    const newTime = percentage * duration;
    
    // Actualizar el tiempo del audio
    updateAudioTime(newTime);
  };
  
  // Actualizar el tiempo del audio (lógica común)
  const updateAudioTime = (newTime) => {
    if (audioElement && isFinite(newTime)) {
      audioElement.currentTime = newTime;
      dispatch(updateProgress({ 
        currentTime: newTime, 
        duration: duration 
      }));
      
      // Si estaba pausado, mantener pausado después de adelantar/retroceder
      if (!isPlaying && audioElement.paused) {
        audioElement.pause();
      }
    }
  };
  
  // Manejar clic directo en la barra de progreso (para no-móviles)
  const handleProgressBarClick = (e) => {
    if (!progressContainerRef.current || !duration) return;
    
    const rect = progressContainerRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const containerWidth = rect.width;
    
    const percentage = Math.min(Math.max(position / containerWidth, 0), 1);
    const newTime = percentage * duration;
    
    updateAudioTime(newTime);
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
  
  // Si no hay pista actual, mostrar un reproductor en estado inactivo con la misma estructura
  if (!currentTrack) {
    return (
      <div className="audio-player">
        {/* Barra de progreso superior en estado inactivo */}
        <div className="progress-bar-container">
          <input
            type="range"
            className="progress-bar"
            min="0"
            max="100"
            value="0"
            disabled
            aria-label="Progreso de reproducción"
          />
          <div className="progress-bar-filled" style={{width: '0%'}}></div>
        </div>

        <div className="player-content">
          {/* Título de la canción en la parte superior */}
          <div className="track-name-container">
            <div className="track-name">
              No hay pista seleccionada
            </div>
          </div>

          {/* Controles de reproducción en el centro */}
          <div className="controls-container">
            {/* Tiempo actual */}
            <div className="player-time time-current">
              <span>0:00</span>
            </div>

            {/* Botón anterior */}
            <button 
              className="player-control-button prev-button"
              disabled
              aria-label="Anterior canción"
            >
              <FaStepBackward />
            </button>
            
            {/* Botón play/pause */}
            <button 
              className="player-control-button play-button center-play-button"
              disabled
              aria-label="Reproducir"
            >
              <FaPlay />
            </button>
            
            {/* Botón siguiente */}
            <button 
              className="player-control-button next-button"
              disabled
              aria-label="Siguiente canción"
            >
              <FaStepForward />
            </button>

            {/* Tiempo total */}
            <div className="player-time time-total">
              <span>0:00</span>
            </div>
          </div>

          {/* Control de volumen en la parte inferior */}
          <div className="volume-container-wrapper">
            <div className="volume-control">
              <button 
                className="volume-button"
                onClick={handleMuteToggle}
                aria-label="Silenciar"
              >
                {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
              
              <div className="volume-container">
                <div className="volume-level" style={{ width: `${volume * 100}%` }}></div>
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
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="audio-player">
      {/* Barra de progreso superior roja e interactiva */}
      <div 
        className={`progress-bar-container ${isMobile ? 'mobile' : ''} ${isDraggingProgress ? 'dragging' : ''}`}
        ref={progressContainerRef}
        onClick={!isMobile ? handleProgressBarClick : undefined}
        onTouchStart={isMobile ? handleProgressTouchStart : undefined}
        onTouchMove={isMobile ? handleProgressTouchMove : undefined}
        onTouchEnd={isMobile ? handleProgressTouchEnd : undefined}
        onTouchCancel={isMobile ? handleProgressTouchEnd : undefined}
      >
        <input
          ref={progressBarRef}
          type="range"
          className="progress-bar"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleProgressChange}
          aria-label="Progreso de reproducción"
        />
        <div 
          className="progress-bar-filled" 
          style={{width: `${duration && isFinite(duration) ? (currentTime / duration) * 100 : 0}%`}}
        ></div>
        <div 
          className="progress-handle"
          style={{left: `${duration && isFinite(duration) ? (currentTime / duration) * 100 : 0}%`}}
        ></div>
      </div>

      <div className="player-content">
        {/* Título de la canción en la parte superior */}
        <div className="track-name-container">
          <div className="track-name">
            {currentTrack.title}
          </div>
        </div>

        {/* Controles de reproducción en el centro */}
        <div className="controls-container">
          {/* Tiempo actual */}
          <div className="player-time time-current">
            <span id="time-display">{formatTime(currentTime)}</span>
          </div>

          {/* Botón anterior */}
          <button 
            className="player-control-button prev-button"
            onClick={() => dispatch(playPrevious())}
            disabled={currentIndex <= 0}
            aria-label="Anterior canción"
          >
            <FaStepBackward />
          </button>
          
          {/* Botón play/pause */}
          <button 
            className="player-control-button play-button center-play-button"
            onClick={() => dispatch(togglePlay())}
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          
          {/* Botón siguiente */}
          <button 
            className="player-control-button next-button"
            onClick={() => dispatch(playNext())}
            disabled={currentIndex >= queue.length - 1}
            aria-label="Siguiente canción"
          >
            <FaStepForward />
          </button>

          {/* Tiempo total */}
          <div className="player-time time-total">
            <span>{isFinite(duration) ? formatTime(duration) : '0:00'}</span>
          </div>
        </div>

        {/* Control de volumen en la parte inferior */}
        <div className="volume-container-wrapper">
          <div className="volume-control">
            <button 
              className="volume-button"
              onClick={handleMuteToggle}
              aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            >
              {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            
            <div className="volume-container">
              <div className="volume-level" style={{ width: `${volume * 100}%` }}></div>
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
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
