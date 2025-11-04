'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaItem } from '@/types/media';
import { HeroSection } from '@/components/content/HeroSection';
import { CategoryRow } from '@/components/content/CategoryRow';
import { ContentGrid } from '@/components/content/ContentGrid';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { PageTransition } from '@/components/layout/PageTransition';
import { GlassPanel } from '@/components/ui/GlassPanel';
import styles from './HomePage.module.css';

interface HomePageClientProps {
  trendingToday: MediaItem[];
  trendingWeek: MediaItem[];
  popularMovies: MediaItem[];
  popularTV: MediaItem[];
  error: string | null;
}

/**
 * Home Page Client Component
 * Handles client-side interactions, infinite scroll, and animations
 */
export default function HomePageClient({
  trendingToday,
  trendingWeek,
  popularMovies,
  popularTV,
  error,
}: HomePageClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [additionalContent, setAdditionalContent] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle content card click
  const handleContentClick = useCallback((item: MediaItem) => {
    router.push(`/details/${item.id}?type=${item.mediaType}`);
  }, [router]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  }, [router]);

  // Load more content for infinite scroll
  const loadMoreContent = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      // Fetch next page of trending content
      const { tmdbService } = await import('@/lib/services/tmdb');
      const nextPage = page + 1;
      const moreContent = await tmdbService.getTrending('all', 'week');

      if (moreContent.length === 0) {
        setHasMore(false);
      } else {
        setAdditionalContent(prev => [...prev, ...moreContent]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more content:', err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreContent();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMoreContent, hasMore, isLoading]);

  // Get hero content (first trending item)
  const heroContent = trendingToday[0] || trendingWeek[0];

  return (
    <PageTransition>
      <div className={styles.homePage}>
        <Navigation onSearch={handleSearch} />

        {error ? (
          <div className={styles.errorContainer}>
            <GlassPanel className={styles.errorPanel}>
              <h2>Oops! Something went wrong</h2>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                Retry
              </button>
            </GlassPanel>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            {heroContent && (
              <HeroSection
                item={heroContent}
                onPlay={() => handleContentClick(heroContent)}
                onMoreInfo={() => handleContentClick(heroContent)}
              />
            )}

            {/* Content Sections */}
            <main id="main-content" className={styles.contentSections}>
              {/* Trending Today */}
              {trendingToday.length > 0 && (
                <section className={styles.section}>
                  <CategoryRow
                    title="Trending Today"
                    items={trendingToday}
                    onItemClick={handleContentClick}
                  />
                </section>
              )}

              {/* Trending This Week */}
              {trendingWeek.length > 0 && (
                <section className={styles.section}>
                  <CategoryRow
                    title="Trending This Week"
                    items={trendingWeek}
                    onItemClick={handleContentClick}
                  />
                </section>
              )}

              {/* Popular Movies */}
              {popularMovies.length > 0 && (
                <section className={styles.section}>
                  <CategoryRow
                    title="Popular Movies"
                    items={popularMovies}
                    onItemClick={handleContentClick}
                  />
                </section>
              )}

              {/* Popular TV Shows */}
              {popularTV.length > 0 && (
                <section className={styles.section}>
                  <CategoryRow
                    title="Popular TV Shows"
                    items={popularTV}
                    onItemClick={handleContentClick}
                  />
                </section>
              )}

              {/* All Trending Content Grid with Infinite Scroll */}
              {(trendingWeek.length > 0 || additionalContent.length > 0) && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Discover More</h2>
                  <ContentGrid
                    items={[...trendingWeek, ...additionalContent]}
                    onItemClick={handleContentClick}
                    virtualScroll={true}
                  />
                </section>
              )}

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                {isLoading && (
                  <div className={styles.loadingIndicator}>
                    <div className={styles.spinner} />
                    <p>Loading more content...</p>
                  </div>
                )}
                {!hasMore && additionalContent.length > 0 && (
                  <p className={styles.endMessage}>You've reached the end!</p>
                )}
              </div>
            </main>
          </>
        )}

        <Footer />
      </div>
    </PageTransition>
  );
}
