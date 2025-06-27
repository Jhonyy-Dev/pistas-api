import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { tracksService } from '../services/tracksService';

/**
 * Hook para registrar las reproducciones de pistas en el servidor
 * Detecta cuando una pista comienza a reproducirse y envía la información al backend
 */
const useTrackPlay = () => {
  const { currentTrack, isPlaying } = useSelector(state => state.player);

  useEffect(() => {
    let timeoutId;

    // Si hay una pista actual y está reproduciéndose
    if (currentTrack && isPlaying) {
      // Registrar la reproducción después de 5 segundos
      // Esto evita registrar reproducciones cuando el usuario sólo escucha unos segundos
      timeoutId = setTimeout(() => {
        const registerPlay = async () => {
          try {
            await tracksService.markAsPlayed(currentTrack.id);
            console.log('Reproducción registrada para la pista:', currentTrack.id);
          } catch (error) {
            console.error('Error al registrar la reproducción:', error);
          }
        };
        
        registerPlay();
      }, 5000); // 5 segundos
    }

    // Limpiar timeout si el componente se desmonta o cambia la pista/estado
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentTrack, isPlaying]);
};

export default useTrackPlay;
