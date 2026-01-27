/**
 * Video Player Hook
 * Handles HLS streaming for DLHD and CDN Live
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { getTvPlaylistUrl, getCdnLiveStreamProxyUrl } from '@/app/lib/proxy-config';

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

// Server backends in order of priority (matches tv-proxy.ts)
export const DLHD_BACKENDS = ['moveonjoy', 'cdnlive', 'dvalna'] as const;
export type DLHDBackend = typeof DLHD_BACKENDS[number];

export const BACKEND_DISPLAY_NAMES: Record<DLHDBackend, string> = {
  moveonjoy: 'MoveonJoy',
  cdnlive: 'CDN-Live',
  dvalna: 'Dvalna.ru',
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
  const failedBackendsRef = useRef<string[]>([]);
  const currentSourceRef = useRef<StreamSource | null>(null);
  const retryCountRef = useRef(0);
  const sessionFingerprintRef = useRef<string>(generateSessionFingerprint());
  
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    isMuted: true,
    isFullscreen: false,
    isLoading: false,
    isBuffering: false,
    loadingStage: 'idle',
    error: null,
    volume: 1,
    currentTime: 0,
    duration: 0,
    buffered: 0,
  });

  const [currentSource, setCurrentSource] = useState<StreamSource | null>(null);
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeBackend, setActiveBackend] = useState<string | null>(null);
  const [currentBackend, setCurrentBackend] = useState<DLHDBackend | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track manually selected backend (when user picks from dropdown)
  const manualBackendRef = useRef<DLHDBackend | null>(null);

  const getStreamUrl = useCallback((source: StreamSource, skipBackends: string[] = []): string => {
    // SECURITY: Only log in development to prevent URL exposure
    if (process.env.NODE_ENV === 'development') {
      console.log('[useVideoPlayer] getStreamUrl called with:', source, 'skip:', skipBackends);
    }
    switch (source.type) {
      case 'dlhd':
        let dlhdUrl = getTvPlaylistUrl(source.channelId);
        // Add skip parameter if we have failed backends
        if (skipBackends.length > 0) {
          dlhdUrl += `&skip=${skipBackends.join(',')}`;
        }
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

  const loadStreamInternal = useCallback(async (source: StreamSource, skipBackends: string[] = []) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useVideoPlayer] loadStreamInternal called with:', source, 'skip:', skipBackends);
    }
    if (!videoRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useVideoPlayer] No video ref!');
      }
      return;
    }

    // Only reset tracking on first attempt (not retries)
    if (skipBackends.length === 0) {
      loadStartTimeRef.current = Date.now();
      setElapsedTime(0);
      setActiveBackend(null);
      failedBackendsRef.current = [];
      retryCountRef.current = 0;
      currentSourceRef.current = source;
      manualBackendRef.current = null; // Clear manual selection on fresh load
      
      // Initialize server statuses based on source type
      if (source.type === 'dlhd') {
        setServerStatuses(DLHD_BACKENDS.map(id => ({ 
          name: BACKEND_DISPLAY_NAMES[id], 
          status: 'pending' as const 
        })));
        // Mark first as checking
        setServerStatuses(prev => prev.map((s, i) => 
          i === 0 ? { ...s, status: 'checking' as const } : s
        ));
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
      const Hls = (await import('hls.js')).default;
      
      if (!Hls.isSupported()) {
        throw new Error('HLS is not supported in this browser');
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      let streamUrl = getStreamUrl(source, skipBackends);
      
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
        // Disable low latency mode - prioritize smooth playback over low latency
        // DLHD CDN is slow, so we need large buffers
        lowLatencyMode: false,
        backBufferLength: 120,
        // AGGRESSIVE buffer sizes for slow DLHD CDN
        maxBufferLength: 90,        // Buffer up to 90 seconds ahead
        maxMaxBufferLength: 180,    // Allow up to 180 seconds buffer (3 min)
        maxBufferSize: 200 * 1000 * 1000, // 200MB buffer
        maxBufferHole: 2.0,         // Allow 2 second gaps
        highBufferWatchdogPeriod: 5, // Check buffer every 5 seconds
        nudgeOffset: 0.5,           // Larger nudge offset
        nudgeMaxRetry: 10,          // More retries
        maxFragLookUpTolerance: 1.0, // More tolerance
        // Live stream settings - allow MORE latency for stability
        liveSyncDurationCount: 8,   // Sync to 8 segments behind live (~32 sec)
        liveMaxLatencyDurationCount: 20, // Allow up to 20 segments latency (~80 sec)
        // Fragment loading settings - be patient with slow CDN
        fragLoadingTimeOut: 60000,  // 60 second timeout for fragments
        fragLoadingMaxRetry: 10,    // Retry fragment loading 10 times
        fragLoadingRetryDelay: 2000, // 2 seconds between retries
        // Manifest loading
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 4,
        // Level loading
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 4,
        // Start from live edge minus buffer
        startPosition: -1,
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
        
        // The CF worker adds X-DLHD-Backend header
        // We can't access it directly from HLS.js, but we can infer from URL or timing
        if (source.type === 'dlhd') {
          // If user manually selected a backend, use that
          // Otherwise determine which backend succeeded based on how many failed
          if (manualBackendRef.current) {
            setCurrentBackend(manualBackendRef.current);
            // Clear manual selection after successful load
            manualBackendRef.current = null;
          } else {
            const backendIndex = failedBackendsRef.current.length;
            if (backendIndex < DLHD_BACKENDS.length) {
              setCurrentBackend(DLHD_BACKENDS[backendIndex]);
            }
          }
          
          // Mark all as success since we got a manifest
          setServerStatuses(prev => {
            const updated = [...prev];
            // Find first pending/checking and mark as success
            const checkingIdx = updated.findIndex(s => s.status === 'checking' || s.status === 'pending');
            if (checkingIdx >= 0) {
              updated[checkingIdx] = { ...updated[checkingIdx], status: 'success', elapsed };
            }
            return updated;
          });
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
          video.muted = true;
          setState(prev => ({ ...prev, isMuted: true }));
          
          video.play().then(() => {
            setState(prev => ({ ...prev, isPlaying: true, isLoading: false, loadingStage: 'idle' }));
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                setState(prev => ({ ...prev, isMuted: false }));
              }
            }, 100);
          }).catch(err => {
            console.warn('Autoplay failed:', err);
            setState(prev => ({ ...prev, isPlaying: false, isLoading: false, loadingStage: 'idle' }));
          });
        }
      });

      hls.on(Hls.Events.ERROR, async (_, data) => {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
          const elapsed = Date.now() - loadStartTimeRef.current;
          
          // Determine which backend failed based on current index
          const currentBackend = source.type === 'dlhd' ? DLHD_BACKENDS[failedBackendsRef.current.length] : null;
          const errorDetails = data.details || 'Unknown error';
          
          console.log(`[useVideoPlayer] Fatal error on backend: ${currentBackend}, details: ${errorDetails}`);
          
          // For DLHD, try next backend before giving up
          if (source.type === 'dlhd' && currentBackend && failedBackendsRef.current.length < DLHD_BACKENDS.length - 1) {
            console.log(`[useVideoPlayer] Trying next backend after ${currentBackend} failed`);
            
            // Mark current as failed
            setServerStatuses(prev => {
              const updated = [...prev];
              const idx = failedBackendsRef.current.length;
              if (idx < updated.length) {
                updated[idx] = { ...updated[idx], status: 'failed', elapsed, error: errorDetails };
              }
              // Mark next as checking
              if (idx + 1 < updated.length) {
                updated[idx + 1] = { ...updated[idx + 1], status: 'checking' };
              }
              return updated;
            });
            
            // Add to failed list
            failedBackendsRef.current.push(currentBackend);
            
            // Destroy current HLS
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }
            
            // Small delay then retry
            await new Promise(resolve => setTimeout(resolve, 300));
            loadStreamInternal(source, [...failedBackendsRef.current]);
            return;
          }
          
          // Stop elapsed timer - all backends exhausted or non-DLHD source
          if (elapsedIntervalRef.current) {
            clearInterval(elapsedIntervalRef.current);
            elapsedIntervalRef.current = null;
          }
          
          // Mark current server as failed
          if (source.type === 'dlhd') {
            setServerStatuses(prev => {
              const updated = [...prev];
              const checkingIdx = updated.findIndex(s => s.status === 'checking' || s.status === 'success');
              if (checkingIdx >= 0) {
                updated[checkingIdx] = { 
                  ...updated[checkingIdx], 
                  status: 'failed', 
                  elapsed,
                  error: errorDetails
                };
              }
              return updated;
            });
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
              errorMessage = 'Channel unavailable. All servers failed to provide this stream.';
            } else if (data.details === 'fragLoadError') {
              errorMessage = 'Failed to load video segments. All servers exhausted.';
            } else if (data.details === 'keyLoadError') {
              errorMessage = 'Failed to load decryption key. All servers exhausted.';
            } else {
              errorMessage = 'Network error. Please check your connection and try again.';
            }
          } else if (data.type === 'mediaError') {
            if (data.details?.includes('decrypt')) {
              errorMessage = 'Decryption failed on all servers. The stream may have changed.';
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
          
          // Add info about backends tried
          if (source.type === 'dlhd' && failedBackendsRef.current.length > 0) {
            errorMessage += ` (Tried: ${failedBackendsRef.current.map(b => BACKEND_DISPLAY_NAMES[b as DLHDBackend] || b).join(', ')})`;
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

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
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
    loadStreamInternal(source, []);
  }, [loadStreamInternal]);

  const stopStream = useCallback(() => {
    // Clean up elapsed timer
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
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
    setActiveBackend(null);
    failedBackendsRef.current = [];
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
    videoRef.current.muted = !videoRef.current.muted;
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!videoRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    videoRef.current.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
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
  const switchBackend = useCallback((backend: DLHDBackend) => {
    if (!currentSourceRef.current || currentSourceRef.current.type !== 'dlhd') {
      console.warn('[useVideoPlayer] Cannot switch backend - no DLHD source active');
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[useVideoPlayer] Switching to backend:', backend);
    }
    
    // Build skip list: all backends except the one we want
    const skipBackends = DLHD_BACKENDS.filter(b => b !== backend);
    
    // Track the manually selected backend so MANIFEST_LOADED knows which one we're using
    manualBackendRef.current = backend;
    
    // Reset tracking for fresh attempt
    failedBackendsRef.current = [];
    setCurrentBackend(null);
    
    // Destroy current HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Load with skip list to force specific backend
    loadStreamInternal(currentSourceRef.current, skipBackends);
  }, [loadStreamInternal]);

  return {
    videoRef,
    ...state,
    currentSource,
    serverStatuses,
    elapsedTime,
    activeBackend,
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
