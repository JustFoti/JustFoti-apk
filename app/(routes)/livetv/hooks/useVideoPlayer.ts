/**
 * Video Player Hook
 * Handles HLS streaming for DLHD and CDN Live
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { getTvPlaylistUrl, getCdnLiveStreamProxyUrl, getVIPRowStreamUrl } from '@/app/lib/proxy-config';

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

export interface StreamSource {
  type: 'dlhd' | 'cdnlive' | 'viprow';
  channelId: string;
  title: string;
  poster?: string;
  // VIPRow specific
  viprowUrl?: string;
  linkNum?: number;
}

export function useVideoPlayer() {
  const { trackLiveTVEvent, startLiveTVSession, endLiveTVSession } = useAnalytics();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  
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

  const getStreamUrl = useCallback((source: StreamSource): string => {
    switch (source.type) {
      case 'dlhd':
        return getTvPlaylistUrl(source.channelId);
      case 'cdnlive':
        const cdnParts = source.channelId.split('|');
        const channelName = encodeURIComponent(cdnParts[0] || source.channelId);
        const countryCode = cdnParts[1] || 'us';
        return `/api/livetv/cdnlive-stream?channel=${channelName}&code=${countryCode}`;
      case 'viprow':
        // VIPRow uses the Cloudflare proxy directly
        // The viprowUrl is the event path like "/nba/event-online-stream"
        const viprowUrl = source.viprowUrl || source.channelId;
        const linkNum = source.linkNum || 1;
        return getVIPRowStreamUrl(viprowUrl, linkNum);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }, []);

  const loadStream = useCallback(async (source: StreamSource) => {
    if (!videoRef.current) return;

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
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
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

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
          const errorMsg = data.details || 'Stream error';
          if (errorMsg.includes('image') || errorMsg.includes('offline')) {
            setState(prev => ({ 
              ...prev, 
              isLoading: false,
              isBuffering: false,
              loadingStage: 'idle',
              error: 'This stream is not currently live. Please try again when the event starts.' 
            }));
          } else {
            setState(prev => ({ 
              ...prev, 
              isLoading: false,
              isBuffering: false,
              loadingStage: 'idle',
              error: `Stream error: ${data.details}` 
            }));
          }
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

  const stopStream = useCallback(() => {
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

  return {
    videoRef,
    ...state,
    currentSource,
    loadStream,
    stopStream,
    togglePlay,
    toggleMute,
    setVolume,
    toggleFullscreen,
  };
}
