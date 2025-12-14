'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Extend window for AirPlay detection
declare global {
  interface Window {
    WebKitPlaybackTargetAvailabilityEvent?: any;
  }
}

export interface CastState {
  isAvailable: boolean;
  isConnected: boolean;
  isCasting: boolean;
  deviceName: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playerState: 'IDLE' | 'PLAYING' | 'PAUSED' | 'BUFFERING';
  // AirPlay specific
  isAirPlayAvailable: boolean;
  isAirPlayActive: boolean;
  // Error state for UI feedback
  lastError: string | null;
}

export interface UseCastOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videoRef?: any;
}

export interface CastMedia {
  url: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  contentType?: string;
  isLive?: boolean;
  startTime?: number;
}

export function useCast(options: UseCastOptions = {}) {
  const [state, setState] = useState<CastState>({
    isAvailable: true, // Always show button - let user try casting
    isConnected: false,
    isCasting: false,
    deviceName: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playerState: 'IDLE',
    isAirPlayAvailable: false,
    isAirPlayActive: false,
    lastError: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const hasRemotePlaybackRef = useRef(false);
  const hasAirPlayRef = useRef(false);

  // Check for Remote Playback API and AirPlay availability
  useEffect(() => {
    const video = options.videoRef?.current as HTMLVideoElement | null;
    if (!video) return;

    // Check AirPlay (Safari)
    const hasAirPlay = !!(window.WebKitPlaybackTargetAvailabilityEvent || 
      'webkitCurrentPlaybackTargetIsWireless' in video ||
      'webkitShowPlaybackTargetPicker' in video);
    
    hasAirPlayRef.current = hasAirPlay;
    
    if (hasAirPlay) {
      setState(prev => ({ ...prev, isAirPlayAvailable: true, isAvailable: true }));
    }

    // Check Remote Playback API (Chrome/Edge)
    // @ts-ignore - remote is not in standard types
    const remote = video.remote;
    if (remote) {
      hasRemotePlaybackRef.current = true;
      
      // Watch for device availability
      remote.watchAvailability((_available: boolean) => {
        setState(prev => ({ 
          ...prev, 
          isAvailable: true, // Always keep available
        }));
      }).then((id: number) => {
        watchIdRef.current = id;
      }).catch(() => {
        // watchAvailability not supported (common on localhost/HTTP)
        // This is expected - prompt() can still work
      });

      // Listen for state changes
      const handleConnecting = () => {
        setState(prev => ({ ...prev, isConnected: false, isCasting: false, lastError: null }));
      };

      const handleConnect = () => {
        setState(prev => ({ ...prev, isConnected: true, isCasting: true, lastError: null }));
        options.onConnect?.();
      };

      const handleDisconnect = () => {
        setState(prev => ({ ...prev, isConnected: false, isCasting: false }));
        options.onDisconnect?.();
      };

      remote.addEventListener('connecting', handleConnecting);
      remote.addEventListener('connect', handleConnect);
      remote.addEventListener('disconnect', handleDisconnect);

      return () => {
        remote.removeEventListener('connecting', handleConnecting);
        remote.removeEventListener('connect', handleConnect);
        remote.removeEventListener('disconnect', handleDisconnect);
        
        if (watchIdRef.current !== null) {
          remote.cancelWatchAvailability(watchIdRef.current).catch(() => {});
        }
      };
    }
  }, [options.videoRef, options.onConnect, options.onDisconnect]);

  // Listen for AirPlay state changes
  useEffect(() => {
    const video = options.videoRef?.current as HTMLVideoElement | null;
    if (!video) return;

    const handleAirPlayAvailability = (event: any) => {
      const available = event.availability === 'available';
      setState(prev => ({ ...prev, isAirPlayAvailable: available, isAvailable: true }));
    };

    const handleAirPlayChange = () => {
      // @ts-ignore
      const isWireless = video.webkitCurrentPlaybackTargetIsWireless || false;
      setState(prev => ({ 
        ...prev, 
        isAirPlayActive: isWireless,
        isCasting: isWireless || prev.isCasting,
        isConnected: isWireless || prev.isConnected,
        lastError: null,
      }));
      
      if (isWireless) {
        options.onConnect?.();
      } else {
        options.onDisconnect?.();
      }
    };

    video.addEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayAvailability);
    video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleAirPlayChange);

    return () => {
      video.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayAvailability);
      video.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handleAirPlayChange);
    };
  }, [options.videoRef, options.onConnect, options.onDisconnect]);

  // Request cast session - shows device picker
  const requestSession = useCallback(async () => {
    const video = options.videoRef?.current as HTMLVideoElement | null;
    if (!video) {
      const error = 'No video element available';
      setState(prev => ({ ...prev, lastError: error }));
      options.onError?.(error);
      return false;
    }

    // Clear previous error
    setState(prev => ({ ...prev, lastError: null }));

    // Try AirPlay first (Safari)
    // @ts-ignore
    if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
      try {
        // @ts-ignore
        video.webkitShowPlaybackTargetPicker();
        return true;
      } catch {
        // Don't return - try Remote Playback as fallback
      }
    }

    // Try Remote Playback API (Chrome/Edge)
    // @ts-ignore
    const remote = video.remote;
    if (remote) {
      try {
        await remote.prompt();
        return true;
      } catch (error: any) {
        let errorMessage: string;
        if (error.name === 'NotFoundError') {
          errorMessage = 'No cast devices found. Make sure your Chromecast/TV is on the same network.';
        } else if (error.name === 'NotAllowedError') {
          // User cancelled - not an error
          return false;
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'Already connecting to a device';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Casting requires HTTPS. Try deploying to Vercel or using a secure connection.';
        } else {
          errorMessage = error.message || 'Failed to connect to cast device';
        }
        
        setState(prev => ({ ...prev, lastError: errorMessage }));
        options.onError?.(errorMessage);
        return false;
      }
    }

    const error = 'Casting is not supported in this browser. Try Chrome or Safari.';
    setState(prev => ({ ...prev, lastError: error }));
    options.onError?.(error);
    return false;
  }, [options]);

  // Load media (for Remote Playback, media is already loaded via video element)
  const loadMedia = useCallback(async (_media: CastMedia) => {
    // With Remote Playback API, the video element's current source is used
    // No need to load media separately
    return state.isConnected;
  }, [state.isConnected]);

  // Stop casting
  const stop = useCallback(() => {
    // For Remote Playback, we can't programmatically disconnect
    // User needs to use the device picker or the cast device's controls
    setState(prev => ({ ...prev, isCasting: false, isConnected: false }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    stop();
  }, [stop]);

  return {
    ...state,
    requestSession,
    loadMedia,
    stop,
    disconnect,
    // Expose for compatibility
    playOrPause: () => {},
    seek: (_time: number) => {},
    setVolume: (_volume: number) => {},
    toggleMute: () => {},
    showAirPlayPicker: requestSession,
  };
}
