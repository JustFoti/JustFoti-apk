'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { MALAnime, MALSeason } from '@/lib/services/mal';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { FluidButton } from '@/components/ui/FluidButton';
import styles from './AnimeDetails.module.css';

interface Props {
  anime: MALAnime;
  allSeasons: MALSeason[];
  totalEpisodes: number;
}

export default function AnimeDetailsClient({ anime, allSeasons, totalEpisodes }: Props) {
  const router = useRouter();
  const [selectedSeason, setSelectedSeason] = useState(0); // Index in allSeasons array
  
  const currentSeason = allSeasons[selectedSeason] || allSeasons[0];
  const episodes = Array.from({ length: currentSeason?.episodes || 0 }, (_, i) => i + 1);

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

  return (
    <div className={styles.container}>
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

          {/* Episode Grid */}
          <div className={styles.episodeGrid}>
            {episodes.map((episodeNumber) => (
              <motion.div
                key={episodeNumber}
                className={styles.episodeCard}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleEpisodeSelect(episodeNumber)}
              >
                <div className={styles.episodeThumbnail}>
                  <div className={styles.playOverlay}>
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className={styles.episodeNumber}>Episode {episodeNumber}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}
