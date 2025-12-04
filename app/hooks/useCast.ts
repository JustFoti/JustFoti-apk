'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Chromecast SDK types
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: {
      framework: {
        CastContext: {
          getInstance: () => CastContext;
        };
        CastContextEventType: {
          SESSION_STATE_CHANGED: string;
          CAST_STATE_CHANGED: string;
        };
        SessionState: {
          SESSION_STARTED: string;
          SESSION_RESUMED: string;
          SESSION_ENDED: string;
        };
        CastState: {
          NO_DEVICES_AVAILABLE: string;
          NOT_CONNECTED: string;
          CONNECTING: string;
          CONNECTED: string;
        };
        RemotePlayerEventType: {
          IS_CONNECTED_CHANGED: string;
          IS_MEDIA_LOADED_CHANGED: string;
          CURRENT_TIME_CHANGED: string;
          DURATION_CHANGED: string;
          VOLUME_LEVEL_CHANGED: string;
          IS_MUTED_CHANGED: string;
          PLAYER_STATE_CHANGED: string;
        };
        RemotePlayer: new () => RemotePlayer;
        RemotePlayerController: new (player: RemotePlayer) => RemotePlayerController;
      };
    };
    chrome?: {
      cast: {
        media: {
          MediaInfo: new (contentId: string, contentType: string) => MediaInfo;
          GenericMediaMetadata: new () => GenericMediaMetadata;
          LoadRequest: new (mediaInfo: MediaInfo) => LoadRequest;
          StreamType: {
            BUFFERED: string;
            LIVE: string;
          };
        };
      };
    };
  }
}

interface CastContext {
  setOptions: (options: { receiverApplicationId: string; autoJoinPolicy: string }) => void;
  requestSession: () => Promise<void>;
  endCurrentSession: (stopCasting: boolean) => void;
  getCurrentSession: () => CastSession | null;
  getCastState: () => string;
  addEventListener: (type: string, handler: (event: any) => void) => void;
  removeEventListener: (type: string, handler: (event: any) => void) => void;
}

interface CastSession {
  getMediaSession: () => MediaSession | null;
  loadMedia: (request: LoadRequest) => Promise<void>;
}

interface MediaSession {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (request: { currentTime: number }) => void;
}

interface RemotePlayer {
  isConnected: boolean;
  isMediaLoaded: boolean;
  currentTime: number;
  duration: number;
  volumeLevel: number;
  isMuted: boolean;
  playerState: string;
}

interface RemotePlayerController {
  addEventListener: (type: string, handler: (event: any) => void) => void;
  removeEventListener: (type: string, handler: (event: any) => void) => void;
  playOrPause: () => void;
  stop: () => void;
  seek: () => void;
  setVolumeLevel: () => void;
  muteOrUnmute: () => void;
}

interface MediaInfo {
  streamType: string;
  metadata: GenericMediaMetadata;
}

interface GenericMediaMetadata {
  title: string;
  subtitle?: string;
  images?: { url: string }[];
}

interface LoadRequest {
  currentTime?: number;
  autoplay?: boolean;
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
}

export interface UseCastOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
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

const CAST_RECEIVER_APP_ID = 'CC1AD845'; // Default Media Receiver

