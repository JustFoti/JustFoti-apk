'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { usePresenceContext } from '@/components/analytics/PresenceProvider';
import { useCast, CastMedia } from '@/hooks/useCast';
import styles from './LiveTV.module.css';

// CF proxy URL for IPTV streams
const CF_PROXY_URL = process.env.NEXT_PUBLIC_CF_TV_PROXY_URL || process.env.NEXT_PUBLIC_CF_PROXY_URL || 'https://media-proxy.vynx.workers.dev';

// Types
interface Channel {
  id: string;
  name: string;
  category: string;
  country: string;
  streamId: string;
  firstLetter: string;
  isHD?: boolean;
  categoryInfo: { name: string; icon: string };
  countryInfo: { name: string; flag: string };
}

interface XfinityChannel {
  id: string;
  name: string;
  category: string;
  categoryInfo: { name: string; icon: string };
  hasEast: boolean;
  hasWest: boolean;
  eastName?: string;
  westName?: string;
  isHD: boolean;
}

interface XfinityCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export default function LiveTVClient() {
  const { 
    trackEvent, 
    trackPageView, 
    trackLiveTVEvent, 
    updateActivity, 
    startLiveTVSession,
    endLiveTVSession,
    recordLiveTVBuffer,
    updateLiveTVQuality,
  } = useAnalytics();
  
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [xfinityChannels, setXfinityChannels] = useState<XfinityChannel[]>([]);
  const [xfinityCategories, setXfinityCategories] = useState<XfinityCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [preferWestCoast, setPreferWestCoast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { trackPageView('/livetv'); }, [trackPageView]);

