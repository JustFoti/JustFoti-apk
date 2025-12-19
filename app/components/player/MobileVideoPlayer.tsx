'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMobileGestures } from '@/hooks/useMobileGestures';
import styles from './MobileVideoPlayer.module.css';

interface MobileVideoPlayerProps {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title?: string;
  streamUrl: string;
  onBack?: () => void;
  onError?: (error: string) => void;
  onSourceChange?: (sourceIndex: number) => void;
  availableSources?: Array<{ title: string; url: string; quality?: string }>;
  currentSourceIndex?: number;
  nextEpisode?: { season: number; episode: number; title?: string } | null;
  onNextEpisode?: () => void;
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 25 : 50;
    navigator.vibrate(duration);
  }
};

export default function MobileVideoPlayer({
  tmdbId: _tmdbId,
  mediaType,
  season,
  episode,
  title,
  streamUrl,
  onBack,
  onError,
  onSourceChange,
  availableSources = [],
  currentSourceIndex = 0,
  nextEpisode,
  onNextEpisode,
}: MobileVideoPlayerProps) {
  const mobileInfo = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const seekPreviewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Gesture feedback state
  const [seekPreview, setSeekPreview] = useState<{ show: boolean; time: number; delta: number } | null>(null);
  const [doubleTapIndicator, setDoubleTapIndicator] = useState<{ show: boolean; side: 'left' | 'right'; x: number; y: number } | null>(null);
  const [brightnessLevel, setBrightnessLevel] = useState(1);
  const [volumeLevel, setVolumeLevel] = useState(1);
  const [showBrightnessOverlay, setShowBrightnessOverlay] = useState(false);
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);

  // Refs for gesture calculations
  const seekStartTimeRef = useRef(0);
  const brightnessStartRef = useRef(1);
  const volumeStartRef = useRef(1);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isLocked) {
      setShowControls(true);
      if (isPlaying && !showSourceMenu && !showSpeedMenu) {
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
      }
    }
  }, [isPlaying, showSourceMenu, showSpeedMenu, isLocked]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || isLocked) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
    triggerHaptic('light');
    resetControlsTimeout();
  }, [isLocked, resetControlsTimeout]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || isLocked) return;
    const newTime = Math.max(0, Math.min(time, duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, isLocked]);

  const skip = useCallback((seconds: number) => {
    if (isLocked) return;
    seekTo(currentTime + seconds);
    triggerHaptic('light');
  }, [currentTime, seekTo, isLocked]);

  const handleTap = useCallback(() => {
    if (isLocked) {
      setShowControls(true);
      setTimeout(() => setShowControls(false), 2000);
      return;
    }
    if (showControls) {
      setShowControls(false);
    } else {
      resetControlsTimeout();
    }
  }, [isLocked, showControls, resetControlsTimeout]);

  const handleDoubleTap = useCallback((x: number, y: number, side: 'left' | 'center' | 'right') => {
    if (isLocked) return;
    if (side === 'center') {
      togglePlay();
      return;
    }
    const seekAmount = side === 'left' ? -10 : 10;
    skip(seekAmount);
    setDoubleTapIndicator({ show: true, side, x, y });
    setTimeout(() => setDoubleTapIndicator(null), 600);
    triggerHaptic('medium');
  }, [isLocked, togglePlay, skip]);

  const handleLongPress = useCallback(() => {
    if (isLocked) return;
    setLongPressActive(true);
    if (videoRef.current) videoRef.current.playbackRate = 2;
    triggerHaptic('heavy');
  }, [isLocked]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressActive) {
      setLongPressActive(false);
      if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
    }
  }, [longPressActive, playbackSpeed]);

  const handleHorizontalDrag = useCallback((_deltaX: number, progress: number) => {
    if (isLocked) return;
    const seekDelta = progress * duration * 0.5;
    const previewTime = Math.max(0, Math.min(duration, seekStartTimeRef.current + seekDelta));
    setSeekPreview({ show: true, time: previewTime, delta: seekDelta });
  }, [isLocked, duration]);

  const handleHorizontalDragEnd = useCallback(() => {
    if (isLocked || !seekPreview) return;
    seekTo(seekPreview.time);
    if (seekPreviewTimeoutRef.current) clearTimeout(seekPreviewTimeoutRef.current);
    seekPreviewTimeoutRef.current = setTimeout(() => setSeekPreview(null), 300);
    triggerHaptic('light');
  }, [isLocked, seekPreview, seekTo]);

  const handleVerticalDragLeft = useCallback((_deltaY: number, progress: number) => {
    if (isLocked) return;
    const newBrightness = Math.max(0.2, Math.min(1.5, brightnessStartRef.current - progress));
    setBrightnessLevel(newBrightness);
    setShowBrightnessOverlay(true);
  }, [isLocked]);

  const handleVerticalDragLeftEnd = useCallback(() => {
    brightnessStartRef.current = brightnessLevel;
    setTimeout(() => setShowBrightnessOverlay(false), 500);
  }, [brightnessLevel]);

  const handleVerticalDragRight = useCallback((_deltaY: number, progress: number) => {
    if (isLocked) return;
    const newVolume = Math.max(0, Math.min(1, volumeStartRef.current - progress));
    setVolumeLevel(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
    setShowVolumeOverlay(true);
  }, [isLocked]);

  const handleVerticalDragRightEnd = useCallback(() => {
    volumeStartRef.current = volumeLevel;
    setTimeout(() => setShowVolumeOverlay(false), 500);
  }, [volumeLevel]);

  const handleGestureStart = useCallback((type: string) => {
    if (type === 'horizontal-drag') seekStartTimeRef.current = currentTime;
    else if (type === 'vertical-drag-left') brightnessStartRef.current = brightnessLevel;
    else if (type === 'vertical-drag-right') volumeStartRef.current = volumeLevel;
  }, [currentTime, brightnessLevel, volumeLevel]);

  const handleGestureEnd = useCallback((type: string) => {
    if (type === 'long-press') handleLongPressEnd();
  }, [handleLongPressEnd]);

  const { isGestureActive } = useMobileGestures(containerRef as React.RefObject<HTMLElement>, {
    onTap: handleTap,
    onDoubleTap: handleDoubleTap,
    onLongPress: handleLongPress,
    onHorizontalDrag: handleHorizontalDrag,
    onHorizontalDragEnd: handleHorizontalDragEnd,
    onVerticalDragLeft: handleVerticalDragLeft,
    onVerticalDragLeftEnd: handleVerticalDragLeftEnd,
    onVerticalDragRight: handleVerticalDragRight,
    onVerticalDragRightEnd: handleVerticalDragRightEnd,
    onGestureStart: handleGestureStart,
    onGestureEnd: handleGestureEnd,
    enabled: !showSourceMenu && !showSpeedMenu,
    preventScroll: true,
    doubleTapMaxDelay: 300,
    longPressDelay: 500,
    dragThreshold: 15,
  });


  const hlsConfig = useMemo(() => ({
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 30,
    maxBufferLength: 20,
    maxMaxBufferLength: 40,
    maxBufferSize: 30 * 1000 * 1000,
    maxBufferHole: 0.5,
    manifestLoadingTimeOut: 15000,
    manifestLoadingMaxRetry: 4,
    levelLoadingTimeOut: 15000,
    fragLoadingTimeOut: 25000,
    fragLoadingMaxRetry: 6,
    startLevel: -1,
    abrEwmaDefaultEstimate: 500000,
    abrBandWidthFactor: 0.8,
    abrBandWidthUpFactor: 0.5,
  }), []);

  // Initialize HLS
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;
    setIsLoading(true);
    setError(null);

    const attemptAutoplay = () => {
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    if (mobileInfo.isIOS && mobileInfo.supportsHLS) {
      video.src = streamUrl;
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsLoading(false);
        attemptAutoplay();
      };
      const handleCanPlay = () => {
        setIsLoading(false);
        if (video.paused) attemptAutoplay();
      };
      const handleError = () => {
        const err = video.error;
        setError(`Playback error: ${err?.message || 'Unknown error'}`);
        setIsLoading(false);
        onError?.(err?.message || 'Playback failed');
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        attemptAutoplay();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            setError('Playback failed. Try another source.');
            setIsLoading(false);
            onError?.('Fatal playback error');
          }
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    video.src = streamUrl;
    video.addEventListener('loadedmetadata', () => {
      setIsLoading(false);
      attemptAutoplay();
    });
  }, [streamUrl, mobileInfo.isIOS, mobileInfo.supportsHLS, hlsConfig, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => { setIsPlaying(true); resetControlsTimeout(); };
    const handlePause = () => { setIsPlaying(false); setShowControls(true); };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => { setIsBuffering(false); setIsLoading(false); };
    const handleTimeUpdate = () => {
      if (!isGestureActive) setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => { setIsPlaying(false); setShowControls(true); };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isGestureActive, resetControlsTimeout]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (videoRef.current as any)?.webkitDisplayingFullscreen
      );
      setIsFullscreen(isNowFullscreen);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    const video = videoRef.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
      video.addEventListener('webkitendfullscreen', handleFullscreenChange);
    }
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
        video.removeEventListener('webkitendfullscreen', handleFullscreenChange);
      }
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
    try {
      if (!isFullscreen) {
        if ((video as any).webkitEnterFullscreen) (video as any).webkitEnterFullscreen();
        else if ((container as any).webkitRequestFullscreen) await (container as any).webkitRequestFullscreen();
        else if (container.requestFullscreen) await container.requestFullscreen();
        if (screen.orientation && 'lock' in screen.orientation) {
          try { await (screen.orientation as any).lock('landscape'); } catch {}
        }
      } else {
        if ((video as any).webkitExitFullscreen) (video as any).webkitExitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        else if (document.exitFullscreen) await document.exitFullscreen();
        if (screen.orientation && 'unlock' in screen.orientation) {
          try { (screen.orientation as any).unlock(); } catch {}
        }
      }
    } catch (e) { console.error('[MobilePlayer] Fullscreen error:', e); }
    triggerHaptic('light');
  }, [isFullscreen]);

  const toggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    triggerHaptic('medium');
    if (!isLocked) setShowControls(false);
  }, [isLocked]);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
    triggerHaptic('light');
  }, []);

  const handleProgressTouch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    seekTo(pos * duration);
    triggerHaptic('light');
  }, [duration, seekTo, isLocked]);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];


  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}
      style={{ filter: `brightness(${brightnessLevel})` }}
    >
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        autoPlay={false}
        controls={false}
        preload="metadata"
        webkit-playsinline="true"
        x-webkit-airplay="allow"
      />

      {(isLoading || isBuffering) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>{isLoading ? 'Loading...' : 'Buffering...'}</p>
        </div>
      )}

      {error && (
        <div className={styles.errorOverlay}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={() => { setError(null); setIsLoading(true); videoRef.current?.load(); }}>
            Retry
          </button>
        </div>
      )}

      {doubleTapIndicator?.show && (
        <div className={`${styles.doubleTapIndicator} ${styles[doubleTapIndicator.side]}`} style={{ left: doubleTapIndicator.x, top: doubleTapIndicator.y }}>
          <div className={styles.doubleTapRipple} />
          <span className={styles.doubleTapIcon}>{doubleTapIndicator.side === 'left' ? '⏪' : '⏩'}</span>
          <span>10s</span>
        </div>
      )}

      {seekPreview?.show && (
        <div className={styles.seekPreview}>
          <span className={styles.seekPreviewTime}>{formatTime(seekPreview.time)}</span>
          <span className={styles.seekPreviewDelta}>{seekPreview.delta >= 0 ? '+' : ''}{formatTime(Math.abs(seekPreview.delta))}</span>
          <div className={styles.seekPreviewBar}>
            <div className={styles.seekPreviewProgress} style={{ width: `${(seekPreview.time / duration) * 100}%` }} />
          </div>
        </div>
      )}

      {showBrightnessOverlay && (
        <div className={styles.gestureOverlay}>
          <span className={styles.gestureIcon}>☀️</span>
          <div className={styles.gestureBar}>
            <div className={styles.gestureFill} style={{ height: `${(brightnessLevel / 1.5) * 100}%` }} />
          </div>
          <span>{Math.round((brightnessLevel / 1.5) * 100)}%</span>
        </div>
      )}

      {showVolumeOverlay && (
        <div className={styles.gestureOverlay}>
          <span className={styles.gestureIcon}>{volumeLevel === 0 ? '🔇' : volumeLevel < 0.5 ? '🔉' : '🔊'}</span>
          <div className={styles.gestureBar}>
            <div className={styles.gestureFill} style={{ height: `${volumeLevel * 100}%` }} />
          </div>
          <span>{Math.round(volumeLevel * 100)}%</span>
        </div>
      )}

      {longPressActive && (
        <div className={styles.speedIndicator}>
          <span>⏩ 2x Speed</span>
        </div>
      )}

      {isLocked && showControls && (
        <div className={styles.lockIndicator} onClick={(e) => { e.stopPropagation(); toggleLock(); }}>
          <span>🔒 Tap to unlock</span>
        </div>
      )}

      <div className={`${styles.controls} ${showControls && !isLocked ? styles.visible : ''}`}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <button className={styles.iconButton} onClick={(e) => { e.stopPropagation(); onBack?.(); }} onTouchEnd={(e) => e.stopPropagation()}>
            ←
          </button>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>{title}</h2>
            {mediaType === 'tv' && season && episode && (
              <span className={styles.episodeInfo}>S{season} E{episode}</span>
            )}
          </div>
          <div className={styles.topButtons}>
            <button className={styles.iconButton} onClick={(e) => { e.stopPropagation(); toggleLock(); }} onTouchEnd={(e) => e.stopPropagation()}>
              🔒
            </button>
            <button className={styles.iconButton} onClick={(e) => { e.stopPropagation(); setShowSourceMenu(true); }} onTouchEnd={(e) => e.stopPropagation()}>
              📡
            </button>
          </div>
        </div>

        {/* Center Controls */}
        <div className={styles.centerControls}>
          <button className={styles.skipButton} onClick={(e) => { e.stopPropagation(); skip(-10); }} onTouchEnd={(e) => e.stopPropagation()}>
            <span className={styles.skipIcon}>⏪</span>
            <span className={styles.skipText}>10</span>
          </button>
          <button className={styles.playButton} onClick={(e) => { e.stopPropagation(); togglePlay(); }} onTouchEnd={(e) => e.stopPropagation()}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button className={styles.skipButton} onClick={(e) => { e.stopPropagation(); skip(10); }} onTouchEnd={(e) => e.stopPropagation()}>
            <span className={styles.skipIcon}>⏩</span>
            <span className={styles.skipText}>10</span>
          </button>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.progressContainer} onTouchStart={handleProgressTouch} onTouchMove={handleProgressTouch}>
            <div className={styles.progressTrack}>
              <div className={styles.progressBuffered} style={{ width: `${buffered}%` }} />
              <div className={styles.progressFilled} style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
            </div>
            <div className={styles.progressThumb} style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
          <div className={styles.bottomControls}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <div className={styles.bottomButtons}>
              <button className={styles.speedButton} onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(true); }} onTouchEnd={(e) => e.stopPropagation()}>
                {playbackSpeed}x
              </button>
              {nextEpisode && (
                <button className={styles.iconButton} onClick={(e) => { e.stopPropagation(); onNextEpisode?.(); }} onTouchEnd={(e) => e.stopPropagation()}>
                  ⏭️
                </button>
              )}
              <button className={styles.iconButton} onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} onTouchEnd={(e) => e.stopPropagation()}>
                {isFullscreen ? '⛶' : '⛶'}
              </button>
            </div>
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>
        </div>
      </div>


      {/* Source Menu */}
      {showSourceMenu && (
        <div className={styles.menuOverlay} onClick={() => setShowSourceMenu(false)}>
          <div className={styles.menuContent} onClick={e => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <h3>Select Source</h3>
              <button className={styles.menuClose} onClick={() => setShowSourceMenu(false)}>✕</button>
            </div>
            <div className={styles.menuList}>
              {availableSources.map((source, index) => (
                <button
                  key={index}
                  className={`${styles.menuItem} ${index === currentSourceIndex ? styles.active : ''}`}
                  onClick={() => { onSourceChange?.(index); setShowSourceMenu(false); triggerHaptic('light'); }}
                >
                  <span>{source.title || `Source ${index + 1}`}</span>
                  {source.quality && <span className={styles.quality}>{source.quality}</span>}
                  {index === currentSourceIndex && <span className={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Speed Menu */}
      {showSpeedMenu && (
        <div className={styles.menuOverlay} onClick={() => setShowSpeedMenu(false)}>
          <div className={styles.menuContent} onClick={e => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <h3>Playback Speed</h3>
              <button className={styles.menuClose} onClick={() => setShowSpeedMenu(false)}>✕</button>
            </div>
            <div className={styles.menuList}>
              {speedOptions.map(speed => (
                <button
                  key={speed}
                  className={`${styles.menuItem} ${speed === playbackSpeed ? styles.active : ''}`}
                  onClick={() => changeSpeed(speed)}
                >
                  <span>{speed}x</span>
                  {speed === 1 && <span className={styles.normalLabel}>Normal</span>}
                  {speed === playbackSpeed && <span className={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unlock Button */}
      {isLocked && (
        <button className={styles.unlockButton} onClick={(e) => { e.stopPropagation(); toggleLock(); }} onTouchEnd={(e) => e.stopPropagation()}>
          🔓
        </button>
      )}
    </div>
  );
}
