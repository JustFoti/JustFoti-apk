/**
 * Events Grid Component
 * Grid layout for displaying events with infinite scroll
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

const ITEMS_PER_PAGE = 20;

export const EventsGrid = memo(function EventsGrid({
  events,
  onPlayEvent,
  loading,
  error,
}: EventsGridProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset display count when events change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [events.length]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < events.length) {
          setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, events.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, events.length]);

  // Separate featured events (live events with posters)
  const featuredEvents = events
    .filter(event => event.isLive && event.poster)
    .slice(0, 3);
  
  const regularEvents = events
    .filter(event => !featuredEvents.includes(event))
    .slice(0, displayCount);

  const hasMore = displayCount < events.length - featuredEvents.length;

  if (loading) {
    return (
      <div className={styles.eventsContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading live events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.eventsContainer}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Unable to load events</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={styles.eventsContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📺</div>
          <h3>No events found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.eventsContainer}>
      {/* Featured Events Section */}
      {featuredEvents.length > 0 && (
        <section className={styles.featuredSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.liveIndicatorDot}></span>
              Featured Live Events
            </h2>
            <span className={styles.sectionCount}>
              {featuredEvents.length} featured
            </span>
          </div>
          
          <div className={styles.featuredGrid}>
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPlay={onPlayEvent}
                featured={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Regular Events Section */}
      {regularEvents.length > 0 && (
        <section className={styles.eventsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              All Events
            </h2>
            <span className={styles.sectionCount}>
              {events.length} total
            </span>
          </div>
          
          <div className={styles.eventsGrid}>
            {regularEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPlay={onPlayEvent}
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading more events...</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
});
