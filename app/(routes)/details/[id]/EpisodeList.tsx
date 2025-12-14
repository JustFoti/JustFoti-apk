'use client';


import { motion } from 'framer-motion';
import type { Episode } from '@/types/media';
import styles from './EpisodeList.module.css';

interface EpisodeListProps {
  episodes: Episode[];
  onEpisodeSelect: (episodeNumber: number) => void;
  episodeProgress?: Record<number, number>; // episodeNumber -> progress percentage
}

/**
 * EpisodeList - Component for displaying TV show episodes
 * Features:
 * - Episode cards with thumbnails
 * - Smooth hover animations
 * - Keyboard navigation support
 * - Staggered entrance animations
 */
export const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  onEpisodeSelect,
  episodeProgress = {},
}) => {
  if (episodes.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No episodes available</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.episodeGrid} data-tv-group="episodes">
        {episodes.map((episode, index) => (
          <motion.div
            key={episode.id}
            className={styles.episodeCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onEpisodeSelect(episode.episodeNumber)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEpisodeSelect(episode.episodeNumber);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Episode ${episode.episodeNumber}: ${episode.title}`}
            data-tv-focusable="true"
          >
            {/* Episode Thumbnail */}
            <div className={styles.thumbnailContainer}>
              {episode.stillPath ? (
                <img
                  src={episode.stillPath}
                  alt={episode.title}
                  className={styles.thumbnail}
                  loading="lazy"
                />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <svg
                    className={styles.placeholderIcon}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
              
              {/* Play overlay */}
              <div className={styles.playOverlay}>
                <svg
                  className={styles.playIcon}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              {/* Runtime badge */}
              {episode.runtime > 0 && (
                <div className={styles.runtimeBadge}>
                  {episode.runtime}m
                </div>
              )}
              
              {/* Progress bar */}
              {episodeProgress[episode.episodeNumber] !== undefined && episodeProgress[episode.episodeNumber] > 0 && (
                <div className={styles.progressBarContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${Math.min(episodeProgress[episode.episodeNumber], 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Episode Info */}
            <div className={styles.episodeInfo}>
              <div className={styles.episodeHeader}>
                <span className={styles.episodeNumber}>
                  {episode.episodeNumber}
                </span>
                <h3 className={styles.episodeTitle}>{episode.title}</h3>
              </div>
              
              {episode.overview && (
                <p className={styles.episodeOverview}>
                  {episode.overview}
                </p>
              )}

              {episode.airDate && (
                <span className={styles.airDate}>
                  {new Date(episode.airDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
