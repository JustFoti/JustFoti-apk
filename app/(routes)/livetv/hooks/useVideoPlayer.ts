/**
 * Video Player Hook
 * Handles HLS streaming for DLHD and CDN Live
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { getTvPlaylistUrl, getCdnLiveStreamProxyUrl } from '@/app/lib/proxy-config';
import { getSavedVolume, getSavedMuteState, saveVolumeSettings } from '@/app/lib/utils/player-preferences';

// Preload hls.js module for faster startup
let hlsModulePromise: Promise<typeof import('hls.js')> | null = null;
function preloadHls() {
  if (!hlsModulePromise) {
    hlsModulePromise = import('hls.js');
  }
  return hlsModulePromise;
}
// Start preloading immediately when this module loads
if (typeof window !== 'undefined') {
  preloadHls();
}

export interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  loadingStage: 'idle' | 'fetching' | 'connecting' | 'buffering';
  error: string | null;
  volume: number;
  currentTime: number;
  duration: number;
  buffered: number;
}

export interface ServerStatus {
  name: string;
  status: 'pending' | 'checking' | 'success' | 'failed';
  elapsed?: number;
  error?: string;
}

export interface StreamSource {
  type: 'dlhd' | 'cdnlive' | 'viprow';
  channelId: string;
  title: string;
  poster?: string;
  // VIPRow specific
  viprowUrl?: string;
  linkNum?: number;
}

// Server backends - SIMPLIFIED: Only dvalna with ddy6 server (Jan 2026)
// Backend selection removed - ddy6 is the only server used for reliability
export const DLHD_BACKENDS = ['dvalna'] as const;
export type DLHDBackend = typeof DLHD_BACKENDS[number];

export const BACKEND_DISPLAY_NAMES: Record<DLHDBackend, string> = {
  dvalna: 'Dvalna (ddy6)',
};

// Generate a simple session fingerprint for anti-leech validation
function generateSessionFingerprint(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return btoa(`${timestamp}:${random}`).replace(/[+/=]/g, '');
}

export function useVideoPlayer() {
  const { trackLiveTVEvent, startLiveTVSession, endLiveTVSession } = useAnalytics();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const loadStartTimeRef = useRef<number>(0);
  const currentSourceRef = useRef<StreamSource | null>(null);
  const retryCountRef = useRef(0);
  const sessionFingerprintRef = useRef<string>(generateSessionFingerprint());
  
  const [state, setState] = useState<PlayerState>(() => ({
    isPlaying: false,
    isMuted: getSavedMuteState(),
    isFullscreen: false,
    isLoading: false,
    isBuffering: false,
    loadingStage: 'idle',
    error: null,
    volume: getSavedVolume(),
    currentTime: 0,
    duration: 0,
    buffered: 0,
  }));

  const [currentSource, setCurrentSource] = useState<StreamSource | null>(null);
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentBackend, setCurrentBackend] = useState<DLHDBackend | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getStreamUrl = useCallback((source: StreamSource): string => {
    // SECURITY: Only log in development to prevent URL exposure
    if (process.env.NODE_ENV === 'development') {
      console.log('[useVideoPlayer] getStreamUrl called with:', source);
    }
    switch (source.type) {
      case 'dlhd':
        // SIMPLIFIED: Only using dvalna/ddy6 - no backend selection needed
        const dlhdUrl = getTvPlaylistUrl(source.channelId);
        if (process.env.NODE_ENV === 'development') {
          console.log('[useVideoPlayer] DLHD URL:', dlhdUrl);
        }
        return dlhdUrl;
      case 'cdnlive':
        const cdnParts = source.channelId.split('|');
        const channelName = encodeURIComponent(cdnParts[0] || source.channelId);
        const countryCode = cdnParts[1] || 'us';
        return `/api/livetv/cdnlive-stream?channel=${channelName}&code=${countryCode}`;
      case 'viprow':
        // VIPRow streams are extracted via CF Worker -> RPI Proxy
        // Returns a playable m3u8 with all URLs rewritten through proxy
        const cfProxyUrl = process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL;
        if (!cfProxyUrl) {
          throw new Error('VIPRow proxy not configured');
        }
        const baseUrl = cfProxyUrl.replace(/\/stream\/?$/, '');
        const viprowUrl = source.viprowUrl || source.channelId;
        const linkNum = source.linkNum || 1;
        return `${baseUrl}/viprow/stream?url=${encodeURIComponent(viprowUrl)}&link=${linkNum}`;
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }, []);

  const loadStreamInternal = useCallback(async (source: StreamSource, skipBackends: string[] = [], isManualSwitch: boolean = false) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useVideoPlayer] loadStreamInternal called with:', source, 'skip:', skipBackends, 'manual:', isManualSwitch);
    }
    if (!videoRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useVideoPlayer] No video ref!');
      }
      return;
    }

    // Reset tracking on first attempt OR manual server switch (not automatic retries)
    const shouldResetTracking = skipBackends.length === 0 || isManualSwitch;
    
    if (shouldResetTracking) {
      loadStartTimeRef.current = Date.now();
      setElapsedTime(0);
      retryCountRef.current = 0;
      currentSourceRef.current = source;
      
      // Initialize server statuses based on source type
      if (source.type === 'dlhd') {
        // Show "Connecting to ddy6 server" status
        setServerStatuses([{ name: 'Connecting to ddy6 server...', status: 'checking' as const }]);
      } else if (source.type === 'cdnlive') {
        setServerStatuses([{ name: 'CDN-Live API', status: 'checking' as const }]);
      } else if (source.type === 'viprow') {
        setServerStatuses([{ name: 'VIPRow Proxy', status: 'checking' as const }]);
      }
      
      // Start elapsed time counter (updates every 100ms, stores tenths of seconds)
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - loadStartTimeRef.current) / 100));
      }, 100);
    }

    setState(prev => ({ ...prev, isLoading: true, isBuffering: false, loadingStage: 'fetching', error: null }));
    setCurrentSource(source);

    try {
      const HlsModule = await preloadHls();
      const Hls = HlsModule.default;
      
      if (!Hls.isSupported()) {
        throw new Error('HLS is not supported in this browser');
      }

      // CRITICAL: Properly clean up existing HLS instance before creating new one
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {
          console.warn('[useVideoPlayer] Error destroying previous HLS:', e);
        }
        hlsRef.current = null;
      }

      let streamUrl = getStreamUrl(source);
      
      // For CDN Live, fetch the stream URL from API first
      if (source.type === 'cdnlive') {
        const apiResponse = await fetch(streamUrl);
        const apiData = await apiResponse.json();
        
        if (!apiData.success || !apiData.streamUrl) {
          const errorMsg = apiData.error || `Failed to get ${source.type.toUpperCase()} stream URL`;
          if (errorMsg.toLowerCase().includes('offline') || errorMsg.toLowerCase().includes('not live')) {
            throw new Error('This stream is not currently live. Please try again when the event starts.');
          }
          throw new Error(errorMsg);
        }
        
        streamUrl = getCdnLiveStreamProxyUrl(apiData.streamUrl);
      }
      
      // VIPRow streams come directly from Cloudflare proxy as m3u8
      // No additional API call needed - the URL is already the playable stream
      
      // Update to connecting stage
      setState(prev => ({ ...prev, loadingStage: 'connecting' }));
      
      const hls = new Hls({
        enableWorker: true,
        // ============================================================
        // FAST STARTUP CONFIG - Optimized for quick time-to-first-frame
        // ============================================================
        
        // LOW LATENCY MODE: Disabled - we want stability over latency
        lowLatencyMode: false,
        
        // STARTUP OPTIMIZATION: Start playing ASAP with minimal buffer
        maxBufferLength: 10,           // Only buffer 10 sec initially (was 90)
        maxMaxBufferLength: 60,        // Expand to 60 sec once playing (was 180)
        maxBufferSize: 60 * 1000 * 1000, // 60MB max (was 200MB)
        
        // BACK BUFFER: Keep less history to reduce memory
        backBufferLength: 30,          // 30 sec back buffer (was 120)
        
        // BUFFER HOLE HANDLING: Be aggressive about skipping gaps
        maxBufferHole: 0.5,            // Skip 0.5 sec gaps (was 2.0)
        
        // LIVE SYNC: Stay closer to live edge for faster start
        liveSyncDurationCount: 3,      // 3 segments behind live (~12 sec, was 8)
        liveMaxLatencyDurationCount: 10, // Max 10 segments latency (~40 sec, was 20)
        liveSyncOnStallIncrease: 1, // Only add 1 segment on stall
        
        // FRAGMENT LOADING: Faster timeouts, fewer retries - SKIP BAD SEGMENTS FAST
        fragLoadingTimeOut: 10000,     // 10 sec timeout - skip slow segments
        fragLoadingMaxRetry: 1,        // Only 1 retry - skip broken segments fast
        fragLoadingRetryDelay: 500,    // 0.5 sec between retries
        
        // MANIFEST LOADING: Quick manifest fetch
        manifestLoadingTimeOut: 15000, // 15 sec (was 30)
        manifestLoadingMaxRetry: 2,    // 2 retries (was 4)
        manifestLoadingRetryDelay: 500,
        
        // LEVEL LOADING: Quick level switch
        levelLoadingTimeOut: 15000,    // 15 sec (was 30)
        levelLoadingMaxRetry: 2,       // 2 retries (was 4)
        levelLoadingRetryDelay: 500,
        
        // ABR: Start with lowest quality for fast start, then upgrade
        startLevel: 0,                 // Start at lowest quality
        abrEwmaDefaultEstimate: 500000, // Assume 500kbps initially
        abrBandWidthFactor: 0.8,       // Conservative bandwidth estimate
        abrBandWidthUpFactor: 0.5,     // Slow to upgrade quality
        
        // STALL RECOVERY: Quick recovery from stalls
        highBufferWatchdogPeriod: 2,   // Check every 2 sec (was 5)
        nudgeOffset: 0.2,              // Small nudge (was 0.5)
        nudgeMaxRetry: 3,              // 3 retries then skip (was 10)
        maxFragLookUpTolerance: 0.25,  // Tighter tolerance (was 1.0)
        
        // START POSITION: Start from live edge
        startPosition: -1,
        
        // PROGRESSIVE LOADING: Load fragments progressively
        progressive: true,
        
        // INITIAL LIVE MANIFEST SIZE: Smaller initial load
        initialLiveManifestSize: 2,    // Only need 2 segments to start
      });

      hlsRef.current = hls;

      // Track manifest loading to get backend info from headers
      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        if (source.type === 'dlhd') {
          // Mark first server as checking
          setServerStatuses(prev => prev.map((s, i) => 
            i === 0 ? { ...s, status: 'checking' as const } : s
          ));
        }
      });

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        // Try to get backend info from response
        const elapsed = Date.now() - loadStartTimeRef.current;
        
        if (source.type === 'dlhd') {
          // Always show dvalna/ddy6 since that's the only backend
          setCurrentBackend('dvalna');
          
          // Mark loading as success
          setServerStatuses([{ name: 'Connected to ddy6', status: 'success' as const, elapsed }]);
        } else {
          setServerStatuses(prev => prev.map(s => ({ ...s, status: 'success' as const, elapsed })));
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Stop elapsed timer
        if (elapsedIntervalRef.current) {
          clearInterval(elapsedIntervalRef.current);
          elapsedIntervalRef.current = null;
        }
        
        setState(prev => ({ ...prev, loadingStage: 'buffering' }));
        const video = videoRef.current;
        if (video) {
          // Apply saved volume settings
          const savedVolume = getSavedVolume();
          const savedMuted = getSavedMuteState();
          
          // Start muted for autoplay policy, then restore saved settings
          video.muted = true;
          video.volume = savedVolume;
          
          video.play().then(() => {
            setState(prev => ({ ...prev, isPlaying: true, isLoading: false, loadingStage: 'idle' }));
            // Restore saved mute state after autoplay succeeds
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.muted = savedMuted;
                setState(prev => ({ ...prev, isMuted: savedMuted, volume: savedVolume }));
              }
            }, 100);
          }).catch(err => {
            console.warn('Autoplay failed:', err);
            setState(prev => ({ ...prev, isPlaying: false, isLoading: false, loadingStage: 'idle' }));
          });
        }
      });

      // Track consecutive fragment errors for recovery
      let fragErrorCount = 0;
      let mediaErrorRecoveryAttempts = 0;
      let lastErrorTime = 0;
      const MAX_FRAG_ERRORS = 3; // Reduced - skip faster
      const MAX_MEDIA_ERROR_RECOVERY = 3;
      const ERROR_RESET_INTERVAL = 10000; // Reset error count after 10s of success

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        // Reset error counts on successful fragment buffer
        fragErrorCount = 0;
        lastErrorTime = 0;
        
        if (videoRef.current) {
          const buffered = videoRef.current.buffered;
          if (buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1);
            const currentTime = videoRef.current.currentTime;
            setState(prev => ({ 
              ...prev, 
              buffered: ((bufferedEnd - currentTime) / 30) * 100 
            }));
          }
        }
      });

      hls.on(Hls.Events.ERROR, async (_, data) => {
        const now = Date.now();
        
        // Reset error counts if we've had success for a while
        if (now - lastErrorTime > ERROR_RESET_INTERVAL) {
          fragErrorCount = 0;
          mediaErrorRecoveryAttempts = 0;
        }
        lastErrorTime = now;
        
        // Handle buffer stalled error - skip ahead to live edge
        if (!data.fatal && data.details === 'bufferStalledError') {
          console.warn('[useVideoPlayer] Buffer stalled, seeking to live edge');
          if (hls.liveSyncPosition && videoRef.current) {
            videoRef.current.currentTime = hls.liveSyncPosition;
          }
          return;
        }
        
        // Handle fragment loading errors - skip the broken segment
        if (!data.fatal && (data.details === 'fragLoadError' || data.details === 'fragLoadTimeOut')) {
          console.warn('[useVideoPlayer] Fragment load error, skipping segment', {
            frag: data.frag?.sn,
            error: data.details,
          });
          // HLS.js will automatically retry/skip, just log it
          return;
        }
        
        // Handle non-fatal fragParsingError - proxy returned bad data
        if (!data.fatal && data.details === 'fragParsingError') {
          fragErrorCount++;
          console.warn(`[useVideoPlayer] Fragment parsing error ${fragErrorCount}/${MAX_FRAG_ERRORS}`, {
            frag: data.frag?.sn,
            url: data.frag?.url?.substring(0, 80),
          });
          
          // Skip ahead immediately on parsing errors
          if (fragErrorCount >= MAX_FRAG_ERRORS) {
            console.warn('[useVideoPlayer] Too many fragment errors, skipping ahead');
            fragErrorCount = 0;
            
            if (videoRef.current && hls.media) {
              // Try to skip to live sync position first
              if (hls.liveSyncPosition) {
                console.log('[useVideoPlayer] Seeking to live sync position', hls.liveSyncPosition);
                videoRef.current.currentTime = hls.liveSyncPosition;
                return;
              }
              
              // Otherwise skip forward 5 seconds
              const newTime = videoRef.current.currentTime + 5;
              console.log('[useVideoPlayer] Seeking forward 5 seconds to', newTime);
              videoRef.current.currentTime = newTime;
            }
          }
          return;
        }
        
        // Handle buffer append errors - usually means corrupted segment data
        if (!data.fatal && data.details === 'bufferAppendError') {
          console.warn('[useVideoPlayer] Buffer append error, attempting recovery');
          mediaErrorRecoveryAttempts++;
          
          if (mediaErrorRecoveryAttempts <= MAX_MEDIA_ERROR_RECOVERY) {
            // Try to recover
            hls.recoverMediaError();
            
            // Also skip ahead to avoid the bad segment
            if (videoRef.current && hls.liveSyncPosition) {
              setTimeout(() => {
                if (videoRef.current && hls.liveSyncPosition) {
                  videoRef.current.currentTime = hls.liveSyncPosition;
                }
              }, 500);
            }
          }
          return;
        }
        
        // Handle other non-fatal media errors
        if (!data.fatal && data.type === 'mediaError') {
          console.warn('[useVideoPlayer] Media error, attempting recovery', data.details);
          mediaErrorRecoveryAttempts++;
          
          if (mediaErrorRecoveryAttempts <= MAX_MEDIA_ERROR_RECOVERY) {
            hls.recoverMediaError();
          }
          return;
        }
        
        // Log errors for debugging (not all errors, just important ones)
        if (data.fatal || data.type === 'mediaError') {
          console.error('HLS Error:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: data.frag?.url?.substring(0, 100),
            response: data.response?.code,
          });
        }
        
        if (data.fatal) {
          const elapsed = Date.now() - loadStartTimeRef.current;
          const errorDetails = data.details || 'Unknown error';
          
          console.log(`[useVideoPlayer] Fatal error on dvalna/ddy6: ${errorDetails}`);
          
          // Stop elapsed timer - no fallback available
          if (elapsedIntervalRef.current) {
            clearInterval(elapsedIntervalRef.current);
            elapsedIntervalRef.current = null;
          }
          
          // Mark server as failed
          if (source.type === 'dlhd') {
            setServerStatuses([{ 
              name: 'ddy6 server', 
              status: 'failed', 
              elapsed,
              error: errorDetails
            }]);
          } else {
            setServerStatuses(prev => prev.map(s => ({ 
              ...s, 
              status: 'failed' as const, 
              elapsed,
              error: errorDetails
            })));
          }
          
          let errorMessage = 'Stream error';
          
          // Handle specific error types
          if (data.type === 'networkError') {
            if (data.details === 'manifestLoadError' || data.details === 'manifestParsingError') {
              errorMessage = 'Channel unavailable. The ddy6 server could not provide this stream.';
            } else if (data.details === 'fragLoadError') {
              errorMessage = 'Failed to load video segments from ddy6 server.';
            } else if (data.details === 'keyLoadError') {
              errorMessage = 'Failed to load decryption key from ddy6 server.';
            } else {
              errorMessage = 'Network error. Please check your connection and try again.';
            }
          } else if (data.type === 'mediaError') {
            if (data.details?.includes('decrypt')) {
              errorMessage = 'Decryption failed. The stream may have changed.';
            } else {
              errorMessage = 'Media playback error. Please try again.';
            }
          } else {
            const details = data.details || '';
            if (details.includes('image') || details.includes('offline')) {
              errorMessage = 'This stream is not currently live. Please try again when the event starts.';
            } else {
              errorMessage = `Stream error: ${details}`;
            }
          }
          
          setState(prev => ({ 
            ...prev, 
            isLoading: false,
            isBuffering: false,
            loadingStage: 'idle',
            error: errorMessage 
          }));
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      startLiveTVSession({
        channelId: source.channelId,
        channelName: source.title,
        category: source.type,
      });

      trackLiveTVEvent({
        action: 'play_start',
        channelId: source.channelId,
        channelName: source.title,
        category: source.type,
      });

    } catch (error) {
      console.error('Error loading stream:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isBuffering: false,
        loadingStage: 'idle',
        error: error instanceof Error ? error.message : 'Failed to load stream' 
      }));
    }
  }, [getStreamUrl, trackLiveTVEvent, startLiveTVSession]);

  // Public loadStream function - resets state and starts fresh
  const loadStream = useCallback((source: StreamSource) => {
    loadStreamInternal(source);
  }, [loadStreamInternal]);

  const stopStream = useCallback(() => {
    // Clean up elapsed timer
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    
    // CRITICAL: Destroy HLS instance FIRST to stop all network requests
    if (hlsRef.current) {
      try {
        // Stop loading immediately
        hlsRef.current.stopLoad();
        // Detach from media element
        hlsRef.current.detachMedia();
        // Destroy the instance
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('[useVideoPlayer] Error destroying HLS:', e);
      }
      hlsRef.current = null;
    }

    // Then clean up video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        // Remove src to stop any pending requests
        videoRef.current.removeAttribute('src');
        // Force load to clear any buffered data
        videoRef.current.load();
      } catch (e) {
        console.warn('[useVideoPlayer] Error cleaning up video:', e);
      }
    }

    endLiveTVSession();

    setState(prev => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
      error: null,
      currentTime: 0,
      duration: 0,
      buffered: 0,
    }));

    setCurrentSource(null);
    setServerStatuses([]);
    setElapsedTime(0);
    setCurrentBackend(null);
    retryCountRef.current = 0;
    currentSourceRef.current = null;
  }, [endLiveTVSession]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (state.isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [state.isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;
    setState(prev => {
      // Save volume settings when mute state changes
      saveVolumeSettings(prev.volume, newMuted);
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!videoRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    videoRef.current.volume = clampedVolume;
    setState(prev => {
      // Save volume settings when volume changes
      saveVolumeSettings(clampedVolume, prev.isMuted);
      return { ...prev, volume: clampedVolume };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePlaying = () => setState(prev => ({ ...prev, isPlaying: true, isBuffering: false }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleEnded = () => setState(prev => ({ ...prev, isPlaying: false }));
    const handleWaiting = () => setState(prev => ({ ...prev, isBuffering: true }));
    const handleCanPlay = () => setState(prev => ({ ...prev, isBuffering: false }));
    const handleVolumeChange = () => {
      setState(prev => ({ 
        ...prev, 
        volume: video.volume,
        isMuted: video.muted,
      }));
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [currentSource]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => { stopStream(); };
  }, [stopStream]);

  // Get the current stream URL for copying (with session fingerprint for tracking)
  // SECURITY: URL includes session fingerprint to help identify leaks
  const getStreamUrlForCopy = useCallback((): string | null => {
    if (!currentSource) return null;
    try {
      const baseUrl = getStreamUrl(currentSource);
      // Add session fingerprint for anti-leech tracking
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}_sid=${sessionFingerprintRef.current}`;
    } catch {
      return null;
    }
  }, [currentSource, getStreamUrl]);

  // Switch to a specific backend (for manual server selection)
  // SIMPLIFIED: Only dvalna/ddy6 available - this just reloads the stream
  const switchBackend = useCallback((_backend: DLHDBackend) => {
    const source = currentSourceRef.current || currentSource;
    
    if (!source || source.type !== 'dlhd') {
      console.warn('[useVideoPlayer] Cannot reload - no DLHD source active');
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[useVideoPlayer] Reloading stream with dvalna/ddy6 backend');
    }
    
    // Stop elapsed timer from previous attempt
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    
    // Reset tracking for fresh attempt
    setCurrentBackend(null);
    
    // Destroy current HLS instance to stop any ongoing loading
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Ensure the source ref is set for the new load
    currentSourceRef.current = source;
    
    // Reload stream
    loadStreamInternal(source);
  }, [loadStreamInternal, currentSource]);

  return {
    videoRef,
    ...state,
    currentSource,
    serverStatuses,
    elapsedTime,
    currentBackend,
    getStreamUrlForCopy,
    loadStream,
    stopStream,
    switchBackend,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
  };
}
