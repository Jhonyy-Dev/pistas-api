import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TrackItem from './TrackItem';
import { fetchTrackStreamUrl } from '../../store/slices/tracksSlice';
import { setCurrentTrack, play, setQueue, togglePlay } from '../../store/slices/playerSlice';
import './TrackList.css';

const TrackList = ({ tracks }) => {
  const dispatch = useDispatch();
  const { streamUrls, status } = useSelector(state => state.tracks);
  const { currentTrack, isPlaying } = useSelector(state => state.player);

  // Función mejorada para reproducir o pausar una pista
  const handlePlayTrack = async (track, index) => {
    // Si ya está activa la pista, solo alternamos play/pause
    if (currentTrack && currentTrack.id === track.id) {
      console.log('Alternando reproducción/pausa para la pista actual');
      // Usar la acción togglePlay importada del playerSlice
      dispatch(togglePlay());
      return;
    }
    
    // Indicar que estamos cargando la pista (podemos mostrar un spinner si es necesario)
    console.log(`Preparando reproducción de pista: ${track.title || track.filename}`);
    
    try {
      // Obtener la URL de streaming directamente de la API
      console.log('Obteniendo URL de streaming para track ID:', track.id);
      
      // Dispatch fetchTrackStreamUrl y esperar a que termine
      const result = await dispatch(fetchTrackStreamUrl(track.id));
      console.log('Resultado de fetchTrackStreamUrl:', result);
      
      // En el caso de un error, mostrar y salir
      if (result.error) {
        console.error('Error al obtener URL de streaming:', result.error);
        alert('Error al obtener URL de streaming. Intente nuevamente.');
        return;
      }
      
      // Verificar que existe la URL de streaming
      const streamUrl = result.payload?.streamUrl;
      
      if (!streamUrl) {
        console.error('No se recibió URL de streaming válida');
        console.log('Payload recibido:', result.payload);
        alert('No se pudo obtener la URL de streaming. Intente nuevamente.');
        return;
      }
      
      console.log('URL de streaming obtenida correctamente:', streamUrl);
      
      const trackWithUrl = {
        ...track,
        streamUrl
      };
      
      // Establecer la pista actual en el reproductor
      dispatch(setCurrentTrack(trackWithUrl));
      
      // Establecer la cola de reproducción con todas las pistas disponibles
      // Solo la pista actual tiene URL de streaming por ahora
      const tracksWithUrls = tracks.map(t => {
        if (t.id === track.id) {
          // Para la pista actual usamos la URL que acabamos de obtener
          return { ...t, streamUrl };
        }
        // Para otras pistas, usamos la URL si existe en el cache, o null
        return { ...t, streamUrl: streamUrls[t.id] || null };
      });
      
      dispatch(setQueue({
        tracks: tracksWithUrls,
        index
      }));
      
      // Iniciar la reproducción
      dispatch(play());
      console.log(`Reproducción iniciada: ${track.title || track.filename}`);
    } catch (error) {
      console.error('Error al iniciar reproducción:', error);
    }
  };

  return (
    <div className="track-list">
      {tracks.map((track, index) => (
        <TrackItem
          key={track.id}
          track={track}
          isActive={currentTrack?.id === track.id}
          isPlaying={currentTrack?.id === track.id && isPlaying}
          onPlay={() => handlePlayTrack(track, index)}
        />
      ))}
    </div>
  );
};

export default TrackList;
