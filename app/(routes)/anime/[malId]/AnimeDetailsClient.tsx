'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { MALAnime, MALSeason } from '@/lib/services/mal';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { FluidButton } from '@/components/ui/FluidButton';
import styles from './AnimeDetails.module.css';

interface EpisodeData {
  number: number;
  title: string;
  titleJapanese: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
}

interface Props {
  anime: MALAnime;
  allSeasons: MALSeason[];
  totalEpisodes: number;
}

export default function AnimeDetailsClient({ anime, allSeasons, totalEpisodes }: Props) {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [episodeData, setEpisodeData] = useState<Record<number, EpisodeData[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  
  const currentSeason = allSeasons[selectedSeason] || allSeasons[0];

  // Fetch episode data when season changes
  useEffect(() => {
    if (!currentSeason) return;
    
    const malId = currentSeason.malId;
    
    // Check if we already have data for this season
    if (episodeData[malId]) return;
    
    async function fetchEpisodes() {
      setLoadingEpisodes(true);
      try {
        const response = await fetch(`/api/content/mal-episodes?malId=${malId}`);
        const data = await response.json();
        
        if (data.success && data.data?.episodes) {
          setEpisodeData(prev => ({
            ...prev,
            [malId]: data.data.episodes,
          }));
        }
      } catch (error) {
        console.error('[AnimeDetails] Failed to fetch episodes:', error);
      } finally {
        setLoadingEpisodes(false);
      }
    }
    
    fetchEpisodes();
  }, [currentSeason, episodeData]);

  // Get episodes for current season
  const currentEpisodes = currentSeason ? episodeData[currentSeason.malId] : null;
  const episodeCount = currentSeason?.episodes || 0;
  
  // Generate episode list - use fetched data if available, otherwise generate placeholders
  const episodes = currentEpisodes || Array.from({ length: episodeCount }, (_, i) => ({
    number: i + 1,
    title: `Episode ${i + 1}`,
    titleJapanese: null,
    aired: null,
    score: null,
    filler: false,
    recap: false,
  }));

  // Get thumbnail for current season (use the season's image or main anime image)
  const getSeasonThumbnail = () => {
    if (currentSeason?.imageUrl) return currentSeason.imageUrl;
    return anime.images.jpg.large_image_url;
  };

  const handleBack = () => {
    router.push('/anime');
  };

  const handleWatchNow = () => {
    if (currentSeason) {
      router.push(`/anime/${currentSeason.malId}/watch?episode=1`);
    }
  };

  const handleEpisodeSelect = (episodeNumber: number) => {
    if (currentSeason) {
      router.push(`/anime/${currentSeason.malId}/watch?episode=${episodeNumber}`);
    }
  };

  const formatAirDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const seasonThumbnail = getSeasonThumbnail();

  return (
    <div className={styles.container}>
      {/* Back Button */}
      <button onClick={handleBack} className={styles.backButton}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Anime
      </button>

      {/* Hero Section */}
      <div className={styles.hero} style={{ backgroundImage: `url(${anime.images.jpg.large_image_url})` }}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.posterContainer}>
            <img src={anime.images.jpg.large_image_url} alt={anime.title} className={styles.poster} />
          </div>
          
          <div className={styles.info}>
            <h1 className={styles.title}>{anime.title}</h1>
            {anime.title_english && anime.title_english !== anime.title && (
              <p className={styles.englishTitle}>{anime.title_english}</p>
            )}
            
            <div className={styles.metadata}>
              <span className={styles.rating}>⭐ {anime.score?.toFixed(2) || 'N/A'}</span>
              <span className={styles.separator}>•</span>
              <span className={styles.type}>{anime.type}</span>
              <span className={styles.separator}>•</span>
              <span className={styles.status}>{anime.status}</span>
              {allSeasons.length > 1 && (
                <>
                  <span className={styles.separator}>•</span>
                  <span className={styles.seasons}>{allSeasons.length} Seasons</span>
                </>
              )}
              <span className={styles.separator}>•</span>
              <span className={styles.episodes}>{totalEpisodes} Episodes</span>
            </div>

            {anime.genres && anime.genres.length > 0 && (
              <div className={styles.genres}>
                {anime.genres.map((genre) => (
                  <span key={genre.mal_id} className={styles.genreTag}>
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <p className={styles.synopsis}>{anime.synopsis}</p>

            <FluidButton onClick={handleWatchNow} variant="primary" size="lg">
              <svg className={styles.playIcon} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Now
            </FluidButton>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <section className={styles.episodesSection}>
        <GlassPanel className={styles.episodesPanel}>
          <h2 className={styles.sectionTitle}>Episodes</h2>
          
          {/* Season Selector */}
          {allSeasons.length > 1 && (
            <div className={styles.seasonSelector}>
              {allSeasons.map((season, index) => (
                <button
                  key={season.malId}
                  onClick={() => setSelectedSeason(index)}
                  className={`${styles.seasonButton} ${selectedSeason === index ? styles.active : ''}`}
                >
                  {season.titleEnglish || season.title}
                  <span className={styles.episodeCount}>{season.episodes} eps</span>
                </button>
              ))}
            </div>
          )}

          {/* Current Season Info */}
          {currentSeason && (
            <div className={styles.seasonInfo}>
              <h3>{currentSeason.titleEnglish || currentSeason.title}</h3>
              <p className={styles.seasonMeta}>
                ⭐ {currentSeason.score?.toFixed(2) || 'N/A'} • {currentSeason.episodes} Episodes • {currentSeason.status}
              </p>
            </div>
          )}

          {/* Loading indicator */}
          {loadingEpisodes && (
            <div className={styles.loadingEpisodes}>
              <div className={styles.spinner} />
              <p>Loading episode details...</p>
            </div>
          )}

          {/* Episode Grid */}
          <div className={styles.episodeGrid}>
            {episodes.map((ep) => {
              const airDate = formatAirDate(ep.aired);
              const isFuture = ep.aired ? new Date(ep.aired) > new Date() : false;
              
              return (
                <motion.div
                  key={ep.number}
                  className={`${styles.episodeCard} ${isFuture ? styles.futureEpisode : ''}`}
                  whileHover={!isFuture ? { scale: 1.02 } : undefined}
                  onClick={() => !isFuture && handleEpisodeSelect(ep.number)}
                >
                  <div className={styles.episodeThumbnail}>
                    {/* Use anime poster as episode thumbnail with gradient overlay */}
                    <img 
                      src={seasonThumbnail} 
                      alt={`Episode ${ep.number}`}
                      className={styles.thumbnailImage}
                      loading="lazy"
                    />
                    <div className={styles.thumbnailOverlay}>
                      <span className={styles.episodeNumberBadge}>{ep.number}</span>
                    </div>
                    {!isFuture && (
                      <div className={styles.playOverlay}>
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    {ep.filler && <span className={styles.fillerBadge}>Filler</span>}
                    {ep.recap && <span className={styles.recapBadge}>Recap</span>}
                  </div>
                  <div className={styles.episodeInfo}>
                    <h4 className={styles.episodeTitle}>
                      {ep.title || `Episode ${ep.number}`}
                    </h4>
                    {airDate && (
                      <p className={styles.episodeAirDate}>
                        {isFuture ? `Airs: ${airDate}` : airDate}
                      </p>
                    )}
                    {ep.score && ep.score > 0 && (
                      <p className={styles.episodeScore}>⭐ {ep.score.toFixed(2)}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}
