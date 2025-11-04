/**
 * Video Player Hook
 * Custom hook for managing video player state and HLS.js integration
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import type { PlayerState, QualityLevel } from '@/app/types/player';

interface UseVideoPlayerOptions {
  src: string;
  autoPlay?: boolean;
  startTime?: number;
  onProgress?: (time: number, duration: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useVideoPlayer(options: UseVideoPlayerOptions) {
  const { src, autoPlay = false, startTime = 0, onProgress, onComplete, onError } = options;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    fullscreen: false,
    pictureInPicture: false,
    quality: 'auto',
    playbackRate: 1,
    subtitleTrack: null,
    buffered: 0,
    seeking: false,
    loading: true,
    error: null,
  });
  
  const [qualities, setQualities] = useState<QualityLevel[]>([]);

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Check if HLS is supported
    if (src.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setState(prev => ({ ...prev, loading: false }));
          
          // Extract quality levels
          const levels = data.levels.map((level) => ({
            height: level.height,
            bitrate: level.bitrate,
            label: `${level.height}p`,
          }));
          setQualities(levels);

          if (autoPlay) {
            video.play().catch(err => {
              console.error('Autoplay failed:', err);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error, cannot recover');
                setState(prev => ({ ...prev, error: 'Failed to load video' }));
                onError?.(new Error(data.details));
                break;
            }
          }
        });

        hlsRef.current = hls;

        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
        setState(prev => ({ ...prev, loading: false }));
      }
    } else {
      // Regular video file
      video.src = src;
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [src, autoPlay, onError]);

  // Set start time
  useEffect(() => {
    const video = videoRef.current;
    if (video && startTime > 0 && video.duration) {
      video.currentTime = startTime;
    }
  }, [startTime, state.duration]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: video.currentTime }));
      onProgress?.(video.currentTime, video.duration);
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: video.duration }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, playing: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, playing: false }));
    };

    const handleVolumeChange = () => {
      setState(prev => ({ 
        ...prev, 
        volume: video.volume,
        muted: video.muted 
      }));
    };

    const handleSeeking = () => {
      setState(prev => ({ ...prev, seeking: true }));
    };

    const handleSeeked = () => {
      setState(prev => ({ ...prev, seeking: false }));
    };

    const handleWaiting = () => {
      setState(prev => ({ ...prev, loading: true }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, loading: false }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, playing: false }));
      onComplete?.();
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        setState(prev => ({ ...prev, buffered: bufferedPercent }));
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('progress', handleProgress);
    };
  }, [onProgress, onComplete]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ 
        ...prev, 
        fullscreen: !!document.fullscreenElement 
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Picture-in-picture change listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePipChange = () => {
      setState(prev => ({ 
        ...prev, 
        pictureInPicture: document.pictureInPictureElement === video 
      }));
    };

    video.addEventListener('enterpictureinpicture', handlePipChange);
    video.addEventListener('leavepictureinpicture', handlePipChange);

    return () => {
      video.removeEventListener('enterpictureinpicture', handlePipChange);
      video.removeEventListener('leavepictureinpicture', handlePipChange);
    };
  }, []);

  // Player controls
  const play = useCallback(() => {
    videoRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.playing) {
      pause();
    } else {
      play();
    }
  }, [state.playing, play, pause]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await videoRef.current?.parentElement?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  }, []);

  const setQuality = useCallback((quality: string) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (quality === 'auto') {
      hls.currentLevel = -1; // Auto quality
    } else {
      const levelIndex = qualities.findIndex(q => q.label === quality);
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex;
      }
    }

    setState(prev => ({ ...prev, quality }));
  }, [qualities]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setState(prev => ({ ...prev, playbackRate: rate }));
    }
  }, []);

  const setSubtitleTrack = useCallback((trackIndex: number | null) => {
    setState(prev => ({ ...prev, subtitleTrack: trackIndex }));
  }, []);

  return {
    videoRef,
    state,
    qualities,
    play,
    pause,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePictureInPicture,
    setQuality,
    setPlaybackRate,
    setSubtitleTrack,
  };
}