  useEffect(() => {
    fetchChannels();
  }, [selectedCategory, searchQuery]);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/livetv/xfinity-channels?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setXfinityChannels(data.channels);
        setXfinityCategories(data.categories);
      } else {
        setError('Failed to load channels');
      }
    } catch {
      setError('Failed to load channels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelSelect = useCallback((xfinityChannel: XfinityChannel) => {
    const coastParam = preferWestCoast ? ':west' : ':east';
    const channel: Channel = {
      id: `xfinity-${xfinityChannel.id}`,
      name: xfinityChannel.name,
      category: xfinityChannel.category,
      country: 'us',
      streamId: xfinityChannel.id + coastParam,
      firstLetter: xfinityChannel.name.charAt(0),
      isHD: xfinityChannel.isHD,
      categoryInfo: xfinityChannel.categoryInfo,
      countryInfo: { name: 'United States', flag: '🇺🇸' },
    };
    setSelectedChannel(channel);
    trackLiveTVEvent({
      action: 'channel_select',
      channelId: xfinityChannel.id,
      channelName: xfinityChannel.name,
      category: xfinityChannel.categoryInfo.name,
    });
    trackEvent('livetv_channel_selected', { 
      channelId: xfinityChannel.id, 
      channelName: xfinityChannel.name,
      preferWest: preferWestCoast,
    });
  }, [trackLiveTVEvent, trackEvent, preferWestCoast]);

  const totalChannels = xfinityCategories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className={styles.container}>
      <Navigation />

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Live TV</h2>
            <span className={styles.channelCount}>{totalChannels} Channels</span>
          </div>

          {/* Search */}
          <div className={styles.sidebarSearch}>
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Category Filters */}
          <div className={styles.filterList}>
            <div className={styles.filterSection}>
              <h3>Categories</h3>
              <button
                className={`${styles.filterItem} ${selectedCategory === 'all' ? styles.active : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <span>📺 All Channels</span>
                <span className={styles.filterCount}>{totalChannels}</span>
              </button>
              {xfinityCategories.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.filterItem} ${selectedCategory === cat.id ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.icon} {cat.name}</span>
                  <span className={styles.filterCount}>{cat.count}</span>
                </button>
              ))}
            </div>
            <div className={styles.filterSection}>
              <h3>Time Zone</h3>
              <button
                className={`${styles.filterItem} ${!preferWestCoast ? styles.active : ''}`}
                onClick={() => setPreferWestCoast(false)}
              >
                <span>🌅 East Coast</span>
              </button>
              <button
                className={`${styles.filterItem} ${preferWestCoast ? styles.active : ''}`}
                onClick={() => setPreferWestCoast(true)}
              >
                <span>🌄 West Coast</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading channels...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={fetchChannels} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          ) : (
            <div className={styles.channelsGrid}>
              {xfinityChannels.length === 0 ? (
                <div className={styles.noResults}>
                  <p>No channels found</p>
                </div>
              ) : (
                xfinityChannels.map((channel) => (
                  <button
                    key={channel.id}
                    className={styles.channelCard}
                    onClick={() => handleChannelSelect(channel)}
                  >
                    <div className={styles.channelLogo}>
                      <span>{channel.name.charAt(0)}</span>
                      {channel.isHD && <span className={styles.hdBadge}>HD</span>}
                    </div>
                    <div className={styles.channelInfo}>
                      <span className={styles.channelName}>{channel.name}</span>
                      <span className={styles.channelMeta}>
                        {channel.categoryInfo.icon} {channel.categoryInfo.name}
                      </span>
                      {channel.hasEast && channel.hasWest && channel.eastName !== channel.westName && (
                        <span className={styles.coastIndicator}>
                          {preferWestCoast ? '🌄 West' : '🌅 East'}
                        </span>
                      )}
                    </div>
                    <span className={styles.playIcon}>▶</span>
                  </button>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* Player Modal */}
      {selectedChannel && (
        <LiveTVPlayer 
          channel={selectedChannel} 
          onClose={() => setSelectedChannel(null)}
          trackLiveTVEvent={trackLiveTVEvent}
          updateActivity={updateActivity}
          startLiveTVSession={startLiveTVSession}
          endLiveTVSession={endLiveTVSession}
          recordLiveTVBuffer={recordLiveTVBuffer}
          updateLiveTVQuality={updateLiveTVQuality}
        />
      )}

      <Footer />
    </div>
  );
}


// Player Component
interface LiveTVPlayerProps {
  channel: Channel;
  onClose: () => void;
  trackLiveTVEvent: (event: {
    action: 'channel_select' | 'play_start' | 'play_stop' | 'error' | 'buffer' | 'quality_change';
    channelId: string;
    channelName: string;
    category?: string;
    country?: string;
    watchDuration?: number;
    errorMessage?: string;
    quality?: string;
  }) => void;
  updateActivity: (activity: any) => void;
  startLiveTVSession: (data: {
    channelId: string;
    channelName: string;
    category?: string;
    country?: string;
    quality?: string;
  }) => void;
  endLiveTVSession: () => void;
  recordLiveTVBuffer: () => void;
  updateLiveTVQuality: (quality: string) => void;
}

function LiveTVPlayer({ 
  channel, 
  onClose, 
  trackLiveTVEvent, 
  updateActivity,
  startLiveTVSession,
  endLiveTVSession,
  recordLiveTVBuffer,
  updateLiveTVQuality: _updateLiveTVQuality,
}: LiveTVPlayerProps) {
  const presenceContext = usePresenceContext();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<any>(null); // mpegts.js player
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>();
  const watchStartTimeRef = React.useRef<number>(0);
  const CONTROLS_HIDE_DELAY = 3000;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [bufferingStatus, setBufferingStatus] = useState<string | null>(null);
  const [isCastOverlayVisible, setIsCastOverlayVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const retryCountRef = React.useRef(0); // Ref to track retry count in closures
  const MAX_RETRIES = 10;

  const cast = useCast({
    onConnect: () => console.log('[LiveTV] Cast connected'),
    onDisconnect: () => {
      console.log('[LiveTV] Cast disconnected');
      setIsCastOverlayVisible(false);
    },
    onError: (error) => console.error('[LiveTV] Cast error:', error),
  });

  const getCastMedia = useCallback((): CastMedia => {
    return {
      url: `${window.location.origin}/api/livetv/xfinity-stream?channelId=${channel.streamId}`,
      title: channel.name,
      subtitle: `${channel.categoryInfo.icon} ${channel.categoryInfo.name}`,
      contentType: 'application/x-mpegURL',
      isLive: true,
    };
  }, [channel]);

  const handleCastClick = useCallback(async () => {
    if (cast.isCasting) {
      cast.stop();
      setIsCastOverlayVisible(false);
    } else if (cast.isConnected) {
      const media = getCastMedia();
      videoRef.current?.pause();
      const success = await cast.loadMedia(media);
      if (success) setIsCastOverlayVisible(true);
    } else {
      const connected = await cast.requestSession();
      if (connected) {
        const media = getCastMedia();
        videoRef.current?.pause();
        const success = await cast.loadMedia(media);
        if (success) setIsCastOverlayVisible(true);
      }
    }
  }, [cast, getCastMedia]);

  useEffect(() => {
    watchStartTimeRef.current = 0;
    loadStream();
    return () => {
      if (watchStartTimeRef.current > 0) {
        const watchDuration = Math.round((Date.now() - watchStartTimeRef.current) / 1000);
        trackLiveTVEvent({
          action: 'play_stop',
          channelId: channel.streamId,
          channelName: channel.name,
          category: channel.categoryInfo.name,
          watchDuration,
        });
      }
      endLiveTVSession();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      updateActivity({ type: 'browsing' });
    };
  }, [channel.streamId]);

  const loadStream = async (isRetry = false) => {
    if (!videoRef.current) return;
    
    if (!isRetry) {
      setRetryCount(0);
      retryCountRef.current = 0;
      setRetryStatus(null);
      setCurrentAccount(null);
    }
    
    setIsLoading(true);
    setError(null);

    // Cleanup previous player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    try {
      // Parse channel ID and coast preference
      const [channelId, coastPart] = channel.streamId.split(':');
      const coastParam = coastPart === 'west' ? '&coast=west' : '';
      
      // Get stream URL from our Xfinity/Stalker API (returns tokenized CF proxy URL)
      const response = await fetch(`/api/livetv/xfinity-stream?channelId=${channelId}${coastParam}`);
      const data = await response.json();
      
      if (!data.success || !data.streamUrl) {
        throw new Error(data.error || 'Failed to get stream');
      }

      const streamUrl = data.streamUrl;
      
      // Update account display
      if (data.account) {
        setCurrentAccount(data.account.mac);
      }
      console.log('[LiveTV] Loading stream:', channel.name, streamUrl.substring(0, 80), isRetry ? `(retry ${retryCount + 1})` : '');

      // Use mpegts.js for MPEG-TS streams (IPTV uses raw TS format)
      const mpegtsModule = await import('mpegts.js');
      const mpegts = mpegtsModule.default;

      if (!mpegts.isSupported()) {
        setError('Your browser does not support MPEG-TS playback');
        setIsLoading(false);
        return;
      }

      const player = mpegts.createPlayer({
        type: 'mpegts',
        isLive: true,
        url: streamUrl,
      }, {
        enableWorker: true,
        enableStashBuffer: true,
        stashInitialSize: 384 * 1024,
        liveBufferLatencyChasing: false,
        liveBufferLatencyMaxLatency: 5.0,
        liveBufferLatencyMinRemain: 1.0,
        lazyLoad: false,
        lazyLoadMaxDuration: 3 * 60,
        lazyLoadRecoverDuration: 30,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 3 * 60,
        autoCleanupMinBackwardDuration: 2 * 60,
      });

      player.attachMediaElement(videoRef.current);
      player.load();

      player.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string) => {
        console.error('[LiveTV] mpegts error:', errorType, errorDetail);
        
        const isAccountError = errorDetail.includes('403') || 
                               errorDetail.includes('HttpStatusCodeInvalid') ||
                               errorDetail.includes('458') ||
                               errorDetail.includes('456');
        
        // Use ref for accurate count in closure
        const currentRetry = retryCountRef.current;
        
        if (isAccountError && currentRetry < MAX_RETRIES) {
          // Auto-retry with different account
          const newRetryCount = currentRetry + 1;
          retryCountRef.current = newRetryCount;
          setRetryCount(newRetryCount);
          setRetryStatus(`Trying source ${newRetryCount + 1} of ${MAX_RETRIES + 1}...`);
          setError(null);
          
          // Cleanup current player before retry
          if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
          }
          
          // Wait a moment then retry
          setTimeout(() => {
            loadStream(true);
          }, 1000);
          return;
        }
        
        // Max retries reached or non-recoverable error
        setRetryStatus(null);
        setIsLoading(false);
        if (isAccountError) {
          setError(`Channel unavailable after trying ${MAX_RETRIES + 1} sources. Please try again later.`);
        } else if (errorDetail.includes('Network') || errorDetail.includes('fetch')) {
          setBufferingStatus('Reconnecting...');
        } else {
          setError(`Stream error: ${errorDetail}`);
        }
        
        trackLiveTVEvent({
          action: 'error',
          channelId: channel.streamId,
          channelName: channel.name,
          errorMessage: `${errorType}: ${errorDetail}`,
        });
      });

      player.on(mpegts.Events.LOADING_COMPLETE, () => {
        console.log('[LiveTV] Loading complete');
      });

      player.on(mpegts.Events.MEDIA_INFO, () => {
        console.log('[LiveTV] Media info received');
        setIsLoading(false);
        setRetryStatus(null);
        setBufferingStatus(null);
        videoRef.current?.play().catch(() => {});
      });

      playerRef.current = player;

    } catch (err: any) {
      console.error('[LiveTV] Stream load error:', err);
      
      // Use ref for accurate count in closure
      const currentRetry = retryCountRef.current;
      
      // Auto-retry on API errors
      if (currentRetry < MAX_RETRIES) {
        const newRetryCount = currentRetry + 1;
        retryCountRef.current = newRetryCount;
        setRetryCount(newRetryCount);
        setRetryStatus(`Trying source ${newRetryCount + 1} of ${MAX_RETRIES + 1}...`);
        
        setTimeout(() => {
          loadStream(true);
        }, 1000);
        return;
      }
      
      setRetryStatus(null);
      setError(err.message || 'Failed to load stream');
      setIsLoading(false);
    }
  };


  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onPlay = () => {
      setIsPlaying(true);
      if (watchStartTimeRef.current === 0) {
        watchStartTimeRef.current = Date.now();
        trackLiveTVEvent({
          action: 'play_start',
          channelId: channel.streamId,
          channelName: channel.name,
          category: channel.categoryInfo.name,
          country: channel.countryInfo.name,
        });
        startLiveTVSession({
          channelId: channel.streamId,
          channelName: channel.name,
          category: channel.categoryInfo.name,
          country: channel.countryInfo.name,
        });
        updateActivity({
          type: 'livetv',
          contentId: channel.streamId,
          contentTitle: channel.name,
          contentType: 'livetv',
          channelId: channel.streamId,
          channelName: channel.name,
          category: channel.categoryInfo.name,
        });
        presenceContext?.setActivityType('livetv', {
          contentId: channel.streamId,
          contentTitle: channel.name,
        });
      }
    };
    
    const onPause = () => {
      setIsPlaying(false);
      if (watchStartTimeRef.current > 0) {
        const watchDuration = Math.round((Date.now() - watchStartTimeRef.current) / 1000);
        trackLiveTVEvent({
          action: 'play_stop',
          channelId: channel.streamId,
          channelName: channel.name,
          category: channel.categoryInfo.name,
          watchDuration,
        });
      }
      presenceContext?.setActivityType('browsing');
    };
    
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    
    const onWaiting = () => {
      setBufferingStatus('Buffering...');
      recordLiveTVBuffer();
      trackLiveTVEvent({
        action: 'buffer',
        channelId: channel.streamId,
        channelName: channel.name,
      });
    };
    
    const onPlaying = () => setBufferingStatus(null);
    
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = parseFloat(e.target.value);
    videoRef.current.volume = val;
    videoRef.current.muted = val === 0;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, CONTROLS_HIDE_DELAY);
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => resetControlsTimeout(), [resetControlsTimeout]);
  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 1000);
    }
  }, [isPlaying]);
  const handleMouseEnter = useCallback(() => resetControlsTimeout(), [resetControlsTimeout]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'm') toggleMute();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isPlaying]);

  return (
    <div className={styles.playerModal} onClick={onClose}>
      <div 
        ref={containerRef} 
        className={`${styles.playerContainer} ${showControls ? styles.showControls : styles.hideControls}`}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        
        <div className={styles.playerHeader}>
          <span className={styles.liveTag}><span className={styles.liveDot} /> LIVE</span>
          <span className={styles.channelTitle}>{channel.name}</span>
          <span className={styles.channelFlag}>{channel.countryInfo.flag}</span>
          <span className={styles.sourceTag} title="IPTV Source">📡 IPTV</span>
        </div>

        <video ref={videoRef} className={styles.video} playsInline onClick={togglePlay} />

        <div className={styles.customControls}>
          <button className={styles.controlBtn} onClick={togglePlay} type="button">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className={styles.controlBtn} onClick={toggleMute} type="button">
            {isMuted || volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
          />
          <div className={styles.spacer} />
          <div className={styles.controlsLive}>
            <span className={styles.liveDot} /> LIVE
          </div>
          {cast.isAvailable && (
            <button 
              className={`${styles.controlBtn} ${cast.isCasting ? styles.castActive : ''}`} 
              onClick={handleCastClick} 
              type="button"
              title={cast.isCasting ? 'Stop casting' : 'Cast to TV'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 18v3h3c0-1.66-1.34-3-3-3z" />
                <path d="M1 14v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7z" />
                <path d="M1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
                <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
            </button>
          )}
          <button className={styles.controlBtn} onClick={toggleFullscreen} type="button">
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>

        {(isLoading || retryStatus) && (
          <div className={styles.playerOverlay}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>
              {retryStatus || `Loading ${channel.name}...`}
            </p>
            {currentAccount && (
              <p className={styles.accountText}>Account: {currentAccount}</p>
            )}
            {retryStatus && (
              <p className={styles.retrySubtext}>Finding best available source</p>
            )}
          </div>
        )}

        {bufferingStatus && !isLoading && !error && (
          <div className={styles.bufferingOverlay}>
            <div className={styles.bufferingSpinner} />
            <p className={styles.bufferingText}>{bufferingStatus}</p>
          </div>
        )}

        {error && (
          <div className={styles.playerOverlay}>
            <p className={styles.errorText}>{error}</p>
            {error.includes('report') && (
              <p className={styles.errorSubtext}>
                Tried {MAX_RETRIES} sources without success
              </p>
            )}
            <div className={styles.errorActions}>
              <button onClick={() => loadStream()} className={styles.retryBtn}>Try Again</button>
              {error.includes('report') && (
                <button 
                  onClick={() => window.open(`mailto:support@flyx.tv?subject=Channel Down: ${channel.name}&body=The channel "${channel.name}" appears to be down. I tried watching it on ${new Date().toLocaleString()}.`, '_blank')}
                  className={styles.feedbackBtn}
                >
                  Report Issue
                </button>
              )}
              <button onClick={onClose} className={styles.closeErrorBtn}>Close</button>
            </div>
          </div>
        )}

        {isCastOverlayVisible && cast.isCasting && (
          <div className={styles.castOverlay}>
            <div className={styles.castOverlayContent}>
              <div className={styles.castingTo}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 18v3h3c0-1.66-1.34-3-3-3z" />
                  <path d="M1 14v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7z" />
                  <path d="M1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                </svg>
                <span>Casting to TV</span>
              </div>
              <h2 className={styles.castTitle}>{channel.name}</h2>
              <p className={styles.castSubtitle}>{channel.categoryInfo.icon} {channel.categoryInfo.name}</p>
              <div className={styles.castLiveIndicator}>
                <span className={styles.liveDot} /> LIVE
              </div>
              <button 
                className={styles.stopCastBtn}
                onClick={() => { cast.stop(); setIsCastOverlayVisible(false); }}
                type="button"
              >
                Stop Casting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