export function useCast(options: UseCastOptions = {}) {
  const [state, setState] = useState<CastState>({
    isAvailable: false,
    isConnected: false,
    isCasting: false,
    deviceName: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playerState: 'IDLE',
  });

  const castContextRef = useRef<CastContext | null>(null);
  const remotePlayerRef = useRef<RemotePlayer | null>(null);
  const remotePlayerControllerRef = useRef<RemotePlayerController | null>(null);
  const sdkLoadedRef = useRef(false);

  // Load Cast SDK
  useEffect(() => {
    if (sdkLoadedRef.current) return;
    
    // Check if SDK is already loaded
    if (window.cast?.framework) {
      initializeCast();
      return;
    }

    // Define callback before loading script
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        initializeCast();
      }
    };

    // Load Cast SDK
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.head.appendChild(script);

    sdkLoadedRef.current = true;

    return () => {
      // Cleanup is handled by the SDK
    };
  }, []);

  const initializeCast = useCallback(() => {
    if (!window.cast?.framework) return;

    const context = window.cast.framework.CastContext.getInstance();
    castContextRef.current = context;

    context.setOptions({
      receiverApplicationId: CAST_RECEIVER_APP_ID,
      autoJoinPolicy: 'ORIGIN_SCOPED',
    });

    // Create remote player and controller
    const player = new window.cast.framework.RemotePlayer();
    const controller = new window.cast.framework.RemotePlayerController(player);
    remotePlayerRef.current = player;
    remotePlayerControllerRef.current = controller;

    // Listen for cast state changes
    context.addEventListener(
      window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      handleCastStateChanged
    );

    // Listen for session state changes
    context.addEventListener(
      window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      handleSessionStateChanged
    );

    // Listen for remote player events
    const eventTypes = window.cast.framework.RemotePlayerEventType;
    controller.addEventListener(eventTypes.IS_CONNECTED_CHANGED, handlePlayerEvent);
    controller.addEventListener(eventTypes.IS_MEDIA_LOADED_CHANGED, handlePlayerEvent);
    controller.addEventListener(eventTypes.CURRENT_TIME_CHANGED, handlePlayerEvent);
    controller.addEventListener(eventTypes.DURATION_CHANGED, handlePlayerEvent);
    controller.addEventListener(eventTypes.VOLUME_LEVEL_CHANGED, handlePlayerEvent);
    controller.addEventListener(eventTypes.IS_MUTED_CHANGED, handlePlayerEvent);
    controller.addEventListener(eventTypes.PLAYER_STATE_CHANGED, handlePlayerEvent);

    // Check initial state
    const castState = context.getCastState();
    setState(prev => ({
      ...prev,
      isAvailable: castState !== window.cast!.framework.CastState.NO_DEVICES_AVAILABLE,
    }));
  }, []);

  const handleCastStateChanged = useCallback((event: any) => {
    if (!window.cast?.framework) return;
    
    const castState = event.castState;
    setState(prev => ({
      ...prev,
      isAvailable: castState !== window.cast!.framework.CastState.NO_DEVICES_AVAILABLE,
      isConnected: castState === window.cast!.framework.CastState.CONNECTED,
    }));
  }, []);

  const handleSessionStateChanged = useCallback((event: any) => {
    if (!window.cast?.framework) return;
    
    const sessionState = event.sessionState;
    const { SessionState } = window.cast.framework;

    if (sessionState === SessionState.SESSION_STARTED || sessionState === SessionState.SESSION_RESUMED) {
      setState(prev => ({ ...prev, isConnected: true }));
      options.onConnect?.();
    } else if (sessionState === SessionState.SESSION_ENDED) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isCasting: false,
        deviceName: null,
      }));
      options.onDisconnect?.();
    }
  }, [options]);

  const handlePlayerEvent = useCallback(() => {
    const player = remotePlayerRef.current;
    if (!player) return;

    setState(prev => ({
      ...prev,
      isConnected: player.isConnected,
      isCasting: player.isMediaLoaded,
      currentTime: player.currentTime,
      duration: player.duration,
      volume: player.volumeLevel,
      isMuted: player.isMuted,
      playerState: player.playerState as CastState['playerState'],
    }));
  }, []);

  // Request cast session (show device picker)
  const requestSession = useCallback(async () => {
    if (!castContextRef.current) {
      options.onError?.('Cast not available');
      return false;
    }

    try {
      await castContextRef.current.requestSession();
      return true;
    } catch (error: any) {
      if (error.code !== 'cancel') {
        options.onError?.(error.message || 'Failed to connect to cast device');
      }
      return false;
    }
  }, [options]);

  // Load media to cast device
  const loadMedia = useCallback(async (media: CastMedia) => {
    if (!castContextRef.current || !window.chrome?.cast) {
      options.onError?.('Cast not available');
      return false;
    }

    const session = castContextRef.current.getCurrentSession();
    if (!session) {
      options.onError?.('No active cast session');
      return false;
    }

    try {
      const mediaInfo = new window.chrome.cast.media.MediaInfo(
        media.url,
        media.contentType || 'application/x-mpegURL'
      );

      mediaInfo.streamType = media.isLive
        ? window.chrome.cast.media.StreamType.LIVE
        : window.chrome.cast.media.StreamType.BUFFERED;

      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = media.title;
      if (media.subtitle) {
        mediaInfo.metadata.subtitle = media.subtitle;
      }
      if (media.posterUrl) {
        mediaInfo.metadata.images = [{ url: media.posterUrl }];
      }

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      if (media.startTime && media.startTime > 0) {
        request.currentTime = media.startTime;
      }

      await session.loadMedia(request);
      setState(prev => ({ ...prev, isCasting: true }));
      return true;
    } catch (error: any) {
      options.onError?.(error.message || 'Failed to load media');
      return false;
    }
  }, [options]);

  // Control methods
  const playOrPause = useCallback(() => {
    remotePlayerControllerRef.current?.playOrPause();
  }, []);

  const stop = useCallback(() => {
    remotePlayerControllerRef.current?.stop();
    setState(prev => ({ ...prev, isCasting: false }));
  }, []);

  const seek = useCallback((time: number) => {
    const player = remotePlayerRef.current;
    if (player) {
      player.currentTime = time;
      remotePlayerControllerRef.current?.seek();
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const player = remotePlayerRef.current;
    if (player) {
      player.volumeLevel = Math.max(0, Math.min(1, volume));
      remotePlayerControllerRef.current?.setVolumeLevel();
    }
  }, []);

  const toggleMute = useCallback(() => {
    remotePlayerControllerRef.current?.muteOrUnmute();
  }, []);

  const disconnect = useCallback(() => {
    castContextRef.current?.endCurrentSession(true);
  }, []);

  return {
    ...state,
    requestSession,
    loadMedia,
    playOrPause,
    stop,
    seek,
    setVolume,
    toggleMute,
    disconnect,
  };
}
