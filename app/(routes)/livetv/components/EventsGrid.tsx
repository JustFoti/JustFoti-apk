/**
 * Events Grid Component
 * Simple, stable grid layout with infinite scroll
 */

import { memo, useState, useEffect, useRef } from 'react';
import { LiveEvent } from '../hooks/useLiveTVData';
import { EventCard } from './EventCard';
import styles from '../LiveTV.module.css';

interface EventsGridProps {
  events: LiveEvent[];
  onPlayEvent: (event: LiveEvent) => void;
  loading: boolean;
  error: string | null;
}

const ITEMS_PER_PAGE = 24;

export const EventsGrid = memo(function EventsGrid({
  events,
  onPlayEvent,
  loading,
  error,
}: EventsGridProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset display count when events change significantly
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [events.length > 0 ? events[0]?.id : null]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < events.length) {
          setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, events.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, events.length]);

  const displayedEvents = events.slice(0, displayCount);
  const hasMore = displayCount < events.length;

  return (
    <div className={styles.contentContainer} ref={containerRef}>
      {/* Header */}
      <div className={styles.contentHeader}>
        <h2 className={styles.contentTitle}>
          {loading ? 'Loading...' : `${events.length} Events`}
        </h2>
      </div>

      {/* Loading State */}
      {loading && events.length === 0 && (
        <div className={styles.gridPlaceholder}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles.messageBox}>
          <span className={styles.messageIcon}>⚠️</span>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.actionButton}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className={styles.messageBox}>
          <span className={styles.messageIcon}>📺</span>
          <p>No events found. Try adjusting your filters.</p>
        </div>
      )}

      {/* Events Grid */}
      {displayedEvents.length > 0 && (
        <div className={styles.simpleGrid}>
          {displayedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPlay={onPlayEvent}
            />
          ))}
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
          <div className={styles.loadingSpinner} />
        </div>
      )}
    </div>
  );
});
