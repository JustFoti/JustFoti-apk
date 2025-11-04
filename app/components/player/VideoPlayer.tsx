'use client';

/**
 * Advanced Video Player Component
 * Full-featured video player with HLS.js, custom controls, gestures, and keyboard shortcuts
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useVideoPlayer } from '@/app/lib/hooks/useVideoPlayer';
import { useWatchProgress } from '@/app/lib/hooks/useWatchProgress';
import { Controls } from './Controls';
import { SubtitleRenderer } from './SubtitleRenderer';
import type { VideoPlayerProps, GestureState } from '@/app/types/player';
import styles from './VideoPlayer.module.css';

export function VideoPlayer({
  src,
  poster,
  subtitles = [],
  autoPlay = false,
  startTime = 0,
  onProgress,
  onComplete,
  onError,
  contentId,
  contentType,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [gestureState, setGestureState] = useState<GestureState | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);

  // Watch progress tracking
  const { loadProgress, handleProgress: handleWatchProgress } = useWatchProgress({
    contentId,
    contentType,
    onProgress,
  });

  // Load saved progress
  const savedProgress = contentId ? loadProgress() : startTime;

  // Video player hook
  const {
    videoRef,
    state,
    qualities,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePictureInPicture,
    setQuality,
    setPlaybackRate,
    setSubtitleTrack,
  } = useVideoPlayer({
    src,
    autoPlay,
    startTime: savedProgress,
    onProgress: handleWatchProgress,
    onComplete,
    onError,
  });

  // Show/hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    if (state.playing) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [state.playing]);

  // Mouse movement handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => {
      showControls();
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [showControls]);

  // Keep controls visible when paused
  useEffect(() => {
    if (!state.playing) {
      setControlsVisible(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    } else {
      showControls();
    }
  }, [state.playing, showControls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'arrowleft':
          e.preventDefault();
          seek(Math.max(0, state.currentTime - 5));
          break;
        case 'arrowright':
          e.preventDefault();
          seek(Math.min(state.duration, state.currentTime + 5));
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(Math.min(1, state.volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(Math.max(0, state.volume - 0.1));
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'p':
          e.preventDefault();
          togglePictureInPicture();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) / 10;
          seek(state.duration * percent);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.currentTime,
    state.duration,
    state.volume,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePictureInPicture,
  ]);

  // Touch gestures for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();

    // Double tap to play/pause
    if (now - lastTapRef.current < 300) {
      togglePlayPause();
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

    setGestureState({
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: state.currentTime,
      seeking: false,
      volumeAdjusting: false,
    });
  }, [state.currentTime, togglePlayPause]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureState) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - gestureState.startX;
    const deltaY = touch.clientY - gestureState.startY;

    // Horizontal swipe for seeking
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      const container = containerRef.current;
      if (!container) return;

      const seekAmount = (deltaX / container.clientWidth) * 60; // Max 60 seconds
      const newTime = Math.max(0, Math.min(state.duration, gestureState.startTime + seekAmount));
      seek(newTime);

      setGestureState({ ...gestureState, seeking: true });
    }

    // Vertical swipe for volume (right side) or brightness (left side)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
      const container = containerRef.current;
      if (!container) return;

      const isRightSide = gestureState.startX > container.clientWidth / 2;

      if (isRightSide) {
        // Volume control
        const volumeChange = -(deltaY / container.clientHeight);
        const newVolume = Math.max(0, Math.min(1, state.volume + volumeChange));
        setVolume(newVolume);
        setGestureState({ ...gestureState, volumeAdjusting: true });
      }
    }
  }, [gestureState, state.duration, state.volume, seek, setVolume]);

  const handleTouchEnd = useCallback(() => {
    setGestureState(null);
  }, []);

  // Click on video to play/pause
  const handleVideoClick = useCallback(() => {
    togglePlayPause();
    showControls();
  }, [togglePlayPause, showControls]);

  const currentSubtitle = state.subtitleTrack !== null ? subtitles[state.subtitleTrack] : null;

  return (
    <div
      ref={containerRef}
      className={`${styles.playerContainer} ${state.fullscreen ? styles.fullscreen : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className={styles.video}
        poster={poster}
        playsInline
        onClick={handleVideoClick}
      />

      {/* Gesture feedback */}
      {gestureState?.seeking && (
        <div className={styles.gestureOverlay}>
          <div className={styles.gestureIndicator}>
            {state.currentTime > gestureState.startTime ? '⏩' : '⏪'}
            <span>{Math.abs(state.currentTime - gestureState.startTime).toFixed(0)}s</span>
          </div>
        </div>
      )}

      {gestureState?.volumeAdjusting && (
        <div className={styles.gestureOverlay}>
          <div className={styles.gestureIndicator}>
            🔊
            <span>{Math.round(state.volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Subtitles */}
      <SubtitleRenderer
        currentTime={state.currentTime}
        track={currentSubtitle}
        visible={!state.loading && !state.error}
      />

      {/* Controls */}
      <Controls
        state={state}
        onPlayPause={togglePlayPause}
        onSeek={seek}
        onVolumeChange={setVolume}
        onMuteToggle={toggleMute}
        onFullscreenToggle={toggleFullscreen}
        onPictureInPictureToggle={togglePictureInPicture}
        onQualityChange={setQuality}
        onPlaybackRateChange={setPlaybackRate}
        onSubtitleChange={setSubtitleTrack}
        qualities={qualities}
        subtitles={subtitles}
        visible={controlsVisible}
      />
    </div>
  );
}
