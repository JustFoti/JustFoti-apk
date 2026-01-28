/**
 * Live TV Video Player
 * 
 * Native HLS.js player for DLHD, CDN Live, and VIPRow streams.
 * NO EMBEDS - direct m3u8 playback with full controls.
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { LiveEvent, TVChannel } from '../hooks/useLiveTVData';
import { getTvPlaylistUrl } from '@/app/lib/proxy-config';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  event: LiveEvent | null;
  channel: TVChannel | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayer({ event, channel, isOpen, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [qualities, setQualities] = useState<Array<{ height: number; index: number }>>([]);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Get stream URL based on source
  const getStreamUrl = useCallback((): string | null => {
    // Channel playback (DLHD or CDN Live)
    if (channel) {
      if (channel.source === 'dlhd') {
        // Use CF Worker proxy - throws if not configured
        return getTvPlaylistUrl(channel.channelId);
      }
      if (channel.source === 'cdnlive') {
        // CDN Live uses channel name|country format
        const [name, country] = channel.channelId.split('|');
        return `/api/livetv/cdnlive-stream?channel=${encodeURIComponent(name)}&code=${country || ''}`;
      }
    }

    // Event playback
    if (event) {
      // DLHD event - use first channel
      if (event.source === 'dlhd' && event.channels.length > 0) {
        const channelId = event.channels[0].channelId;
        return getTvPlaylistUrl(channelId);
      }

      // VIPRow event - use CF proxy
      if (event.source === 'viprow' && event.viprowUrl) {
        const cfProxy = process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL;
        if (cfProxy) {
          const baseUrl = cfProxy.replace(/\/stream\/?$/, '');
          return `${baseUrl}/viprow/stream?url=${encodeURIComponent(event.viprowUrl)}&link=1`;
        }
        return `/api/livetv/viprow-stream?url=${encodeURIComponent(event.viprowUrl)}&link=1`;
      }
    }

    return null;
  }, [event, channel]);

  // Initialize HLS player
  const initPlayer = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    const streamUrl = getStreamUrl();
    if (!streamUrl) {
      setError('No stream URL available');
      setIsLoading(false);
      return;
    }

    console.log('[LiveTV Player] Loading stream:', streamUrl);

    // For CDN Live API responses, we need to fetch the actual m3u8 URL
    if (streamUrl.includes('/api/livetv/cdnlive-stream')) {
      try {
        const response = await fetch(streamUrl);
        const data = await response.json();
        
        if (!data.success || !data.streamUrl) {
          setError(data.error || 'Failed to get CDN Live stream');
          setIsLoading(false);
          return;
        }
        
        // Use the actual stream URL
        loadHlsStream(video, data.streamUrl);
      } catch (err) {
        setError('Failed to fetch CDN Live stream');
        setIsLoading(false);
      }
      return;
    }

    // For VIPRow API responses
    if (streamUrl.includes('/api/livetv/viprow-stream')) {
      try {
        const response = await fetch(streamUrl);
        const data = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Failed to get VIPRow stream');
          setIsLoading(false);
          return;
        }
        
        // VIPRow returns either streamUrl (m3u8) or playerUrl (embed)
        if (data.streamUrl) {
          loadHlsStream(video, data.streamUrl);
        } else {
          setError('VIPRow stream not available - try another link');
          setIsLoading(false);
        }
      } catch (err) {
        setError('Failed to fetch VIPRow stream');
        setIsLoading(false);
      }
      return;
    }

    // Direct m3u8 URL (DLHD proxy or CF proxy)
    loadHlsStream(video, streamUrl);
  }, [getStreamUrl]);

  // Load HLS stream
  const loadHlsStream = (video: HTMLVideoElement, url: string) => {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        // Retry configuration
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.log('[LiveTV Player] Manifest parsed, levels:', data.levels.length);
        
        // Extract quality levels
        const levels = data.levels.map((level, index) => ({
          height: level.height,
          index,
        })).filter(l => l.height > 0);
        
        setQualities(levels);
        setIsLoading(false);
        
        // Auto-play
        video.play().catch(err => {
          console.warn('[LiveTV Player] Autoplay blocked:', err);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[LiveTV Player] HLS error:', data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[LiveTV Player] Network error, attempting recovery...');
              if (retryCount < 3) {
                setRetryCount(prev => prev + 1);
                hls.startLoad();
              } else {
                setError('Network error - stream may be offline');
                setIsLoading(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[LiveTV Player] Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError('Stream playback failed');
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setError('Failed to load stream');
        setIsLoading(false);
      });
    } else {
      setError('HLS playback not supported in this browser');
      setIsLoading(false);
    }
  };

  // Initialize when opened
  useEffect(() => {
    if (isOpen && (event || channel)) {
      setRetryCount(0);
      initPlayer();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, event, channel, initPlayer]);

  // Video event handlers - sync state with actual video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video.paused) video.play();
          else video.pause();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen?.();
          } else {
            onClose();
          }
          break;
      }
      showControlsTemporarily();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose, showControlsTemporarily]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Play/Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    if (newVolume > 0) video.muted = false;
  };

  // Quality selection
  const selectQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQuality(index);
    }
    setShowQualityMenu(false);
  };

  // Retry stream
  const retryStream = () => {
    setRetryCount(0);
    initPlayer();
  };

  // Get title
  const getTitle = () => {
    if (channel) return channel.name;
    if (event) return event.title;
    return 'Live TV';
  };

  if (!isOpen) return null;

  return (
    <div className={styles.playerOverlay}>
      <div 
        ref={containerRef}
        className={styles.playerContainer}
        onMouseMove={showControlsTemporarily}
        onClick={(e) => {
          if (e.target === e.currentTarget) togglePlay();
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          onClick={togglePlay}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
            <p>Loading stream...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={styles.errorOverlay}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={retryStream} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {/* Controls */}
        <div className={`${styles.controls} ${showControls ? styles.visible : ''}`}>
          {/* Top Bar */}
          <div className={styles.topBar}>
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
            <div className={styles.titleSection}>
              <h2 className={styles.title}>{getTitle()}</h2>
              {event?.isLive && (
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} />
                  LIVE
                </span>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={styles.bottomBar}>
            {/* Play/Pause */}
            <button onClick={togglePlay} className={styles.controlButton}>
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className={styles.volumeControl}>
              <button 
                onClick={() => {
                  const video = videoRef.current;
                  if (video) video.muted = !video.muted;
                }}
                className={styles.controlButton}
              >
                {isMuted || volume === 0 ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
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
            </div>

            <div className={styles.spacer} />

            {/* Quality Selector */}
            {qualities.length > 0 && (
              <div className={styles.qualitySelector}>
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className={styles.controlButton}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                  </svg>
                  <span className={styles.qualityLabel}>
                    {currentQuality === -1 ? 'Auto' : `${qualities.find(q => q.index === currentQuality)?.height || ''}p`}
                  </span>
                </button>
                
                {showQualityMenu && (
                  <div className={styles.qualityMenu}>
                    <button
                      onClick={() => selectQuality(-1)}
                      className={`${styles.qualityOption} ${currentQuality === -1 ? styles.active : ''}`}
                    >
                      Auto
                    </button>
                    {qualities.map((q) => (
                      <button
                        key={q.index}
                        onClick={() => selectQuality(q.index)}
                        className={`${styles.qualityOption} ${currentQuality === q.index ? styles.active : ''}`}
                      >
                        {q.height}p
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className={styles.controlButton}>
              {isFullscreen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
