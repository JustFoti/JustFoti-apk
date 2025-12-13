'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './WatchPage.module.css';

const VideoPlayer = dynamic(
  () => import('../../../components/player/VideoPlayer'),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading player...</p>
      </div>
    )
  }
);

interface NextEpisodeInfo {
  season: number;
  episode: number;
  title?: string;
  isNextSeason?: boolean;
  isLastEpisode?: boolean;
}

interface SeasonInfo {
  seasonNumber: number;
  episodeCount: number;
  episodes: Array<{
    episodeNumber: number;
    title: string;
    airDate: string;
  }>;
}

interface ShowInfo {
  seasons: Array<{
    seasonNumber: number;
    episodeCount: number;
  }>;
}

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const contentId = params.id as string;
  const mediaType = searchParams.get('type') as 'movie' | 'tv';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const titleParam = searchParams.get('title') || searchParams.get('name');

  // Decode title if it exists
  const title = titleParam ? decodeURIComponent(titleParam) : 'Loading...';

  const seasonId = season ? parseInt(season) : undefined;
  const episodeId = episode ? parseInt(episode) : undefined;

  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  const [isLoadingNextEpisode, setIsLoadingNextEpisode] = useState(false);

  // Fetch season data to determine next episode
  const fetchNextEpisodeInfo = useCallback(async () => {
    if (mediaType !== 'tv' || !seasonId || !episodeId) {
      setNextEpisode(null);
      return;
    }

    setIsLoadingNextEpisode(true);

    try {
      // Fetch current season data
      const seasonResponse = await fetch(
        `/api/content/season?tvId=${contentId}&seasonNumber=${seasonId}`
      );
      
      if (!seasonResponse.ok) {
        console.error('[WatchPage] Failed to fetch season data');
        setNextEpisode(null);
        return;
      }

      const seasonData: SeasonInfo = await seasonResponse.json();
      const currentEpisodeIndex = seasonData.episodes.findIndex(
        ep => ep.episodeNumber === episodeId
      );

      // Check if there's a next episode in the current season
      if (currentEpisodeIndex !== -1 && currentEpisodeIndex < seasonData.episodes.length - 1) {
        const nextEp = seasonData.episodes[currentEpisodeIndex + 1];
        
        // Check if the next episode has aired (air date is in the past or today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const airDate = nextEp.airDate ? new Date(nextEp.airDate) : null;
        
        if (!airDate || airDate <= today) {
          setNextEpisode({
            season: seasonId,
            episode: nextEp.episodeNumber,
            title: nextEp.title || `Episode ${nextEp.episodeNumber}`,
            isNextSeason: false,
            isLastEpisode: false,
          });
          return;
        }
      }

      // Current episode is the last in the season, check for next season
      const detailsResponse = await fetch(
        `/api/content/details?id=${contentId}&type=tv`
      );

      if (!detailsResponse.ok) {
        // No next episode available
        setNextEpisode({
          season: seasonId,
          episode: episodeId,
          isLastEpisode: true,
        });
        return;
      }

      const showDetails: ShowInfo = await detailsResponse.json();
      
      // Filter out season 0 (specials) and find the next season
      const regularSeasons = showDetails.seasons
        .filter(s => s.seasonNumber > 0)
        .sort((a, b) => a.seasonNumber - b.seasonNumber);
      
      const currentSeasonIndex = regularSeasons.findIndex(
        s => s.seasonNumber === seasonId
      );

      if (currentSeasonIndex !== -1 && currentSeasonIndex < regularSeasons.length - 1) {
        const nextSeasonNum = regularSeasons[currentSeasonIndex + 1].seasonNumber;
        
        // Fetch next season data to get first episode info
        const nextSeasonResponse = await fetch(
          `/api/content/season?tvId=${contentId}&seasonNumber=${nextSeasonNum}`
        );

        if (nextSeasonResponse.ok) {
          const nextSeasonData: SeasonInfo = await nextSeasonResponse.json();
          
          if (nextSeasonData.episodes.length > 0) {
            const firstEp = nextSeasonData.episodes[0];
            
            // Check if the first episode of next season has aired
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const airDate = firstEp.airDate ? new Date(firstEp.airDate) : null;
            
            if (!airDate || airDate <= today) {
              setNextEpisode({
                season: nextSeasonNum,
                episode: firstEp.episodeNumber,
                title: firstEp.title || `S${nextSeasonNum} E${firstEp.episodeNumber}`,
                isNextSeason: true,
                isLastEpisode: false,
              });
              return;
            }
          }
        }
      }

      // No more episodes available
      setNextEpisode({
        season: seasonId,
        episode: episodeId,
        isLastEpisode: true,
      });
    } catch (error) {
      console.error('[WatchPage] Error fetching next episode info:', error);
      // Fallback to simple next episode
      setNextEpisode({
        season: seasonId,
        episode: episodeId + 1,
        title: `Episode ${episodeId + 1}`,
      });
    } finally {
      setIsLoadingNextEpisode(false);
    }
  }, [contentId, mediaType, seasonId, episodeId]);

  // Fetch next episode info when component mounts or episode changes
  useEffect(() => {
    fetchNextEpisodeInfo();
  }, [fetchNextEpisodeInfo]);

  const handleBack = () => {
    // Navigate back to details page with the current season preserved
    if (mediaType === 'tv' && seasonId) {
      router.push(`/details/${contentId}?type=tv&season=${seasonId}`);
    } else {
      router.push(`/details/${contentId}?type=${mediaType}`);
    }
  };

  const handleNextEpisode = useCallback(() => {
    if (!nextEpisode || nextEpisode.isLastEpisode) return;

    const navigateToNextEpisode = () => {
      const url = `/watch/${contentId}?type=tv&season=${nextEpisode.season}&episode=${nextEpisode.episode}&title=${encodeURIComponent(title)}`;
      // Use window.location for more reliable navigation
      window.location.href = url;
    };

    // Exit fullscreen first if in fullscreen mode
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        navigateToNextEpisode();
      }).catch(() => {
        // If exitFullscreen fails, navigate anyway
        navigateToNextEpisode();
      });
    } else {
      navigateToNextEpisode();
    }
  }, [contentId, nextEpisode, title]);

  if (!contentId || !mediaType) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Invalid Content</h2>
          <p>Missing content ID or media type.</p>
          <button onClick={handleBack} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (mediaType === 'tv' && (!seasonId || !episodeId)) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Invalid Episode</h2>
          <p>Missing season or episode information.</p>
          <button onClick={handleBack} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Prepare next episode prop for VideoPlayer
  const nextEpisodeProp = nextEpisode && !nextEpisode.isLastEpisode ? {
    season: nextEpisode.season,
    episode: nextEpisode.episode,
    title: nextEpisode.title,
    isNextSeason: nextEpisode.isNextSeason,
  } : null;

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        <button onClick={handleBack} className={styles.backButtonOverlay}>
          ← Back
        </button>

        <VideoPlayer
          tmdbId={contentId}
          mediaType={mediaType}
          season={seasonId}
          episode={episodeId}
          title={title}
          nextEpisode={nextEpisodeProp}
          onNextEpisode={handleNextEpisode}
        />
      </div>
    </div>
  );
}

export default function WatchPageClient() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
