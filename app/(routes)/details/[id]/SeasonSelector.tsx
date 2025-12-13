'use client';


import { motion } from 'framer-motion';
import type { Season } from '@/types/media';
import styles from './SeasonSelector.module.css';

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
}

/**
 * SeasonSelector - Component for selecting TV show seasons
 * Features:
 * - Smooth animations on selection
 * - Keyboard navigation support
 * - Visual indicator for selected season
 */
export const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  seasons,
  selectedSeason,
  onSeasonChange,
}) => {
  // Filter out season 0 (specials) for cleaner UI
  const regularSeasons = seasons.filter(s => s.seasonNumber > 0);

  if (regularSeasons.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.seasonList}>
        {regularSeasons.map((season) => {
          const isSelected = season.seasonNumber === selectedSeason;
          
          return (
            <motion.button
              key={season.seasonNumber}
              className={`${styles.seasonButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSeasonChange(season.seasonNumber)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-pressed={isSelected}
              aria-label={`Season ${season.seasonNumber}`}
            >
              <span className={styles.seasonLabel}>Season {season.seasonNumber}</span>
              <span className={styles.episodeCount}>
                {season.episodeCount} {season.episodeCount === 1 ? 'episode' : 'episodes'}
              </span>
              
              {isSelected && (
                <motion.div
                  className={styles.selectedIndicator}
                  layoutId="selectedSeason"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
