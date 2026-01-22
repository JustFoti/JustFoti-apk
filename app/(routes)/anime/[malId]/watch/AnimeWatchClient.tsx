'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getAnimeAudioPreference, setAnimeAudioPreference, type AnimeAudioPreference } from '@/lib/utils/player-preferences';
import { malService } from '@/lib/services/mal';
import type { MALAnime } from '@/lib/services/mal';
import styles from '../../../watch/[id]/WatchPage.module.css';

// Desktop video player
const DesktopVideoPlayer = dynamic(
  () => import('@/components/player/VideoPlayer'),
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

// Mobile-optimized video player
const MobileVideoPlayer = dynamic(
  () => import('@/components/player/MobileVideoPlayer'),
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
  isLastEpisode?: boolean;
}

export default function AnimeWatchClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mobileInfo = useIsMobile();
  
  const malId = parseInt(params.malId as string);
  const episode = parseInt(searchParams.get('episode') || '1');
  const shouldAutoplay = searchParams.get('autoplay') === 'true';
  
  const [anime, setAnime] = useState<MALAnime | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  
  // Mobile player detection - lock once set
  const [useMobilePlayer, setUseMobilePlayer] = useState<boolean | null>(null);
  const hasSetMobilePlayerRef = useRef(false);
  
  useEffect(() => {
    if (!hasSetMobilePlayerRef.current && mobileInfo.screenWidth > 0) {
      const shouldUseMobile = mobileInfo.isMobile || mobileInfo.screenWidth < 768;
      setUseMobilePlayer(shouldUseMobile);
      hasSetMobilePlayerRef.current = true;
    }
  }, [mobileInfo.isMobile, mobileInfo.screenWidth]);

  // Mobile player state
  const [mobileStreamUrl, setMobileStreamUrl] = useState<string | null>(null);
  const [mobileSources, setMobileSources] = useState<Array<{ title: string; url: string; quality?: string; provider?: string; skipIntro?: [number, number]; skipOutro?: [number, number] }>>([]);
  const [mobileSourceIndex, setMobileSourceIndex] = useState(0);
  const [mobileLoading, setMobileLoading] = useState(true);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [mobileResumeTime, setMobileResumeTime] = useState(0);
  
  // Provider state
  const [currentProvider, setCurrentProvider] = useState<'animekai' | 'vidsrc' | '1movies' | 'flixer' | 'videasy' | undefined>(undefined);
  const [availableProviders, setAvailableProviders] = useState<Array<'animekai' | 'vidsrc' | '1movies' | 'flixer' | 'videasy'>>([]);
  const [loadingProvider, setLoadingProvider] = useState(false);
  
  // Audio preference for anime
  const [audioPref, setAudioPref] = useState<AnimeAudioPreference>(() => getAnimeAudioPreference());

  // Load anime data
  useEffect(() => {
    async function loadAnime() {
      const data = await malService.getById(malId);
      setAnime(data);
      setLoading(false);
      
      // Calculate next episode
      if (data && data.episodes) {
        if (episode < data.episodes) {
          setNextEpisode({
            season: 1,
            episode: episode + 1,
            title: `Episode ${episode + 1}`,
            isLastEpisode: false,
          });
        } else {
          setNextEpisode({
            season: 1,
            episode: episode,
            isLastEpisode: true,
          });
        }
      }
    }
    loadAnime();
  }, [malId, episode]);

  // Helper to check if source matches audio preference
  const sourceMatchesAudioPref = useCallback((sourceTitle: string, pref: AnimeAudioPreference): boolean => {
    const title = sourceTitle.toLowerCase();
    if (pref === 'dub') {
      return title.includes('(dub)') || title.includes('dub)') || title.includes('dubbed');
    }
    return title.includes('(sub)') || title.includes('sub)') || title.includes('subbed') || 
           (!title.includes('dub') && !title.includes('dubbed'));
  }, []);

  // Fetch stream for mobile player
  const fetchMobileStream = useCallback(async (audioPreference?: AnimeAudioPreference) => {
    if (!malId) return;
    
    setMobileLoading(true);
    setMobileError(null);
    
    const currentAudioPref = audioPreference || audioPref;
    
    const timeoutId = setTimeout(() => {
      setMobileError('Request timed out. Please try again.');
      setMobileLoading(false);
    }, 30000);
    
    try {
      // AnimeKai is primary for anime
      const providerOrder: Array<'animekai' | 'vidsrc' | '1movies' | 'flixer' | 'videasy'> = ['animekai', 'vidsrc', 'flixer', '1movies', 'videasy'];
      setAvailableProviders(providerOrder);
      
      for (const provider of providerOrder) {
        const params = new URLSearchParams({
          malId: malId.toString(),
          episode: episode.toString(),
          provider,
        });

        try {
          const response = await fetch(`/api/stream/extract?${params}`, { cache: 'no-store' });
          const data = await response.json();

          if (data.success && data.sources && data.sources.length > 0) {
            const validSources = data.sources.filter((s: any) => s.url && s.url.length > 0);
            
            if (validSources.length > 0) {
              const sources = validSources.map((s: any) => ({
                title: s.title || s.quality || `${provider} Source`,
                url: s.url,
                quality: s.quality,
                provider: provider,
                skipIntro: s.skipIntro,
                skipOutro: s.skipOutro,
              }));
              
              setMobileSources(sources);
              setCurrentProvider(provider);
              
              // Find source matching audio preference
              let selectedIndex = 0;
              if (provider === 'animekai') {
                const matchingIndex = sources.findIndex((s: any) => 
                  s.title && sourceMatchesAudioPref(s.title, currentAudioPref)
                );
                if (matchingIndex >= 0) {
                  selectedIndex = matchingIndex;
                }
              }
              
              setMobileStreamUrl(sources[selectedIndex].url);
              setMobileSourceIndex(selectedIndex);
              clearTimeout(timeoutId);
              setMobileLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn(`[AnimeWatch] ${provider} failed:`, e);
        }
      }

      clearTimeout(timeoutId);
      setMobileError('No streams available');
      setMobileLoading(false);
    } catch (e) {
      clearTimeout(timeoutId);
      setMobileError('Failed to load video');
      setMobileLoading(false);
    }
  }, [malId, episode, audioPref, sourceMatchesAudioPref]);

  // Fetch mobile stream on mount
  const lastFetchedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${malId}-${episode}`;
    if (useMobilePlayer && lastFetchedRef.current !== key) {
      lastFetchedRef.current = key;
      fetchMobileStream();
    }
  }, [useMobilePlayer, malId, episode, fetchMobileStream]);

  // Handle audio preference change
  const handleAudioPrefChange = useCallback((newPref: AnimeAudioPreference, currentTime: number = 0) => {
    setMobileResumeTime(currentTime);
    setAudioPref(newPref);
    setAnimeAudioPreference(newPref);
    fetchMobileStream(newPref);
  }, [fetchMobileStream]);

  // Handle provider change
  const handleProviderChange = useCallback(async (provider: 'animekai' | 'vidsrc' | '1movies' | 'flixer' | 'videasy', currentTime: number = 0) => {
    setMobileResumeTime(currentTime);
    setLoadingProvider(true);
    
    const params = new URLSearchParams({
      malId: malId.toString(),
      episode: episode.toString(),
      provider,
    });

    try {
      const response = await fetch(`/api/stream/extract?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (data.success && data.sources && data.sources.length > 0) {
        const validSources = data.sources.filter((s: any) => s.url && s.url.length > 0);
        
        if (validSources.length > 0) {
          const sources = validSources.map((s: any) => ({
            title: s.title || s.quality || `${provider} Source`,
            url: s.url,
            quality: s.quality,
            provider: provider,
            skipIntro: s.skipIntro,
            skipOutro: s.skipOutro,
          }));
          
          setMobileSources(sources);
          setCurrentProvider(provider);
          setMobileStreamUrl(sources[0].url);
          setMobileSourceIndex(0);
        }
      }
    } catch (e) {
      console.error(`[AnimeWatch] Provider change failed:`, e);
    } finally {
      setLoadingProvider(false);
    }
  }, [malId, episode]);

  // Handle source change
  const handleMobileSourceChange = useCallback((index: number, currentTime: number = 0) => {
    if (index >= 0 && index < mobileSources.length) {
      setMobileResumeTime(currentTime);
      setMobileSourceIndex(index);
      setMobileStreamUrl(mobileSources[index].url);
    }
  }, [mobileSources]);

  const handleBack = () => {
    router.push(`/anime/${malId}`);
  };

  const handleNextEpisode = useCallback(() => {
    if (!nextEpisode || nextEpisode.isLastEpisode || !anime) return;
    
    const navigateToNext = () => {
      router.push(`/anime/${malId}/watch?episode=${nextEpisode.episode}&autoplay=true`);
    };

    if (document.fullscreenElement) {
      document.exitFullscreen().then(navigateToNext).catch(navigateToNext);
    } else {
      navigateToNext();
    }
  }, [malId, nextEpisode, anime, router]);

  // Wait for mobile detection
  if (useMobilePlayer === null) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading player...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading anime...</p>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Anime Not Found</h2>
          <p>Could not find anime with MAL ID: {malId}</p>
          <button onClick={() => router.push('/anime')} className={styles.backButton}>
            Back to Anime
          </button>
        </div>
      </div>
    );
  }

  const title = anime.title_english || anime.title;
  const nextEpisodeProp = nextEpisode && !nextEpisode.isLastEpisode ? {
    season: 1,
    episode: nextEpisode.episode,
    title: nextEpisode.title,
  } : null;

  // Mobile player
  if (useMobilePlayer) {
    if (mobileLoading) {
      return (
        <div className={styles.container}>
          <div className={styles.playerWrapper}>
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Finding best source...</p>
            </div>
          </div>
        </div>
      );
    }

    if (mobileError || !mobileStreamUrl) {
      return (
        <div className={styles.container}>
          <div className={styles.playerWrapper}>
            <div className={styles.error}>
              <h2>Playback Error</h2>
              <p>{mobileError || 'Failed to load video'}</p>
              <button onClick={() => fetchMobileStream()} className={styles.backButton}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <MobileVideoPlayer
          tmdbId={String(malId)}
          mediaType="tv"
          season={1}
          episode={episode}
          title={title}
          streamUrl={mobileStreamUrl}
          availableSources={mobileSources}
          currentSourceIndex={mobileSourceIndex}
          onSourceChange={handleMobileSourceChange}
          onBack={handleBack}
          nextEpisode={nextEpisodeProp}
          onNextEpisode={handleNextEpisode}
          initialTime={mobileResumeTime}
          onError={(err) => setMobileError(err)}
          isAnime={true}
          audioPref={audioPref}
          onAudioPrefChange={handleAudioPrefChange}
          availableProviders={availableProviders}
          currentProvider={currentProvider}
          onProviderChange={handleProviderChange}
          loadingProvider={loadingProvider}
        />
      </div>
    );
  }

  // Desktop player - use the same VideoPlayer as regular watch page
  return (
    <div className={styles.container}>
      <DesktopVideoPlayer
        tmdbId={String(malId)}
        mediaType="tv"
        season={1}
        episode={episode}
        title={title}
        onBack={handleBack}
        nextEpisode={nextEpisodeProp}
        onNextEpisode={handleNextEpisode}
        autoplay={shouldAutoplay}
        malId={malId}
        malTitle={title}
      />
    </div>
  );
}
