'use client';

import { motion } from 'framer-motion';
import styles from './SeasonSelector.module.css';

export interface AnimeEntry {
  malId: number;
  title: string;
  episodes: number;
}

interface AnimeSeasonSelectorProps {
  entries: AnimeEntry[];
  selectedMalId: number;
  onEntryChange: (malId: number) => void;
}

/**
 * AnimeSeasonSelector - Component for selecting anime entries (MAL-based)
 * Shows actual anime titles instead of generic "Season X" labels
 * 
 * Features:
 * - Displays MAL anime titles (e.g., "Jujutsu Kaisen 2nd Season")
 * - Smooth animations on selection
 * - Keyboard navigation support
 * - Visual indicator for selected entry
 */
export const AnimeSeasonSelector: React.FC<AnimeSeasonSelectorProps> = ({
  entries,
  selectedMalId,
  onEntryChange,
}) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.seasonList} data-tv-group="anime-entries">
        {entries.map((entry) => {
          const isSelected = entry.malId === selectedMalId;
          
          return (
            <motion.button
              key={entry.malId}
              className={`${styles.seasonButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onEntryChange(entry.malId)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-pressed={isSelected}
              aria-label={entry.title}
              data-tv-focusable="true"
            >
              <span className={styles.seasonLabel}>{entry.title}</span>
              <span className={styles.episodeCount}>
                {entry.episodes} {entry.episodes === 1 ? 'episode' : 'episodes'}
              </span>
              
              {isSelected && (
                <motion.div
                  className={styles.selectedIndicator}
                  layoutId="selectedAnimeEntry"
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
