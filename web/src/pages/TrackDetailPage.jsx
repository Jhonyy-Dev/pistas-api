import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { tracksService } from '../services/tracksService';
import { fetchTrackStreamUrl } from '../store/slices/tracksSlice';
import { setCurrentTrack, play, setQueue } from '../store/slices/playerSlice';
import TrackDetails from '../components/track/TrackDetails';
import './TrackDetailPage.css';

const TrackDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { streamUrls } = useSelector(state => state.tracks);
  
  useEffect(() => {
    const fetchTrack = async () => {
      try {
        setLoading(true);
        const response = await tracksService.getTrack(id);
        setTrack(response.data);
        setLoading(false);
        
        // Intentar obtener también la URL de streaming para tenerla lista
        try {
          await dispatch(fetchTrackStreamUrl(id));
        } catch (streamError) {
          // Si falla, no es crítico y podemos manejarlo cuando se intente reproducir
          console.log('Error al precargar la URL de streaming', streamError);
        }
      } catch (err) {
        setError('No se pudo cargar la información de esta pista');
        setLoading(false);
      }
    };
    
    if (id) {
      fetchTrack();
    }
  }, [id, dispatch]);
  
  const handlePlayTrack = async () => {
    if (!track) return;
    
    // Si no tenemos una URL de streaming para esta pista, obtenemos una
    if (!streamUrls[track.id]) {
      await dispatch(fetchTrackStreamUrl(track.id));
    }
    
    // Obtener la URL actualizada del estado
    const trackWithUrl = {
      ...track,
      streamUrl: streamUrls[track.id]
    };
    
    // Establecer la pista actual en el reproductor
    dispatch(setCurrentTrack(trackWithUrl));
    
    // Establecer la cola de reproducción con solo esta pista
    dispatch(setQueue({
      tracks: [trackWithUrl],
      index: 0
    }));
    
    // Iniciar la reproducción
    dispatch(play());
  };
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="track-detail-page">
      <button 
        className="back-button" 
        onClick={handleGoBack}
        aria-label="Volver"
      >
        &larr; Volver
      </button>
      
      {loading && (
        <div className="loading-container">
          <div className="loading">Cargando información de la pista...</div>
        </div>
      )}
      
      {error && !loading && (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button 
            className="button primary" 
            onClick={handleGoBack}
          >
            Volver a la página anterior
          </button>
        </div>
      )}
      
      {!loading && !error && track && (
        <TrackDetails 
          track={track} 
          onPlay={handlePlayTrack} 
        />
      )}
    </div>
  );
};

export default TrackDetailPage;
