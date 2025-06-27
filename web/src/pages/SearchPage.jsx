import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchTracks } from '../store/slices/tracksSlice';
import TrackList from '../components/track/TrackList';
import './SearchPage.css';

const SearchPage = () => {
  const dispatch = useDispatch();
  const { tracks, status, pagination } = useSelector(state => state.tracks);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [currentSearch, setCurrentSearch] = useState('');

  useEffect(() => {
    if (searchQuery && searchQuery !== currentSearch) {
      // Reiniciar búsqueda cuando cambia el query
      dispatch(fetchTracks({ page: 1, limit: 10, search: searchQuery }));
      setCurrentSearch(searchQuery);
    }
  }, [dispatch, searchQuery, currentSearch]);

  const handleLoadMore = () => {
    if (pagination.currentPage < pagination.totalPages) {
      dispatch(fetchTracks({ 
        page: pagination.currentPage + 1, 
        limit: pagination.itemsPerPage,
        search: searchQuery
      }));
    }
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Resultados de Búsqueda</h1>
        {searchQuery && (
          <p className="search-query">
            Buscando: <span>"{searchQuery}"</span>
          </p>
        )}
      </div>

      {status === 'loading' && tracks.length === 0 && (
        <div className="loading">Buscando pistas...</div>
      )}
      
      {status === 'failed' && (
        <div className="error-message">
          Error al buscar pistas. Por favor, intenta de nuevo.
        </div>
      )}
      
      {status === 'succeeded' && (
        <div className="search-results">
          {tracks.length > 0 ? (
            <>
              <p className="results-count">
                Se encontraron {pagination.totalItems} resultado(s)
              </p>
              <TrackList tracks={tracks} />
              
              {pagination.currentPage < pagination.totalPages && (
                <div className="load-more">
                  <button 
                    onClick={handleLoadMore}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Cargando...' : 'Cargar Más'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-results">
              <p>No se encontraron pistas para "{searchQuery}"</p>
              <p>Intenta con otro término de búsqueda</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
