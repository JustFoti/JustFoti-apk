/**
 * Category Filters Component
 * Simple horizontal filter pills
 */

import { memo } from 'react';
import styles from '../LiveTV.module.css';

interface LiveCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface CategoryFiltersProps {
  categories: LiveCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showLiveOnly: boolean;
  onLiveOnlyChange: (showLive: boolean) => void;
}

export const CategoryFilters = memo(function CategoryFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  showLiveOnly,
  onLiveOnlyChange,
}: CategoryFiltersProps) {
  // Only show top categories to reduce clutter
  const topCategories = categories.slice(0, 8);

  return (
    <div className={styles.filterBar}>
      {/* Live Toggle */}
      <button
        onClick={() => onLiveOnlyChange(!showLiveOnly)}
        className={`${styles.filterPill} ${showLiveOnly ? styles.active : ''}`}
      >
        <span className={styles.liveDot} />
        Live
      </button>

      {/* Category Pills */}
      {topCategories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id === selectedCategory ? 'all' : cat.id)}
          className={`${styles.filterPill} ${selectedCategory === cat.id ? styles.active : ''}`}
        >
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
});
